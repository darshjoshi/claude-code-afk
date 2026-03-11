const { describe, it, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const ClaudeCodeController = require("../src/controller/ClaudeCodeController");

describe("ClaudeCodeController", () => {
  let controller;

  beforeEach(() => {
    controller = new ClaudeCodeController({
      claudeBinary: "echo", // Use echo as a safe substitute
      workingDir: "/tmp",
    });
  });

  it("initializes with idle status", () => {
    assert.equal(controller.status, "idle");
    assert.equal(controller.sessionId, null);
  });

  it("getStatus returns current state", () => {
    const status = controller.getStatus();
    assert.equal(status.status, "idle");
    assert.equal(status.isRunning, false);
    assert.equal(status.historyLength, 0);
  });

  it("builds correct CLI args for basic prompt", () => {
    const args = controller._buildArgs("hello");
    assert.ok(args.includes("--print"));
    assert.ok(args.includes("--output-format"));
    assert.ok(args.includes("json"));
    assert.ok(args.includes("hello"));
  });

  it("builds args with session continuation", () => {
    controller.sessionId = "test-session-123";
    const args = controller._buildArgs("hello");
    assert.ok(args.includes("--session-id"));
    assert.ok(args.includes("test-session-123"));
    assert.ok(args.includes("--continue"));
  });

  it("builds args with model override", () => {
    const args = controller._buildArgs("hello", { model: "claude-sonnet-4-6" });
    assert.ok(args.includes("--model"));
    assert.ok(args.includes("claude-sonnet-4-6"));
  });

  it("builds args with allowed tools", () => {
    controller.allowedTools = ["Read", "Bash"];
    const args = controller._buildArgs("hello");
    assert.ok(args.includes("--allowedTools"));
    assert.ok(args.includes("Read,Bash"));
  });

  it("builds args with max turns", () => {
    const args = controller._buildArgs("hello", { maxTurns: 5 });
    assert.ok(args.includes("--max-turns"));
    assert.ok(args.includes("5"));
  });

  it("abort returns false when nothing is running", () => {
    assert.equal(controller.abort(), false);
  });

  it("resetSession clears all state", () => {
    controller.sessionId = "test-123";
    controller._history.push({ prompt: "hello" });
    controller._lastResult = { foo: "bar" };
    controller._lastError = "some error";

    controller.resetSession();

    assert.equal(controller.sessionId, null);
    assert.equal(controller._history.length, 0);
    assert.equal(controller._lastResult, null);
    assert.equal(controller._lastError, null);
    assert.equal(controller.status, "idle");
  });

  it("emits session:reset on resetSession", () => {
    const events = [];
    controller.on("session:reset", () => events.push("reset"));
    controller.resetSession();
    assert.equal(events.length, 1);
  });

  it("emits status:change events", () => {
    const changes = [];
    controller.on("status:change", (e) => changes.push(e));
    controller._setStatus("running");
    controller._setStatus("idle");
    assert.equal(changes.length, 2);
    assert.equal(changes[0].previous, "idle");
    assert.equal(changes[0].current, "running");
  });

  it("does not emit status:change for same status", () => {
    const changes = [];
    controller.on("status:change", (e) => changes.push(e));
    controller._setStatus("idle"); // Already idle
    assert.equal(changes.length, 0);
  });

  it("rejects concurrent sends", async () => {
    // Simulate a running process
    controller._activeProcess = { kill: () => {} };
    await assert.rejects(() => controller.send("hello"), {
      message: /already running/,
    });
  });
});
