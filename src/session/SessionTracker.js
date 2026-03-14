const { EventEmitter } = require("events");

/**
 * Central registry of all active Claude Code sessions.
 *
 * Tracks per-session state including pending permission requests and questions.
 * When a PreToolUse hook arrives, the HTTP response can be "held" here so
 * the user can approve/deny from the Stream Deck before Claude proceeds.
 *
 * Marks sessions as stale after inactivity (never removes them).
 * Permissions wait indefinitely — no auto-allow on timeout.
 */
class SessionTracker extends EventEmitter {
  constructor(options = {}) {
    super();
    this._sessions = new Map();
    this._responseTimeoutMs = options.responseTimeoutMs || 25000;
    this._staleThresholdMs = options.staleThresholdMs || 60 * 60 * 1000;
    this._cleanupIntervalMs = options.cleanupIntervalMs || 60000;

    this._cleanupTimer = setInterval(() => this._cleanupStale(), this._cleanupIntervalMs);
    if (this._cleanupTimer.unref) this._cleanupTimer.unref();
  }

  // ── Session lifecycle ──────────────────────────────────────

  registerSession(id) {
    if (this._sessions.has(id)) return this._sessions.get(id);

    const session = {
      sessionId: id,
      status: "active",
      lastEvent: "session-start",
      lastEventTime: Date.now(),
      currentTool: null,
      pendingPermission: null,
      pendingQuestion: null,
      sessionApprovals: new Set(),
      label: id.length >= 4 ? id.slice(-4) : id,
      cwd: null,
    };

    this._sessions.set(id, session);
    this.emit("session:added", { sessionId: id, session });
    return session;
  }

  removeSession(id) {
    const session = this._sessions.get(id);
    if (!session) return;

    // Resolve any pending callbacks before removing
    if (session.pendingPermission) {
      this._resolvePermissionCallback(session, "allow", "session ended");
    }
    if (session.pendingQuestion) {
      this._resolveQuestionCallback(session);
    }

    this._sessions.delete(id);
    this.emit("session:removed", { sessionId: id });
  }

  getSession(id) {
    return this._sessions.get(id) || null;
  }

  getAllSessions() {
    return [...this._sessions.values()];
  }

  get sessionCount() {
    return this._sessions.size;
  }

  // ── Status updates ─────────────────────────────────────────

  updateStatus(id, event, data = {}) {
    let session = this._sessions.get(id);
    if (!session) {
      // Auto-register unknown sessions
      session = this.registerSession(id);
    }

    session.lastEvent = event;
    session.lastEventTime = Date.now();

    if (data.cwd) session.cwd = data.cwd;

    if (event === "pre-tool-use" && data.tool) {
      session.currentTool = data.tool;
      session.status = "tool";
    } else if (event === "post-tool-use") {
      session.currentTool = null;
      session.status = "active";
    } else if (event === "stop") {
      session.status = "waiting";
    } else if (event === "notification") {
      session.status = "attention";
    } else if (event === "prompt-submit") {
      session.status = "active";
    } else if (event === "session-start") {
      session.status = "active";
    } else if (event === "session-end") {
      session.status = "offline";
    }

    this.emit("session:updated", { sessionId: id, session, event });
  }

  // ── Permission management ──────────────────────────────────

  /**
   * Check if a tool was already approved for this session.
   */
  hasSessionApproval(id, tool) {
    const session = this._sessions.get(id);
    if (!session) return false;
    return session.sessionApprovals.has(tool);
  }

  /**
   * Remember that a tool was approved for this session.
   */
  addSessionApproval(id, tool) {
    const session = this._sessions.get(id);
    if (!session) return;
    session.sessionApprovals.add(tool);
  }

  /**
   * Store a pending permission request (holds the HTTP response).
   * @param {string} id - Session ID
   * @param {object} opts
   * @param {string} opts.tool - Tool name
   * @param {object} opts.body - Original hook body
   * @param {Function} opts.resolve - Callback: (responseObj) => void  — writes HTTP response
   */
  setPendingPermission(id, { tool, hookEvent, body, resolve }) {
    let session = this._sessions.get(id);
    if (!session) session = this.registerSession(id);

    // If there's already a pending permission, auto-allow it
    if (session.pendingPermission) {
      this._resolvePermissionCallback(session, "allow", "superseded by new request");
    }

    // No timeout — permission waits indefinitely until the user decides
    session.pendingPermission = { tool, hookEvent, body, resolve };
    session.status = "permission";

    this.emit("permission:pending", { sessionId: id, tool, body });
  }

