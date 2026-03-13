const { describe, it, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const os = require("os");
const {
  generateHookConfig,
  installHooks,
  uninstallHooks,
  installStatuslineScript,
} = require("../src/hooks/installHooks");

describe("installHooks", () => {
  const tmpDir = path.join(os.tmpdir(), `streamdeck-test-${Date.now()}`);
  const settingsPath = path.join(tmpDir, "settings.json");

  afterEach(() => {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {}
  });

  it("generateHookConfig returns hook config with all events", () => {
    const config = generateHookConfig();
    assert.ok(config.hooks.Notification);
    assert.ok(config.hooks.Stop);
    assert.ok(config.hooks.PreToolUse);
    assert.ok(config.hooks.PostToolUse);
    assert.ok(config.hooks.SessionStart);
    assert.ok(config.hooks.SessionEnd);
    assert.ok(config.hooks.PermissionRequest);
  });

  it("generateHookConfig uses custom port", () => {
    const config = generateHookConfig({ port: 9999 });
    const url = config.hooks.Notification[0].hooks[0].url;
    assert.ok(url.includes("9999"));
  });

  it("installHooks creates settings file", () => {
    installHooks({ settingsPath });
    assert.ok(fs.existsSync(settingsPath));
    const settings = JSON.parse(fs.readFileSync(settingsPath, "utf8"));
    assert.ok(settings.hooks.Notification);
  });

  it("installHooks preserves existing settings", () => {
    fs.mkdirSync(tmpDir, { recursive: true });
    fs.writeFileSync(
      settingsPath,
      JSON.stringify({ existingKey: "value" })
    );

    installHooks({ settingsPath });
    const settings = JSON.parse(fs.readFileSync(settingsPath, "utf8"));
    assert.equal(settings.existingKey, "value");
    assert.ok(settings.hooks.Notification);
  });

  it("uninstallHooks removes streamdeck hooks", () => {
    installHooks({ settingsPath });
    const result = uninstallHooks({ settingsPath });
    assert.equal(result.removed, true);
    assert.ok(result.count > 0);

    const settings = JSON.parse(fs.readFileSync(settingsPath, "utf8"));
    assert.equal(settings.hooks, undefined);
  });

  it("uninstallHooks handles missing file", () => {
    const result = uninstallHooks({
      settingsPath: path.join(tmpDir, "nonexistent.json"),
    });
    assert.equal(result.removed, false);
  });

  it("generateHookConfig includes PermissionRequest event", () => {
    const config = generateHookConfig({ port: 8247 });
    const url = config.hooks.PermissionRequest[0].hooks[0].url;
    assert.ok(url.includes("/hooks/permission-request"));
  });

  it("installStatuslineScript creates executable script", () => {
    const scriptDir = path.join(tmpDir, "statusline-test");
    fs.mkdirSync(scriptDir, { recursive: true });
    // Override HOME to write to temp dir
    const origHome = os.homedir;
    os.homedir = () => scriptDir;
    try {
      const result = installStatuslineScript({ port: 8247 });
      assert.ok(fs.existsSync(result.scriptPath));
      const content = fs.readFileSync(result.scriptPath, "utf8");
      assert.ok(content.includes("/hooks/statusline"));
      assert.ok(content.includes("8247"));
      const stats = fs.statSync(result.scriptPath);
      assert.ok(stats.mode & 0o100, "script should be executable");
    } finally {
      os.homedir = origHome;
    }
  });
});
