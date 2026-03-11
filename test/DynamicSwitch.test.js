const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const DynamicSwitch = require("../src/DynamicSwitch");

describe("DynamicSwitch", () => {
  it("starts in the initial state", () => {
    const sw = new DynamicSwitch({ id: "test", mode: "toggle" });
    assert.equal(sw.currentIndex, 0);
    assert.equal(sw.stateLabel, "OFF");
    assert.equal(sw.isOn, false);
  });

  it("toggles between two states", () => {
    const sw = new DynamicSwitch({ id: "test", mode: "toggle" });
    sw.press();
    assert.equal(sw.currentIndex, 1);
    assert.equal(sw.stateLabel, "ON");
    assert.equal(sw.isOn, true);

    sw.press();
    assert.equal(sw.currentIndex, 0);
    assert.equal(sw.isOn, false);
  });

  it("cycles through multiple states", () => {
    const sw = new DynamicSwitch({
      id: "test",
      mode: "cycle",
      states: [
        { label: "A", color: "#a" },
        { label: "B", color: "#b" },
        { label: "C", color: "#c" },
      ],
    });

    assert.equal(sw.stateLabel, "A");
    sw.press();
    assert.equal(sw.stateLabel, "B");
    sw.press();
    assert.equal(sw.stateLabel, "C");
    sw.press();
    assert.equal(sw.stateLabel, "A"); // wraps around
  });

  it("handles momentary mode (press and release)", () => {
    const sw = new DynamicSwitch({ id: "test", mode: "momentary" });
    assert.equal(sw.currentIndex, 0);

    sw.press();
    assert.equal(sw.currentIndex, 1);

    sw.release();
    assert.equal(sw.currentIndex, 0);
  });

  it("release is no-op for non-momentary modes", () => {
    const sw = new DynamicSwitch({ id: "test", mode: "toggle" });
    sw.press();
    assert.equal(sw.currentIndex, 1);
    sw.release();
    assert.equal(sw.currentIndex, 1); // unchanged
  });

  it("emits change events", () => {
    const sw = new DynamicSwitch({ id: "test", mode: "toggle" });
    const events = [];
    sw.on("change", (e) => events.push(e));

    sw.press();
    assert.equal(events.length, 1);
    assert.equal(events[0].previousIndex, 0);
    assert.equal(events[0].currentIndex, 1);
  });

  it("calls onAction callback", () => {
    const calls = [];
    const sw = new DynamicSwitch({
      id: "test",
      mode: "toggle",
      onAction: (result) => calls.push(result),
    });

    sw.press();
    assert.equal(calls.length, 1);
    assert.equal(calls[0].currentIndex, 1);
  });

  it("respects cooldown", () => {
    const sw = new DynamicSwitch({
      id: "test",
      mode: "toggle",
      cooldownMs: 10000,
    });

    sw.press(); // goes to ON
    assert.equal(sw.currentIndex, 1);

    sw.press(); // blocked by cooldown
    assert.equal(sw.currentIndex, 1); // still ON
  });

  it("blocks when condition returns false", () => {
    const blocked = [];
    const sw = new DynamicSwitch({
      id: "test",
      mode: "toggle",
      condition: () => false,
    });
    sw.on("blocked", (e) => blocked.push(e));

    sw.press();
    assert.equal(sw.currentIndex, 0); // unchanged
    assert.equal(blocked.length, 1);
  });

  it("setState sets a specific state", () => {
    const sw = new DynamicSwitch({
      id: "test",
      mode: "cycle",
      states: [
        { label: "A", color: "#a" },
        { label: "B", color: "#b" },
        { label: "C", color: "#c" },
      ],
    });

    sw.setState(2);
    assert.equal(sw.stateLabel, "C");
  });

  it("setState throws on out-of-range index", () => {
    const sw = new DynamicSwitch({ id: "test", mode: "toggle" });
    assert.throws(() => sw.setState(5), RangeError);
    assert.throws(() => sw.setState(-1), RangeError);
  });

  it("reset returns to state 0", () => {
    const sw = new DynamicSwitch({ id: "test", mode: "toggle" });
    sw.press();
    assert.equal(sw.currentIndex, 1);
    sw.reset();
    assert.equal(sw.currentIndex, 0);
  });

  it("toJSON returns serializable representation", () => {
    const sw = new DynamicSwitch({
      id: "my-switch",
      name: "My Switch",
      mode: "toggle",
      keyIndex: 5,
    });
    const json = sw.toJSON();
    assert.equal(json.id, "my-switch");
    assert.equal(json.name, "My Switch");
    assert.equal(json.keyIndex, 5);
    assert.equal(json.mode, "toggle");
  });
});
