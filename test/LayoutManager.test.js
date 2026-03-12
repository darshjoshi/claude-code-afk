const { describe, it, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const LayoutManager = require("../src/streamdeck/LayoutManager");

describe("LayoutManager", () => {
  let lm;

  beforeEach(() => {
    lm = new LayoutManager({
      device: { keys: 6, cols: 3 },
      deckSize: "mini",
    });
  });

  describe("default view", () => {
    it("starts in default view", () => {
      assert.equal(lm.currentView, "default");
    });

    it("maps base layout keys", () => {
      const ctx = lm.getActionContext(0);
      assert.ok(ctx);
      assert.equal(ctx.actionId, "status");
    });

    it("adds SESSIONS button when sessions exist", () => {
      lm.updateSessions([
        { sessionId: "abc", pendingPermission: null, pendingQuestion: null },
      ]);
      lm.switchView("default");
      // Last key (index 5 for 6-key device) should be sessionsView
      const ctx = lm.getActionContext(5);
      assert.ok(ctx);
      assert.equal(ctx.actionId, "sessionsView");
    });
  });

  describe("sessions view", () => {
    it("shows session buttons", () => {
      lm.updateSessions([
        { sessionId: "abc123", status: "active", pendingPermission: null, pendingQuestion: null },
        { sessionId: "def456", status: "tool", pendingPermission: null, pendingQuestion: null },
      ]);
      lm.switchView("sessions");
      assert.equal(lm.currentView, "sessions");

      // First two keys should be session buttons
      const ctx0 = lm.getActionContext(0);
      assert.equal(ctx0.actionId, "sessionButton");
      const ctx1 = lm.getActionContext(1);
      assert.equal(ctx1.actionId, "sessionButton");

      // Last key should be BACK
      const back = lm.getActionContext(5);
      assert.equal(back.actionId, "backButton");
    });

    it("sorts attention-needing sessions first", () => {
      lm.updateSessions([
        { sessionId: "normal", status: "active", pendingPermission: null, pendingQuestion: null },
        { sessionId: "urgent", status: "permission", pendingPermission: { tool: "Bash" }, pendingQuestion: null },
      ]);
      lm.switchView("sessions");

      const ctx0 = lm.getActionContext(0);
      assert.equal(ctx0.sessionId, "urgent");
    });
  });

  describe("permission view", () => {
    it("shows permission controls", () => {
      lm.switchView("permission", { sessionId: "abc" });
      assert.equal(lm.currentView, "permission");
      assert.equal(lm.focusedSessionId, "abc");

      assert.equal(lm.getActionContext(0).actionId, "permissionInfo");
      assert.equal(lm.getActionContext(1).actionId, "allowTool");
      assert.equal(lm.getActionContext(2).actionId, "allowToolSession");
      assert.equal(lm.getActionContext(3).actionId, "denyTool");
      assert.equal(lm.getActionContext(4).actionId, "focusTerminal");
      assert.equal(lm.getActionContext(5).actionId, "backButton");
    });
  });

  describe("question view", () => {
    it("shows question controls", () => {
      lm.switchView("question", { sessionId: "abc" });
      assert.equal(lm.currentView, "question");

      assert.equal(lm.getActionContext(0).actionId, "permissionInfo");
      assert.equal(lm.getActionContext(1).actionId, "focusTerminal");
      assert.equal(lm.getActionContext(5).actionId, "backButton");
    });
  });

  describe("view switching", () => {
    it("emits view:changed events", () => {
      let emitted = null;
      lm.on("view:changed", (e) => (emitted = e));
      lm.switchView("sessions");
      assert.ok(emitted);
      assert.equal(emitted.view, "sessions");
    });
  });

  describe("getCurrentLayout", () => {
    it("returns current view info", () => {
      const layout = lm.getCurrentLayout();
      assert.equal(layout.view, "default");
      assert.ok(layout.keys);
    });
  });
});
