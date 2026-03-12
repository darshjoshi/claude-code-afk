const { describe, it, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const { EventEmitter } = require("events");
const InfobarManager = require("../src/streamdeck/InfobarManager");

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
      // 50% of 10 width = 5 filled, 5 empty
      assert.ok(state.display.startsWith("█████░░░░░"));
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
      assert.ok(mgr.getState().display.includes("2k")); // rounds

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
      // Left overridden, right stays from style
      assert.equal(msg.left.color, "#ff0000");
      assert.equal(msg.right.color, "#00cc66");
    });

    it("clears LED overrides", () => {
      mgr.setTouchPointStyle("active");
      mgr.setLedOverrides({ left: { color: "#ff0000" } });
      // With override, left should be red
      let msg = bridge.last("touchpoint:led");
      assert.equal(msg.left.color, "#ff0000");
      // Clear overrides and re-apply — left should revert to green
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

  describe("touch point blinking", () => {
    it("starts and stops blinking", async () => {
      mgr.startTouchPointBlink("attention", 50);
      // Wait for a couple blink cycles
      await new Promise((r) => setTimeout(r, 120));
      const blinkMsgs = bridge.broadcasts.filter(
        (b) => b.type === "touchpoint:led" && b.blink === true
      );
      assert.ok(blinkMsgs.length >= 2);
      mgr.stopTouchPointBlink();
    });
  });

  describe("system state changes", () => {
    it("sets LED style based on state", () => {
      mgr.onSystemStateChange("active");
      const msg = bridge.last("touchpoint:led");
      assert.equal(msg.styleName, "active");
    });

    it("starts blinking for waiting state", () => {
      mgr.onSystemStateChange("waiting");
      // Blink timer should be set
      assert.ok(mgr._blinkTimer);
      mgr.stopTouchPointBlink();
    });

    it("does not override critical context state", () => {
      mgr.updateContext(190000); // 95% -> critical
      const before = bridge.broadcasts.length;
      mgr.onSystemStateChange("active");
      // Should not have added a new touchpoint:led broadcast
      const after = bridge.broadcasts.length;
      assert.equal(before, after);
    });
  });
});
