const { EventEmitter } = require("events");

/**
 * Lightweight status aggregator for Claude Code sessions.
 * No longer spawns processes — session control is handled via
 * hooks (HookReceiver) and the SessionTracker.
 */
class ClaudeCodeController extends EventEmitter {
  constructor(options = {}) {
    super();
    this.status = "idle"; // idle | running | waiting | error
    this._sessionTracker = options.sessionTracker || null;
  }

  /**
   * Attach a SessionTracker after construction.
   */
  setSessionTracker(tracker) {
    this._sessionTracker = tracker;
  }

  /**
   * Abort: deny any pending permission on the focused session.
   * Returns true if something was aborted.
   */
  abort(sessionId) {
    if (!this._sessionTracker) return false;

    if (sessionId) {
      const session = this._sessionTracker.getSession(sessionId);
      if (session?.pendingPermission) {
        this._sessionTracker.resolvePendingPermission(sessionId, "deny", "aborted by user");
        this._setStatus("idle");
        this.emit("command:aborted");
        return true;
      }
      if (session?.pendingQuestion) {
        this._sessionTracker.resolveQuestion(sessionId);
        this._setStatus("idle");
        this.emit("command:aborted");
        return true;
      }
      return false;
    }

    // No specific session — try to abort any session needing attention
    const attention = this._sessionTracker.getAttentionSessions();
    if (attention.length > 0) {
      const session = attention[0];
      if (session.pendingPermission) {
        this._sessionTracker.resolvePendingPermission(session.sessionId, "deny", "aborted by user");
      } else if (session.pendingQuestion) {
        this._sessionTracker.resolveQuestion(session.sessionId);
      }
      this._setStatus("idle");
      this.emit("command:aborted");
      return true;
    }

    return false;
  }

  /**
   * Get aggregated status from SessionTracker.
   */
  getStatus() {
    if (!this._sessionTracker) {
      return {
        status: this.status,
        sessionCount: 0,
        sessions: [],
        hasAttentionNeeded: false,
      };
    }

    const sessions = this._sessionTracker.getAllSessions();
    const hasAttention = this._sessionTracker.hasAttentionNeeded;

    // Derive aggregate status
    let aggregateStatus = "idle";
    if (sessions.length === 0) {
      aggregateStatus = "idle";
    } else if (hasAttention) {
      aggregateStatus = "waiting";
    } else if (sessions.some((s) => s.status === "tool" || s.status === "active")) {
      aggregateStatus = "running";
    }

    return {
      status: aggregateStatus,
      sessionCount: sessions.length,
      sessions: sessions.map((s) => ({
        sessionId: s.sessionId,
        status: s.status,
        label: s.label,
        hasPendingPermission: !!s.pendingPermission,
        hasPendingQuestion: !!s.pendingQuestion,
      })),
      hasAttentionNeeded: hasAttention,
    };
  }

  _setStatus(status) {
    const previous = this.status;
    this.status = status;
    if (previous !== status) {
      this.emit("status:change", { previous, current: status });
    }
  }
}

module.exports = ClaudeCodeController;
