const { describe, it, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const os = require("os");
const ConfigManager = require("../src/config/ConfigManager");

describe("ConfigManager", () => {
  const tmpDir = path.join(os.tmpdir(), `sd-config-test-${Date.now()}`);
  const configPath = path.join(tmpDir, "config.json");
  let config;

  beforeEach(() => {
    config = new ConfigManager(configPath);
  });

  afterEach(() => {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {}
  });

  it("loads defaults when no config file exists", () => {
    const cfg = config.load();
    assert.equal(cfg.device.id, "standard");
    assert.equal(cfg.server.port, 8247);
  });

  it("saves and loads config round-trip", () => {
    config.load();
    config.setDevice("plus");
    config.save();

    const config2 = new ConfigManager(configPath);
    const cfg = config2.load();
    assert.equal(cfg.device.id, "plus");
  });

  it("getDevice returns correct device", () => {
    config.load();
    config.setDevice("xl");
    const device = config.getDevice();
    assert.equal(device.id, "xl");
    assert.equal(device.keys, 32);
  });

  it("getLayout returns default for device", () => {
    config.load();
    const layout = config.getLayout();
    assert.ok(layout.keys);
  });

  it("getLayout merges user overrides", () => {
    config.load();
    config.setKeyAction(0, "abort");
    const layout = config.getLayout();
    assert.equal(layout.keys[0], "abort"); // overridden
    assert.equal(layout.keys[1], "respondAlert"); // from default
  });

  it("setDialAction stores dial mapping", () => {
    config.load();
    config.setDevice("plus");
    config.setDialAction(0, "volume");
    const layout = config.getLayout();
    assert.equal(layout.dials[0], "volume");
  });

  it("setPedalAction stores pedal mapping", () => {
    config.load();
    config.setDevice("pedal");
    config.setPedalAction(1, "pedalAbort");
    const layout = config.getLayout();
    assert.equal(layout.pedals[1], "pedalAbort");
  });

  it("addCustomAction and getActions", () => {
    config.load();
    config.addCustomAction("lint", {
      name: "Lint",
      prompt: "Run the linter",
      label: "LINT",
      color: "#ffaa00",
    });
    const actions = config.getActions();
    assert.ok(actions.lint);
    assert.equal(actions.lint.name, "Lint");
    assert.equal(actions.lint.payload.prompt, "Run the linter");
  });

  it("removeCustomAction removes it", () => {
    config.load();
    config.addCustomAction("lint", { prompt: "lint" });
    config.removeCustomAction("lint");
    const actions = config.getActions();
    assert.equal(actions.lint, undefined);
  });

  it("setServer updates server config", () => {
    config.load();
    config.setServer({ port: 9999 });
    assert.equal(config.toJSON().server.port, 9999);
  });

  it("setClaude updates claude config", () => {
    config.load();
    config.setClaude({ model: "claude-sonnet-4-6" });
    assert.equal(config.toJSON().claude.model, "claude-sonnet-4-6");
  });

  it("reset restores defaults", () => {
    config.load();
    config.setDevice("xl");
    config.addCustomAction("foo", { prompt: "bar" });
    config.reset();
    assert.equal(config.toJSON().device.id, "standard");
    assert.deepEqual(config.toJSON().customActions, {});
  });

  it("toJSON returns config object", () => {
    config.load();
    const json = config.toJSON();
    assert.ok(json.device);
    assert.ok(json.server);
    assert.ok(json.claude);
  });
});
