const { describe, it, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const SessionTracker = require("../src/session/SessionTracker");

describe("SessionTracker", () => {
  let tracker;

  beforeEach(() => {
    tracker = new SessionTracker({
      responseTimeoutMs: 500,
      staleThresholdMs: 1000,
      cleanupIntervalMs: 60000,
    });
  });

  afterEach(() => {
    tracker.destroy();
  });

  describe("session lifecycle", () => {
    it("registers and retrieves a session", () => {
      tracker.registerSession("abc123");
      const session = tracker.getSession("abc123");
      assert.ok(session);
      assert.equal(session.sessionId, "abc123");
      assert.equal(session.status, "active");
      assert.equal(session.label, "c123");
    });

    it("emits session:added on register", () => {
      let emitted = null;
      tracker.on("session:added", (e) => (emitted = e));
      tracker.registerSession("xyz");
      assert.ok(emitted);
      assert.equal(emitted.sessionId, "xyz");
    });

    it("removes a session", () => {
      tracker.registerSession("abc123");
      tracker.removeSession("abc123");
      assert.equal(tracker.getSession("abc123"), null);
    });

    it("emits session:removed on remove", () => {
      tracker.registerSession("abc123");
      let emitted = null;
      tracker.on("session:removed", (e) => (emitted = e));
      tracker.removeSession("abc123");
      assert.ok(emitted);
    });

    it("returns all sessions", () => {
      tracker.registerSession("a");
      tracker.registerSession("b");
      assert.equal(tracker.getAllSessions().length, 2);
    });

    it("does not duplicate on re-register", () => {
      tracker.registerSession("a");
      tracker.registerSession("a");
      assert.equal(tracker.sessionCount, 1);
    });
  });

  describe("status updates", () => {
    it("updates session status on events", () => {
      tracker.registerSession("s1");
      tracker.updateStatus("s1", "pre-tool-use", { tool: "Bash" });
      assert.equal(tracker.getSession("s1").status, "tool");
      assert.equal(tracker.getSession("s1").currentTool, "Bash");

      tracker.updateStatus("s1", "post-tool-use");
      assert.equal(tracker.getSession("s1").status, "active");
      assert.equal(tracker.getSession("s1").currentTool, null);
    });

    it("auto-registers unknown sessions", () => {
      tracker.updateStatus("unknown1", "pre-tool-use", { tool: "Read" });
      assert.ok(tracker.getSession("unknown1"));
    });

    it("stores cwd from status updates", () => {
      tracker.registerSession("s1");
      assert.equal(tracker.getSession("s1").cwd, null);
      tracker.updateStatus("s1", "session-start", { cwd: "/home/user/project" });
      assert.equal(tracker.getSession("s1").cwd, "/home/user/project");
    });

    it("does not overwrite cwd with null", () => {
      tracker.registerSession("s1");
      tracker.updateStatus("s1", "session-start", { cwd: "/home/user/project" });
      tracker.updateStatus("s1", "pre-tool-use", { tool: "Bash" });
      assert.equal(tracker.getSession("s1").cwd, "/home/user/project");
    });
  });

  describe("permission management", () => {
    it("stores and resolves pending permission", () => {
      tracker.registerSession("s1");
      let resolved = null;
      tracker.setPendingPermission("s1", {
        tool: "Bash",
        body: {},
        resolve: (r) => (resolved = r),
      });

      assert.ok(tracker.getSession("s1").pendingPermission);
      assert.equal(tracker.getSession("s1").status, "permission");

      tracker.resolvePendingPermission("s1", "allow");
      assert.deepEqual(resolved, {
        hookSpecificOutput: {
          hookEventName: "PreToolUse",
          permissionDecision: "allow",
          permissionDecisionReason: "",
        },
      });
      assert.equal(tracker.getSession("s1").pendingPermission, null);
    });

    it("sends deny with reason", () => {
      tracker.registerSession("s1");
      let resolved = null;
      tracker.setPendingPermission("s1", {
        tool: "Bash",
        body: {},
        resolve: (r) => (resolved = r),
      });

      tracker.resolvePendingPermission("s1", "deny", "not allowed");
      assert.deepEqual(resolved, {
        hookSpecificOutput: {
          hookEventName: "PreToolUse",
          permissionDecision: "deny",
          permissionDecisionReason: "not allowed",
        },
      });
    });

    it("emits permission events", () => {
      tracker.registerSession("s1");
      let pending = null;
      let resolved = null;
      tracker.on("permission:pending", (e) => (pending = e));
      tracker.on("permission:resolved", (e) => (resolved = e));

      tracker.setPendingPermission("s1", {
        tool: "Bash",
        body: {},
        resolve: () => {},
      });
      assert.ok(pending);
      assert.equal(pending.tool, "Bash");

      tracker.resolvePendingPermission("s1", "allow");
      assert.ok(resolved);
      assert.equal(resolved.decision, "allow");
    });

    it("auto-allows superseded permissions", () => {
      tracker.registerSession("s1");
      let first = null;
      tracker.setPendingPermission("s1", {
        tool: "Bash",
        body: {},
        resolve: (r) => (first = r),
      });

      let second = null;
      tracker.setPendingPermission("s1", {
        tool: "Read",
        body: {},
        resolve: (r) => (second = r),
      });

      // First should have been auto-allowed
      assert.deepEqual(first, {
        hookSpecificOutput: {
          hookEventName: "PreToolUse",
          permissionDecision: "allow",
          permissionDecisionReason: "superseded by new request",
        },
      });
      // Second is still pending
      assert.ok(tracker.getSession("s1").pendingPermission);
      assert.equal(tracker.getSession("s1").pendingPermission.tool, "Read");
    });

    it("tracks session approvals", () => {
      tracker.registerSession("s1");
      assert.equal(tracker.hasSessionApproval("s1", "Bash"), false);
      tracker.addSessionApproval("s1", "Bash");
      assert.equal(tracker.hasSessionApproval("s1", "Bash"), true);
      assert.equal(tracker.hasSessionApproval("s1", "Read"), false);
    });

    it("times out held permissions", async () => {
      tracker = new SessionTracker({ responseTimeoutMs: 50, cleanupIntervalMs: 60000 });
      tracker.registerSession("s1");
      let resolved = null;
      let timedOut = false;
      tracker.on("permission:timeout", () => (timedOut = true));

      tracker.setPendingPermission("s1", {
        tool: "Bash",
        body: {},
        resolve: (r) => (resolved = r),
      });

      await new Promise((r) => setTimeout(r, 100));
      assert.deepEqual(resolved, {
        hookSpecificOutput: {
          hookEventName: "PreToolUse",
          permissionDecision: "allow",
          permissionDecisionReason: "timeout",
        },
      });
      assert.equal(timedOut, true);
      tracker.destroy();
    });
  });

  describe("question management", () => {
    it("stores and resolves pending question", () => {
      tracker.registerSession("s1");
      let resolved = null;
      tracker.setPendingQuestion("s1", {
        message: "What file?",
        resolve: (r) => (resolved = r),
      });

      assert.ok(tracker.getSession("s1").pendingQuestion);
      assert.equal(tracker.getSession("s1").status, "waiting");

      tracker.resolveQuestion("s1");
      assert.deepEqual(resolved, { status: "ok" });
      assert.equal(tracker.getSession("s1").pendingQuestion, null);
    });

    it("emits question events", () => {
      tracker.registerSession("s1");
      let pending = null;
      tracker.on("question:pending", (e) => (pending = e));

      tracker.setPendingQuestion("s1", {
        message: "Which?",
        resolve: () => {},
      });
      assert.ok(pending);
      assert.equal(pending.message, "Which?");
    });
  });

  describe("attention queries", () => {
    it("reports sessions needing attention", () => {
      tracker.registerSession("s1");
      tracker.registerSession("s2");

      assert.equal(tracker.hasAttentionNeeded, false);
      assert.equal(tracker.getAttentionSessions().length, 0);

      tracker.setPendingPermission("s1", {
        tool: "Bash",
        body: {},
        resolve: () => {},
      });

      assert.equal(tracker.hasAttentionNeeded, true);
      assert.equal(tracker.getAttentionSessions().length, 1);
    });
  });

  describe("cleanup", () => {
    it("resolves pending callbacks on remove", () => {
      tracker.registerSession("s1");
      let resolved = null;
      tracker.setPendingPermission("s1", {
        tool: "Bash",
        body: {},
        resolve: (r) => (resolved = r),
      });
      tracker.removeSession("s1");
      assert.equal(resolved.hookSpecificOutput.permissionDecision, "allow");
    });

    it("resolves all on destroy", () => {
      tracker.registerSession("s1");
      let resolved = null;
      tracker.setPendingPermission("s1", {
        tool: "Bash",
        body: {},
        resolve: (r) => (resolved = r),
      });
      tracker.destroy();
      assert.equal(resolved.hookSpecificOutput.permissionDecision, "allow");
      assert.equal(tracker.sessionCount, 0);
    });
  });
});
