const { EventEmitter } = require("events");
const { getAction, getLayout } = require("./actions");

/**
 * Manages "views" (pages) on the Stream Deck.
 *
 * Four views:
 *   1. default   — The original layout (prompts, git, etc.) + a SESSIONS nav button
 *   2. sessions  — Grid of active sessions as buttons, each showing live status
 *   3. permission — ALLOW / ALLOW SESSION / DENY buttons for a focused session
 *   4. question  — Question text + FOCUS TERMINAL for a focused session
 *
 * Each view dynamically computes which action goes on which key, so the
 * StreamDeckAdapter can just ask "what does key 5 do right now?"
 */
class LayoutManager extends EventEmitter {
  constructor(options = {}) {
    super();
    this._baseLayout = options.layout || getLayout(options.deckSize || "standard");
    this._device = options.device || { keys: 15, cols: 5 };
    this._currentView = "default";
    this._focusedSessionId = null;
    this._sessionPage = 0;
    this._sessions = [];

    // Cache computed key mappings for the current view
    this._currentKeyMap = {};
    this._recompute();
  }

  /**
   * Get the current view name.
   */
  get currentView() {
    return this._currentView;
  }

  /**
   * Get the session currently focused (for permission/question views).
   */
  get focusedSessionId() {
    return this._focusedSessionId;
  }

  /**
   * Switch to a different view.
   */
  switchView(name, { sessionId } = {}) {
    this._currentView = name;
    this._focusedSessionId = sessionId || null;
    if (name === "sessions") {
      // Keep current page unless out of range
    } else if (name === "default") {
      this._sessionPage = 0;
    }
    this._recompute();
    this.emit("view:changed", { view: name, sessionId: this._focusedSessionId });
  }

  /**
   * Update the list of active sessions (call when sessions change).
   */
  updateSessions(sessions) {
    this._sessions = sessions;
    if (this._currentView === "sessions") {
      this._recompute();
    }
  }

  /**
   * Get what action a key press should trigger in the current view.
   * Returns { actionId, sessionId, meta } or null.
   */
  getActionContext(keyIndex) {
    return this._currentKeyMap[keyIndex] || null;
  }

  /**
   * Get the full current layout (for rendering all buttons).
   */
  getCurrentLayout() {
    return {
      view: this._currentView,
      keys: this._currentKeyMap,
      dials: this._baseLayout.dials || {},
      pedals: this._baseLayout.pedals || {},
    };
  }

  /**
   * Get the base layout (original default layout).
   */
  getBaseLayout() {
    return this._baseLayout;
  }

  // ── Pagination ─────────────────────────────────────────────

  nextPage() {
    this._sessionPage++;
    this._recompute();
  }

  prevPage() {
    if (this._sessionPage > 0) {
      this._sessionPage--;
      this._recompute();
    }
  }

  // ── Internal layout computation ────────────────────────────

  _recompute() {
    switch (this._currentView) {
      case "default":
        this._computeDefault();
        break;
      case "sessions":
        this._computeSessionGrid();
        break;
      case "permission":
        this._computePermissionView();
        break;
      case "question":
        this._computeQuestionView();
        break;
      default:
        this._computeDefault();
    }
  }

  _computeDefault() {
    const map = {};
    if (this._baseLayout.keys) {
      for (const [idx, actionId] of Object.entries(this._baseLayout.keys)) {
        if (actionId) {
          map[idx] = { actionId, sessionId: null, meta: null };
        }
      }
    }

    // Replace one key with SESSIONS nav if there are active sessions
    // Use the last key position
    const totalKeys = this._device.keys || 15;
    if (this._sessions.length > 0) {
      map[totalKeys - 1] = { actionId: "sessionsView", sessionId: null, meta: null };
    }

    this._currentKeyMap = map;
  }

  _computeSessionGrid() {
    const map = {};
    const totalKeys = this._device.keys || 15;

    // Reserve last key for BACK
    const backKeyIdx = totalKeys - 1;
    map[backKeyIdx] = { actionId: "backButton", sessionId: null, meta: null };

    // Sort sessions: attention-needing first
    const sorted = [...this._sessions].sort((a, b) => {
      const aNeeds = a.pendingPermission || a.pendingQuestion ? 1 : 0;
      const bNeeds = b.pendingPermission || b.pendingQuestion ? 1 : 0;
      return bNeeds - aNeeds;
    });

    let availableKeys = totalKeys - 1; // minus BACK
    const needsPagination = sorted.length > availableKeys;

    if (needsPagination) {
      // Reserve 2 more keys for PREV/NEXT
      const prevIdx = totalKeys - 3;
      const nextIdx = totalKeys - 2;
      map[prevIdx] = { actionId: "prevPage", sessionId: null, meta: null };
      map[nextIdx] = { actionId: "nextPage", sessionId: null, meta: null };
      availableKeys -= 2;
    }

    // Paginate sessions
    const pageStart = this._sessionPage * availableKeys;
    const pageSessions = sorted.slice(pageStart, pageStart + availableKeys);

    // Clamp page
    if (pageSessions.length === 0 && this._sessionPage > 0) {
      this._sessionPage = Math.max(0, Math.ceil(sorted.length / availableKeys) - 1);
      return this._computeSessionGrid();
    }

    for (let i = 0; i < pageSessions.length; i++) {
      map[i] = {
        actionId: "sessionButton",
        sessionId: pageSessions[i].sessionId,
        meta: { session: pageSessions[i] },
      };
    }

    this._currentKeyMap = map;
  }

  _computePermissionView() {
    const map = {};
    const totalKeys = this._device.keys || 15;

    // Key 0: permission info (display only — shows tool name)
    map[0] = {
      actionId: "permissionInfo",
      sessionId: this._focusedSessionId,
      meta: null,
    };

    // Key 1: ALLOW
    map[1] = {
      actionId: "allowTool",
      sessionId: this._focusedSessionId,
      meta: { decision: "allow" },
    };

    // Key 2: ALLOW SESSION
    map[2] = {
      actionId: "allowToolSession",
      sessionId: this._focusedSessionId,
      meta: { decision: "allowSession" },
    };

    // Key 3: DENY
    map[3] = {
      actionId: "denyTool",
      sessionId: this._focusedSessionId,
      meta: { decision: "deny" },
    };

    // Key 4: FOCUS TERMINAL
    map[4] = {
      actionId: "focusTerminal",
      sessionId: this._focusedSessionId,
      meta: null,
    };

    // Last key: BACK
    map[totalKeys - 1] = {
      actionId: "backButton",
      sessionId: this._focusedSessionId,
      meta: null,
    };

    this._currentKeyMap = map;
  }

  _computeQuestionView() {
    const map = {};
    const totalKeys = this._device.keys || 15;

    // Key 0: question info (display only — shows question text)
    map[0] = {
      actionId: "permissionInfo",
      sessionId: this._focusedSessionId,
      meta: { isQuestion: true },
    };

    // Key 1: FOCUS TERMINAL
    map[1] = {
      actionId: "focusTerminal",
      sessionId: this._focusedSessionId,
      meta: null,
    };

    // Last key: BACK
    map[totalKeys - 1] = {
      actionId: "backButton",
      sessionId: this._focusedSessionId,
      meta: null,
    };

    this._currentKeyMap = map;
  }
}

module.exports = LayoutManager;