  /**
   * Resolve a pending permission and send the HTTP response.
   * @param {string} id - Session ID
   * @param {string} decision - "allow" or "deny"
   * @param {string} [reason] - Reason for denial
   */
  resolvePendingPermission(id, decision, reason) {
    const session = this._sessions.get(id);
    if (!session || !session.pendingPermission) return false;

    this._resolvePermissionCallback(session, decision, reason);
    this.emit("permission:resolved", { sessionId: id, decision, reason });
    return true;
  }

  _resolvePermissionCallback(session, decision, reason) {
    const pending = session.pendingPermission;
    if (!pending) return;

    // PermissionRequest hook uses a different response format than PreToolUse
    const hookEvent = pending.hookEvent || "PreToolUse";
    let response;
    if (hookEvent === "PermissionRequest") {
      response = {
        hookSpecificOutput: {
          hookEventName: "PermissionRequest",
          decision: {
            behavior: decision === "allow" ? "allow" : "deny",
            message: reason || "",
          },
        },
      };
    } else {
      response = {
        hookSpecificOutput: {
          hookEventName: "PreToolUse",
          permissionDecision: decision,
          permissionDecisionReason: reason || "",
        },
      };
    }

    try {
      pending.resolve(response);
    } catch (err) {
      // Response may have already been sent (e.g. client disconnected)
    }

    session.pendingPermission = null;
    session.status = "active";
  }

  // ── Question management (stop hooks) ───────────────────────

  /**
   * Store a pending question (holds the HTTP response for a stop hook).
   */
  setPendingQuestion(id, { message, resolve }) {
    let session = this._sessions.get(id);
    if (!session) session = this.registerSession(id);

    if (session.pendingQuestion) {
      this._resolveQuestionCallback(session);
    }

    const timeout = setTimeout(() => {
      if (session.pendingQuestion) {
        this._resolveQuestionCallback(session);
        this.emit("question:timeout", { sessionId: id });
      }
    }, this._responseTimeoutMs);
    if (timeout.unref) timeout.unref();

    session.pendingQuestion = { message, resolve, timeout };
    session.status = "waiting";

    this.emit("question:pending", { sessionId: id, message });
  }

  /**
   * Resolve a pending question (acknowledge, release HTTP response).
   * @param {string} id - Session ID
   * @param {string} [answer] - The user's answer (e.g. "yes", "no", "continue", "skip")
   */
  resolveQuestion(id, answer) {
    const session = this._sessions.get(id);
    if (!session || !session.pendingQuestion) return false;

    this._resolveQuestionCallback(session, answer);
    this.emit("question:resolved", { sessionId: id, answer });
    return true;
  }

  _resolveQuestionCallback(session, answer) {
    const pending = session.pendingQuestion;
    if (!pending) return;

    clearTimeout(pending.timeout);

    const response = { status: "ok" };
    if (answer) {
      response.answer = answer;
    }

    try {
      pending.resolve(response);
    } catch (err) {
      // Response may have already been sent
    }

    session.pendingQuestion = null;
    session.status = "active";
  }

  // ── Convenience queries ────────────────────────────────────

  /**
   * Get sessions that need attention (pending permission or question).
   */
  getAttentionSessions() {
    return this.getAllSessions().filter(
      (s) => s.pendingPermission || s.pendingQuestion
    );
  }

  /**
   * Check if any session needs attention.
   */
  get hasAttentionNeeded() {
    for (const session of this._sessions.values()) {
      if (session.pendingPermission || session.pendingQuestion) return true;
    }
    return false;
  }

  // ── Cleanup ────────────────────────────────────────────────

  _cleanupStale() {
    const now = Date.now();
    for (const [id, session] of this._sessions) {
      // Never mark sessions stale while a permission or question is pending
      if (session.pendingPermission || session.pendingQuestion) continue;

      if (
        session.status !== "stale" &&
        now - session.lastEventTime > this._staleThresholdMs
      ) {
        session.status = "stale";
        this.emit("session:stale", { sessionId: id });
      }
    }
  }

  destroy() {
    clearInterval(this._cleanupTimer);
    // Resolve all pending callbacks
    for (const session of this._sessions.values()) {
      if (session.pendingPermission) {
        this._resolvePermissionCallback(session, "allow", "shutdown");
      }
      if (session.pendingQuestion) {
        this._resolveQuestionCallback(session);
      }
    }
    this._sessions.clear();
    this.removeAllListeners();
  }
}

module.exports = SessionTracker;
