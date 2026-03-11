const { describe, it, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const AlertManager = require("../src/streamdeck/AlertManager");

describe("AlertManager", () => {
  let manager;

  beforeEach(() => {
    manager = new AlertManager({ blinkIntervalMs: 50 });
  });

  afterEach(() => {
    manager.destroy();
  });

  it("starts with no active alerts", () => {
    assert.equal(manager.hasActiveAlerts, false);
    assert.deepEqual(manager.activeAlerts, []);
  });

  it("startAlert creates a blinking alert", () => {
    manager.startAlert("respondAlert", { reason: "stop" });
    assert.equal(manager.hasActiveAlerts, true);
    assert.equal(manager.isAlerting("respondAlert"), true);
    assert.deepEqual(manager.activeAlerts, ["respondAlert"]);
  });

  it("emits blink events with alternating frames", async () => {
    const frames = [];
    manager.on("blink", (e) => frames.push(e));

    manager.startAlert("respondAlert", {
      reason: "test",
      label: "RESPOND",
      onColor: "#cc0000",
      offColor: "#330000",
    });

    // Wait for several blink cycles
    await new Promise((r) => setTimeout(r, 180));

    assert.ok(frames.length >= 3, `Expected >=3 frames, got ${frames.length}`);

    // First frame is always ON (bright red)
    assert.equal(frames[0].frame, 0);
    assert.equal(frames[0].state.color, "#cc0000");
    assert.equal(frames[0].state.label, "RESPOND");

    // Second frame is OFF (dark red)
    assert.equal(frames[1].frame, 1);
    assert.equal(frames[1].state.color, "#330000");

    // Third frame is back to ON
    assert.equal(frames[2].frame, 0);
    assert.equal(frames[2].state.color, "#cc0000");
  });

  it("emits alert:start when alert begins", () => {
    const events = [];
    manager.on("alert:start", (e) => events.push(e));

    manager.startAlert("respondAlert", { reason: "permission" });

    assert.equal(events.length, 1);
    assert.equal(events[0].buttonId, "respondAlert");
    assert.equal(events[0].reason, "permission");
  });

  it("clearAlert stops blinking and emits alert:clear", () => {
    const clearEvents = [];
    manager.on("alert:clear", (e) => clearEvents.push(e));

    manager.startAlert("respondAlert", { reason: "stop" });
    assert.equal(manager.isAlerting("respondAlert"), true);

    const cleared = manager.clearAlert("respondAlert");
    assert.equal(cleared, true);
    assert.equal(manager.isAlerting("respondAlert"), false);
    assert.equal(manager.hasActiveAlerts, false);

    assert.equal(clearEvents.length, 1);
    assert.equal(clearEvents[0].buttonId, "respondAlert");
    assert.equal(clearEvents[0].reason, "stop");
    assert.ok(clearEvents[0].duration >= 0);
  });

  it("clearAlert returns false for non-existent alert", () => {
    assert.equal(manager.clearAlert("nonexistent"), false);
  });

  it("startAlert replaces existing alert on same button", () => {
    const starts = [];
    const clears = [];
    manager.on("alert:start", (e) => starts.push(e));
    manager.on("alert:clear", (e) => clears.push(e));

    manager.startAlert("respondAlert", { reason: "stop" });
    manager.startAlert("respondAlert", { reason: "permission" });

    // Old alert was cleared, new one started
    assert.equal(clears.length, 1);
    assert.equal(starts.length, 2);
    assert.equal(starts[1].reason, "permission");
    assert.equal(manager.isAlerting("respondAlert"), true);
  });

  it("clearAll clears all active alerts", () => {
    manager.startAlert("btn1", { reason: "a" });
    manager.startAlert("btn2", { reason: "b" });
    assert.equal(manager.activeAlerts.length, 2);

    const cleared = manager.clearAll();
    assert.deepEqual(cleared.sort(), ["btn1", "btn2"]);
    assert.equal(manager.hasActiveAlerts, false);
  });

  it("blink state includes sublabel and icon", () => {
    const frames = [];
    manager.on("blink", (e) => frames.push(e));

    manager.startAlert("respondAlert", {
      reason: "permission",
      sublabel: "Allow Bash?",
      icon: "shield",
    });

    assert.ok(frames.length >= 1);
    assert.equal(frames[0].state.sublabel, "Allow Bash?");
    assert.equal(frames[0].state.icon, "shield");
    assert.equal(frames[0].state.blink, true);
  });

  it("stops emitting blinks after clearAlert", async () => {
    const frames = [];
    manager.on("blink", (e) => frames.push(e));

    manager.startAlert("respondAlert", { reason: "test" });
    await new Promise((r) => setTimeout(r, 80));

    const countBefore = frames.length;
    manager.clearAlert("respondAlert");

    await new Promise((r) => setTimeout(r, 120));
    // No new frames after clearing
    assert.equal(frames.length, countBefore);
  });

  it("destroy clears everything", () => {
    manager.startAlert("btn1", { reason: "a" });
    manager.startAlert("btn2", { reason: "b" });
    manager.destroy();
    assert.equal(manager.hasActiveAlerts, false);
  });
});
