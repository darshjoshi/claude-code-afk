const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const {
  DEVICES,
  getDevice,
  createCustomDevice,
  listDevices,
  describeDevice,
} = require("../src/streamdeck/devices");

describe("devices", () => {
  it("has all Stream Deck models", () => {
    const expected = [
      "mini", "neo", "standard", "scissor", "plus", "xl",
      "plusXl", "studio", "pedal", "virtual",
      "module6", "module15", "module32", "custom",
    ];
    for (const id of expected) {
      assert.ok(DEVICES[id], `Missing device: ${id}`);
    }
  });

  it("mini has 6 keys, 2x3 grid", () => {
    assert.equal(DEVICES.mini.keys, 6);
    assert.equal(DEVICES.mini.rows, 2);
    assert.equal(DEVICES.mini.cols, 3);
  });

  it("neo has 8 keys, infobar, and 2 touch points", () => {
    assert.equal(DEVICES.neo.keys, 8);
    assert.equal(DEVICES.neo.touchPoints, 2);
    assert.equal(DEVICES.neo.hasInfobar, true);
  });

  it("standard has 15 keys, 3x5 grid", () => {
    assert.equal(DEVICES.standard.keys, 15);
    assert.equal(DEVICES.standard.rows, 3);
    assert.equal(DEVICES.standard.cols, 5);
  });

  it("plus has 8 keys, 4 dials, and 1 touch strip", () => {
    assert.equal(DEVICES.plus.keys, 8);
    assert.equal(DEVICES.plus.dials, 4);
    assert.equal(DEVICES.plus.touchStrips, 1);
  });

  it("xl has 32 keys, 4x8 grid", () => {
    assert.equal(DEVICES.xl.keys, 32);
    assert.equal(DEVICES.xl.rows, 4);
    assert.equal(DEVICES.xl.cols, 8);
  });

  it("plusXl has 36 keys and 6 dials", () => {
    assert.equal(DEVICES.plusXl.keys, 36);
    assert.equal(DEVICES.plusXl.dials, 6);
  });

  it("studio has 32 keys, 2 dials, NFC and Ethernet", () => {
    assert.equal(DEVICES.studio.keys, 32);
    assert.equal(DEVICES.studio.dials, 2);
    assert.equal(DEVICES.studio.hasNfc, true);
    assert.equal(DEVICES.studio.hasEthernet, true);
  });

  it("pedal has 3 pedals and no keys", () => {
    assert.equal(DEVICES.pedal.keys, 0);
    assert.equal(DEVICES.pedal.pedals, 3);
  });

  it("virtual supports up to 64 keys", () => {
    assert.equal(DEVICES.virtual.keys, 64);
    assert.equal(DEVICES.virtual.isVirtual, true);
  });

  it("getDevice returns device by id", () => {
    assert.equal(getDevice("mini").id, "mini");
    assert.equal(getDevice("nonexistent"), null);
  });

  it("createCustomDevice merges overrides", () => {
    const custom = createCustomDevice("standard", {
      name: "My Deck",
      keys: 20,
    });
    assert.equal(custom.name, "My Deck");
    assert.equal(custom.keys, 20);
    assert.equal(custom.cols, 5); // inherited from standard
  });

  it("createCustomDevice throws on unknown base", () => {
    assert.throws(() => createCustomDevice("nonexistent", {}));
  });

  it("listDevices returns all devices", () => {
    const all = listDevices();
    assert.ok(all.length >= 14);
  });

  it("describeDevice gives human-readable summary", () => {
    const desc = describeDevice("plus");
    assert.ok(desc.includes("8 keys"));
    assert.ok(desc.includes("4 dials"));
    assert.ok(desc.includes("touch strip"));
  });

  it("describeDevice returns null for unknown device", () => {
    assert.equal(describeDevice("nonexistent"), null);
  });
});
