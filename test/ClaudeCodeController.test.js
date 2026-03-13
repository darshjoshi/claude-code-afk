const { describe, it, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const ClaudeCodeController = require("../src/controller/ClaudeCodeController");

describe("ClaudeCodeController", () => {
  let controller;

  beforeEach(() => {
    controller = new ClaudeCodeController();
  });

  it("initializes with idle status", () => {
    assert.equal(controller.status, "idle");
  });

  it("getStatus returns current state without tracker", () => {
    const status = controller.getStatus();
    assert.equal(status.status, "idle");
    assert.equal(status.sessionCount, 0);
    assert.equal(status.hasAttentionNeeded, false);
  });

  it("abort returns false when no tracker", () => {
    assert.equal(controller.abort(), false);
  });

  it("abort returns false when tracker has no attention sessions", () => {
    const mockTracker = {
      getSession: () => null,
      getAttentionSessions: () => [],
    };
    controller.setSessionTracker(mockTracker);
    assert.equal(controller.abort(), false);
  });

  it("abort denies pending permission on specific session", () => {
    let resolvedDecision = null;
    const mockTracker = {
      getSession: (id) => ({
        sessionId: id,
        pendingPermission: { tool: "Bash" },
        pendingQuestion: null,
      }),
      resolvePendingPermission: (id, decision, reason) => {
        resolvedDecision = decision;
      },
      getAttentionSessions: () => [],
    };
    controller.setSessionTracker(mockTracker);

    const result = controller.abort("test-session");
    assert.equal(result, true);
    assert.equal(resolvedDecision, "deny");
  });

  it("abort resolves pending question on specific session", () => {
    let questionResolved = false;
    const mockTracker = {
      getSession: (id) => ({
        sessionId: id,
        pendingPermission: null,
        pendingQuestion: { message: "Continue?" },
      }),
      resolveQuestion: (id) => {
        questionResolved = true;
      },
      getAttentionSessions: () => [],
    };
    controller.setSessionTracker(mockTracker);

    const result = controller.abort("test-session");
    assert.equal(result, true);
    assert.equal(questionResolved, true);
  });

  it("getStatus aggregates from session tracker", () => {
    const mockTracker = {
      getAllSessions: () => [
        { sessionId: "s1", status: "active", label: "s1", pendingPermission: null, pendingQuestion: null },
        { sessionId: "s2", status: "tool", label: "s2", pendingPermission: null, pendingQuestion: null },
      ],
      hasAttentionNeeded: false,
    };
    controller.setSessionTracker(mockTracker);

    const status = controller.getStatus();
    assert.equal(status.status, "running");
    assert.equal(status.sessionCount, 2);
    assert.equal(status.hasAttentionNeeded, false);
  });

  it("getStatus reports waiting when attention needed", () => {
    const mockTracker = {
      getAllSessions: () => [
        { sessionId: "s1", status: "permission", label: "s1", pendingPermission: { tool: "Bash" }, pendingQuestion: null },
      ],
      hasAttentionNeeded: true,
    };
    controller.setSessionTracker(mockTracker);

    const status = controller.getStatus();
    assert.equal(status.status, "waiting");
    assert.equal(status.hasAttentionNeeded, true);
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
});
