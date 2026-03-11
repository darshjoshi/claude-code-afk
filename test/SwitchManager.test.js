const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const SwitchManager = require("../src/SwitchManager");

describe("SwitchManager", () => {
  it("adds and retrieves switches", () => {
    const mgr = new SwitchManager();
    mgr.add({ id: "sw1", keyIndex: 0 });
    assert.equal(mgr.size, 1);
    assert.notEqual(mgr.get("sw1"), null);
  });

  it("rejects duplicate switch ids", () => {
    const mgr = new SwitchManager();
    mgr.add({ id: "sw1" });
    assert.throws(() => mgr.add({ id: "sw1" }));
  });

  it("maps keys to switches", () => {
    const mgr = new SwitchManager();
    mgr.add({ id: "sw1", keyIndex: 3 });
    const sw = mgr.getByKey(3);
    assert.notEqual(sw, null);
    assert.equal(sw.id, "sw1");
  });

  it("handleKeyDown triggers the correct switch", () => {
    const mgr = new SwitchManager();
    mgr.add({ id: "sw1", mode: "toggle", keyIndex: 0 });
    const state = mgr.handleKeyDown(0);
    assert.equal(state.label, "ON");
  });

  it("handleKeyDown returns null for unmapped keys", () => {
    const mgr = new SwitchManager();
    assert.equal(mgr.handleKeyDown(99), null);
  });

  it("handleKeyUp releases momentary switches", () => {
    const mgr = new SwitchManager();
    mgr.add({ id: "ptt", mode: "momentary", keyIndex: 1 });
    mgr.handleKeyDown(1);
    const sw = mgr.get("ptt");
    assert.equal(sw.currentIndex, 1);

    mgr.handleKeyUp(1);
    assert.equal(sw.currentIndex, 0);
  });

  it("removes switches", () => {
    const mgr = new SwitchManager();
    mgr.add({ id: "sw1", keyIndex: 0 });
    assert.equal(mgr.remove("sw1"), true);
    assert.equal(mgr.size, 0);
    assert.equal(mgr.getByKey(0), null);
  });

  it("remove returns false for unknown id", () => {
    const mgr = new SwitchManager();
    assert.equal(mgr.remove("nope"), false);
  });

  it("loadConfig adds multiple switches", () => {
    const mgr = new SwitchManager();
    mgr.loadConfig([
      { id: "a", keyIndex: 0 },
      { id: "b", keyIndex: 1 },
      { id: "c", keyIndex: 2 },
    ]);
    assert.equal(mgr.size, 3);
  });

  it("snapshot returns state of all switches", () => {
    const mgr = new SwitchManager();
    mgr.add({ id: "sw1", keyIndex: 0 });
    mgr.add({ id: "sw2", keyIndex: 1 });
    const snap = mgr.snapshot();
    assert.ok("sw1" in snap);
    assert.ok("sw2" in snap);
    assert.equal(snap.sw1.keyIndex, 0);
  });

  it("emits switch:change events", () => {
    const mgr = new SwitchManager();
    mgr.add({ id: "sw1", mode: "toggle", keyIndex: 0 });
    const events = [];
    mgr.on("switch:change", (e) => events.push(e));

    mgr.handleKeyDown(0);
    assert.equal(events.length, 1);
    assert.equal(events[0].switchId, "sw1");
  });

  it("emits switch:added and switch:removed events", () => {
    const mgr = new SwitchManager();
    const added = [];
    const removed = [];
    mgr.on("switch:added", (e) => added.push(e));
    mgr.on("switch:removed", (e) => removed.push(e));

    mgr.add({ id: "sw1" });
    mgr.remove("sw1");
    assert.equal(added.length, 1);
    assert.equal(removed.length, 1);
  });

  it("is iterable", () => {
    const mgr = new SwitchManager();
    mgr.add({ id: "a" });
    mgr.add({ id: "b" });
    const ids = [...mgr].map((sw) => sw.id);
    assert.deepEqual(ids.sort(), ["a", "b"]);
  });
});
