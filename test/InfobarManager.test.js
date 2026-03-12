const { describe, it, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const InfobarManager = require("../src/streamdeck/InfobarManager");
const { hslToHex } = require("../src/streamdeck/InfobarManager");

/** Minimal bridge mock that records broadcasts. */
function mockBridge() {
  const broadcasts = [];
  return {
    broadcasts,
    broadcast(type, data) {
      broadcasts.push({ type, ...data });
    },
    last(type) {
      return [...broadcasts].reverse().find((b) => b.type === type);
    },
    allOfType(type) {
      return broadcasts.filter((b) => b.type === type);
    },
  };
}

describe("InfobarManager", () => {
  let bridge;
  let mgr;

  beforeEach(() => {
    bridge = mockBridge();
    mgr = new InfobarManager(bridge, { maxTokens: 200000, gaugeWidth: 10 });
  });

  afterEach(() => {
    mgr.destroy();
  });

  describe("context gauge", () => {
    it("starts at 0%", () => {
      const state = mgr.getState();
      assert.equal(state.percent, 0);
      assert.equal(state.tokensUsed, 0);
      assert.equal(state.maxTokens, 200000);
    });

    it("updates context and broadcasts", () => {
      mgr.updateContext(100000);
      const state = mgr.getState();
      assert.equal(state.percent, 50);
      assert.equal(state.tokensUsed, 100000);

      const msg = bridge.last("infobar:update");
      assert.ok(msg);
      assert.equal(msg.percent, 50);
      assert.equal(msg.formatted, "100k");
      assert.equal(msg.maxFormatted, "200k");
    });

    it("renders gauge bar correctly", () => {
      mgr.updateContext(100000); // 50%
      const state = mgr.getState();
      assert.ok(state.display.includes("50%"));
    });

    it("clamps at 100%", () => {
      mgr.updateContext(250000);
      assert.equal(mgr.getState().percent, 100);
    });

    it("accepts maxTokens override", () => {
      mgr.updateContext(50000, 100000);
      assert.equal(mgr.getState().percent, 50);
      assert.equal(mgr.getState().maxTokens, 100000);
    });

    it("formats tokens as k and M", () => {
      mgr.updateContext(500);
      assert.ok(mgr.getState().display.includes("500"));

      mgr.updateContext(1500);
      assert.ok(mgr.getState().display.includes("2k"));

      mgr.updateContext(1500000, 2000000);
      const msg = bridge.last("infobar:update");
      assert.equal(msg.formatted, "1.5M");
      assert.equal(msg.maxFormatted, "2.0M");
    });

    it("emits context:updated event", () => {
      let emitted = null;
      mgr.on("context:updated", (e) => (emitted = e));
      mgr.updateContext(80000);
      assert.ok(emitted);
      assert.equal(emitted.percent, 40);
    });
  });

  describe("threshold colors", () => {
    it("returns green below 50%", () => {
      mgr.updateContext(40000);
      assert.equal(mgr.getState().color, "#00cc66");
    });

    it("returns yellow at 50-74%", () => {
      mgr.updateContext(120000);
      assert.equal(mgr.getState().color, "#ffcc00");
    });

    it("returns orange at 75-89%", () => {
      mgr.updateContext(160000);
      assert.equal(mgr.getState().color, "#ff6600");
    });

    it("returns red at 90%+", () => {
      mgr.updateContext(190000);
      assert.equal(mgr.getState().color, "#cc0000");
    });
  });

  describe("touch point LEDs", () => {
    it("sets style by name", () => {
      mgr.setTouchPointStyle("active");
      const msg = bridge.last("touchpoint:led");
      assert.ok(msg);
      assert.equal(msg.left.color, "#00cc66");
      assert.equal(msg.styleName, "active");
    });

    it("sets custom style object", () => {
      mgr.setTouchPointStyle({
        left: { color: "#ff00ff", brightness: 80 },
        right: { color: "#00ffff", brightness: 80 },
      });
      const msg = bridge.last("touchpoint:led");
      assert.equal(msg.left.color, "#ff00ff");
      assert.equal(msg.right.color, "#00ffff");
    });

    it("applies LED overrides on top of style", () => {
      mgr.setLedOverrides({
        left: { color: "#ff0000" },
      });
      mgr.setTouchPointStyle("active");
      const msg = bridge.last("touchpoint:led");
      assert.equal(msg.left.color, "#ff0000");
      assert.equal(msg.right.color, "#00cc66");
    });

    it("clears LED overrides", () => {
      mgr.setTouchPointStyle("active");
      mgr.setLedOverrides({ left: { color: "#ff0000" } });
      let msg = bridge.last("touchpoint:led");
      assert.equal(msg.left.color, "#ff0000");
      mgr.clearLedOverrides();
      msg = bridge.last("touchpoint:led");
      assert.equal(msg.left.color, "#00cc66");
    });

    it("emits touchpoint:changed event", () => {
      let emitted = null;
      mgr.on("touchpoint:changed", (e) => (emitted = e));
      mgr.setTouchPointStyle("waiting");
      assert.ok(emitted);
      assert.equal(emitted.style, "waiting");
    });
  });

  describe("animation patterns", () => {
    it("starts and stops blink animation", async () => {
      mgr.startAnimation("blink", { color: "#ff0000", intervalMs: 50 });
      assert.equal(mgr.isAnimating, true);
      await new Promise((r) => setTimeout(r, 120));
      const blinkMsgs = bridge.allOfType("touchpoint:led").filter((b) => b.animation);
      assert.ok(blinkMsgs.length >= 2);
      mgr.stopAnimation();
      assert.equal(mgr.isAnimating, false);
    });

    it("starts breathe animation", async () => {
      mgr.startAnimation("breathe", { color: "#4488ff", intervalMs: 20, steps: 5 });
      assert.equal(mgr.isAnimating, true);
      await new Promise((r) => setTimeout(r, 150));
      const msgs = bridge.allOfType("touchpoint:led").filter((b) => b.animation);
      assert.ok(msgs.length >= 3);
      // Brightness should vary
      const brightnesses = msgs.map((m) => m.left.brightness);
      const unique = new Set(brightnesses);
      assert.ok(unique.size >= 2, "breathe should produce varying brightness");
      mgr.stopAnimation();
    });

    it("starts pulse animation", async () => {
      mgr.startAnimation("pulse", { color: "#cc0000", intervalMs: 20, steps: 5 });
      assert.equal(mgr.isAnimating, true);
      await new Promise((r) => setTimeout(r, 150));
      mgr.stopAnimation();
    });

    it("starts rainbow animation", async () => {
      mgr.startAnimation("rainbow", { intervalMs: 20, steps: 10 });
      assert.equal(mgr.isAnimating, true);
      await new Promise((r) => setTimeout(r, 100));
      const msgs = bridge.allOfType("touchpoint:led").filter((b) => b.animation);
      // Colors should differ between frames
      const colors = msgs.map((m) => m.left.color);
      const unique = new Set(colors);
      assert.ok(unique.size >= 2, "rainbow should produce different colors");
      mgr.stopAnimation();
    });

    it("starts chase animation", async () => {
      mgr.startAnimation("chase", { colors: ["#ff0000", "#0000ff"], intervalMs: 30 });
      await new Promise((r) => setTimeout(r, 150));
      const msgs = bridge.allOfType("touchpoint:led").filter((b) => b.animation);
      // Left and right should differ in some frames
      const asymmetric = msgs.some((m) => m.left.brightness !== m.right.brightness);
      assert.ok(asymmetric, "chase should have asymmetric left/right");
      mgr.stopAnimation();
    });

    it("starts flash animation", async () => {
      mgr.startAnimation("flash", { color: "#ffffff", intervalMs: 30 });
      await new Promise((r) => setTimeout(r, 100));
      mgr.stopAnimation();
    });

    it("emits animation:started event", () => {
      let emitted = null;
      mgr.on("animation:started", (e) => (emitted = e));
      mgr.startAnimation("pulse", { color: "#cc0000" });
      assert.ok(emitted);
      assert.equal(emitted.pattern, "pulse");
      mgr.stopAnimation();
    });

    it("stopAnimation clears previous animation before starting new one", () => {
      mgr.startAnimation("blink", { intervalMs: 50 });
      mgr.startAnimation("breathe", { intervalMs: 50 });
      // Should not crash, old timer should be cleared
      assert.equal(mgr.isAnimating, true);
      mgr.stopAnimation();
    });

    it("backward-compat startTouchPointBlink works", async () => {
      mgr.startTouchPointBlink("attention", 50);
      assert.equal(mgr.isAnimating, true);
      await new Promise((r) => setTimeout(r, 120));
      mgr.stopTouchPointBlink();
      assert.equal(mgr.isAnimating, false);
    });
  });

  describe("per-session LED colors", () => {
    it("assigns unique colors to sessions", () => {
      const c1 = mgr.getSessionColor("session-1");
      const c2 = mgr.getSessionColor("session-2");
      assert.ok(c1);
      assert.ok(c2);
      assert.notEqual(c1, c2);
    });

    it("returns same color for same session", () => {
      const c1 = mgr.getSessionColor("abc");
      const c2 = mgr.getSessionColor("abc");
      assert.equal(c1, c2);
    });

    it("allows manual color override", () => {
      mgr.setSessionColor("abc", "#deadbe");
      assert.equal(mgr.getSessionColor("abc"), "#deadbe");
    });

    it("removes session color", () => {
      mgr.getSessionColor("abc");
      mgr.removeSessionColor("abc");
      // Next call assigns a new color (may or may not match)
      const c = mgr.getSessionColor("abc");
      assert.ok(c);
    });

    it("uses custom palette", () => {
      const mgr2 = new InfobarManager(bridge, {
        sessionColorPalette: ["#aaa", "#bbb"],
      });
      assert.equal(mgr2.getSessionColor("s1"), "#aaa");
      assert.equal(mgr2.getSessionColor("s2"), "#bbb");
      assert.equal(mgr2.getSessionColor("s3"), "#aaa"); // wraps around
      mgr2.destroy();
    });

    it("showSessionAlert starts blinking with session color", () => {
      mgr.showSessionAlert("test-session", "permission");
      assert.equal(mgr.isAnimating, true);
      const sessionColor = mgr.getSessionColor("test-session");
      // The animation should have been started
      const startEvent = bridge.allOfType("touchpoint:led");
      assert.ok(startEvent.length > 0);
      mgr.stopAnimation();
    });

    it("session colors appear in state", () => {
      mgr.getSessionColor("s1");
      mgr.setSessionColor("s2", "#123456");
      const state = mgr.getState();
      assert.ok(state.sessionColors.s1);
      assert.equal(state.sessionColors.s2, "#123456");
    });
  });

  describe("custom state-to-style mapping", () => {
    it("uses default mapping", () => {
      mgr.onSystemStateChange("active");
      const msg = bridge.last("touchpoint:led");
      assert.equal(msg.left.color, "#00cc66");
    });

    it("allows custom mapping", () => {
      mgr.setStateStyle("active", "permission");
      mgr.onSystemStateChange("active");
      // Should now use permission style (orange) instead of active (green)
      const msg = bridge.last("touchpoint:led");
      assert.equal(msg.left.color, "#ff6600");
    });

    it("returns current mapping", () => {
      mgr.setStateStyle("idle", "attention");
      const map = mgr.getStateStyleMap();
      assert.equal(map.idle, "attention");
      assert.equal(map.active, "active"); // unchanged
    });

    it("custom mapping via constructor", () => {
      const mgr2 = new InfobarManager(bridge, {
        stateStyleMap: { active: "dim" },
      });
      mgr2.onSystemStateChange("active");
      const msg = bridge.last("touchpoint:led");
      assert.equal(msg.left.color, "#666666");
      mgr2.destroy();
    });
  });

  describe("system state changes", () => {
    it("sets LED style based on state", () => {
      mgr.onSystemStateChange("active");
      const msg = bridge.last("touchpoint:led");
      assert.equal(msg.styleName, "active");
    });

    it("starts animation for waiting state", () => {
      mgr.onSystemStateChange("waiting");
      assert.equal(mgr.isAnimating, true);
      mgr.stopAnimation();
    });

    it("starts animation for permission state", () => {
      mgr.onSystemStateChange("permission");
      assert.equal(mgr.isAnimating, true);
      mgr.stopAnimation();
    });

    it("stops animation for non-attention states", () => {
      mgr.onSystemStateChange("waiting");
      assert.equal(mgr.isAnimating, true);
      mgr.onSystemStateChange("active");
      assert.equal(mgr.isAnimating, false);
    });

    it("does not override critical context state", () => {
      mgr.updateContext(190000); // 95% -> critical
      const before = bridge.broadcasts.length;
      mgr.onSystemStateChange("active");
      const after = bridge.broadcasts.length;
      assert.equal(before, after);
    });
  });

  describe("hslToHex helper", () => {
    it("converts red (h=0)", () => {
      const hex = hslToHex(0, 1, 0.5);
      assert.equal(hex, "#ff0000");
    });

    it("converts green (h=0.333)", () => {
      const hex = hslToHex(1 / 3, 1, 0.5);
      assert.equal(hex, "#00ff00");
    });

    it("converts blue (h=0.667)", () => {
      const hex = hslToHex(2 / 3, 1, 0.5);
      assert.equal(hex, "#0000ff");
    });

    it("converts white (l=1)", () => {
      const hex = hslToHex(0, 0, 1);
      assert.equal(hex, "#ffffff");
    });

    it("converts black (l=0)", () => {
      const hex = hslToHex(0, 0, 0);
      assert.equal(hex, "#000000");
    });
  });
});
