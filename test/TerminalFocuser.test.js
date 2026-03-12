const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const TerminalFocuser = require("../src/session/TerminalFocuser");

describe("TerminalFocuser", () => {
  it("creates with default platform", () => {
    const tf = new TerminalFocuser();
    assert.ok(tf);
  });

  it("accepts custom platform", () => {
    const tf = new TerminalFocuser({ platform: "linux" });
    assert.ok(tf);
  });

  it("returns false for unsupported platforms", async () => {
    const tf = new TerminalFocuser({ platform: "win32" });
    const result = await tf.focus({ sessionId: "test" });
    assert.equal(result, false);
  });

  it("handles missing search terms gracefully", async () => {
    const tf = new TerminalFocuser({ platform: "win32" });
    const result = await tf.focus({});
    assert.equal(result, false);
  });
});
