const { EventEmitter } = require("events");

/**
 * Receives HTTP hook callbacks from Claude Code and translates them
 * into events that update Stream Deck button states.
 *
 * When a SessionTracker is provided, permission requests (pre-tool-use)
 * and questions (stop) can be "held" — the HTTP response is not sent
 * immediately, allowing the user to approve/deny from the Stream Deck.
 *
 * Without a SessionTracker, behaves exactly as before: immediate
 * responses and a single respondAlert for attention-needed events.
 */
class HookReceiver extends EventEmitter {
  constructor(bridgeServer, options = {}) {
    super();
    this.bridge = bridgeServer;
    this.adapter = options.adapter || null;
    this.sessionTracker = options.sessionTracker || null;
    this._registerRoutes();
  }

  /**
   * Connect to a StreamDeckAdapter (can be set after construction).
   */
  setAdapter(adapter) {
    this.adapter = adapter;
  }

  _registerRoutes() {
    const hookEvents = [
      "notification",
      "stop",
      "pre-tool-use",
      "post-tool-use",
      "prompt-submit",
      "permission-request",
      "session-start",
      "session-end",
    ];

    for (const event of hookEvents) {
      this.bridge.route("POST", `/hooks/${event}`, (req, res, body) => {
        this._handleHook(event, body, res);
      });
    }

    this.bridge.route("POST", "/hooks", (req, res, body) => {
      const eventType = body?.event || "unknown";
      this._handleHook(eventType, body, res);
    });

    // Statusline endpoint — receives context_window data from statusline script
    this.bridge.route("POST", "/hooks/statusline", (req, res, body) => {
      if (this.adapter?.infobarManager) {
        // Accept both wrapped { context_window: ... } and raw statusline JSON
        const cw = body?.context_window || body;
        if (cw) {
          this.adapter.infobarManager.updateContext(
            cw.tokens_used || cw.tokensUsed || 0,
            cw.max_tokens || cw.maxTokens || undefined
          );
        }
      }
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ status: "ok" }));
    });
  }

  _handleHook(event, body, res) {
    const normalized = this._normalize(event, body);
    this.emit("hook", normalized);
    this.emit(`hook:${event}`, normalized);

    // Forward context window data if present
    this._updateContextFromHook(normalized);

    // If we have a SessionTracker, use multi-session logic
    if (this.sessionTracker) {
      return this._handleWithSessionTracker(event, normalized, res);
    }

    // Legacy single-session mode
    this._updateBridgeState(event, normalized);
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok" }));
  }

  _normalize(event, body) {
    return {
      event,
      timestamp: Date.now(),
      sessionId: body?.session_id || null,
      tool: body?.tool_name || body?.tool || null,
      message: body?.message || body?.notification || null,
      cwd: body?.cwd || null,
      contextWindow: body?.context_window || null,
      // Context window usage (when provided by Claude Code hooks)
      tokensUsed: body?.tokens_used || body?.context_tokens || null,
      maxTokens: body?.max_tokens || body?.context_max || null,
      raw: body,
    };
  }

  /**
   * Extract and forward context window data to the adapter's InfobarManager.
   * Claude Code hooks may include token counts in various fields.
   */
  _updateContextFromHook(data) {
    if (!this.adapter?.infobarManager) return;
    if (data.tokensUsed != null) {
      this.adapter.infobarManager.updateContext(
        data.tokensUsed,
        data.maxTokens || undefined
      );
    }
  }

  // ── Multi-session mode (with SessionTracker) ───────────────

  _handleWithSessionTracker(event, data, res) {
    const sessionId = data.sessionId;

    switch (event) {
      case "session-start":
        if (sessionId) {
          this.sessionTracker.registerSession(sessionId);
          this.sessionTracker.updateStatus(sessionId, event, { cwd: data.cwd });
        }
        this._respondOk(res);
        break;

      case "session-end":
        if (sessionId) {
          this.sessionTracker.updateStatus(sessionId, event, { cwd: data.cwd });
          this.sessionTracker.removeSession(sessionId);
        }
        this._respondOk(res);
        break;

      case "pre-tool-use": {
        // Pass through to Claude's normal permission UI.
        // If the tool was session-approved on the deck, auto-allow.
        // Otherwise respond "ask" so Claude shows the permission dialog
        // in the terminal — the user can then decide from the deck
        // via the PermissionRequest hook.
        if (sessionId) {
          const tool = data.tool;
          if (this.sessionTracker.hasSessionApproval(sessionId, tool)) {
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({
              hookSpecificOutput: {
                hookEventName: "PreToolUse",
                permissionDecision: "allow",
                permissionDecisionReason: "session approval",
              },
            }));
            this.sessionTracker.updateStatus(sessionId, event, { tool, cwd: data.cwd });
            break;
          }
          this.sessionTracker.updateStatus(sessionId, event, { tool, cwd: data.cwd });
        }
        this._updateBridgeState(event, data);
        this._respondOk(res);
        break;
      }

      case "permission-request": {
        // Claude is showing the permission dialog in the terminal.
        // Hold the HTTP response so the user can approve/deny from the deck.
        if (!sessionId) {
          this._updateBridgeState(event, data);
          this._respondOk(res);
          break;
        }

        const tool = data.tool;
        this.sessionTracker.updateStatus(sessionId, event, { tool, cwd: data.cwd });
        this.sessionTracker.setPendingPermission(sessionId, {
          tool,
          hookEvent: "PermissionRequest",
          body: data.raw,
          resolve: (response) => {
            try {
              res.writeHead(200, { "Content-Type": "application/json" });
              res.end(JSON.stringify(response));
            } catch {
              // Client may have disconnected
            }
          },
        });
        this._updateBridgeState(event, data);
        break;
      }

      case "stop": {
        if (!sessionId) {
          this._updateBridgeState(event, data);
          this._respondOk(res);
          break;
        }

        this.sessionTracker.updateStatus(sessionId, event, { cwd: data.cwd });

        // Only hold the HTTP response if the stop hook is active
        // (Claude is blocked waiting for user input, not just finishing normally)
        if (data.raw?.stop_hook_active) {
          this.sessionTracker.setPendingQuestion(sessionId, {
            message: data.message,
            resolve: (response) => {
              try {
                res.writeHead(200, { "Content-Type": "application/json" });
                res.end(JSON.stringify(response));
              } catch {
                // Client may have disconnected
              }
            },
          });
        } else {
          this._updateBridgeState(event, data);
          this._respondOk(res);
        }
        break;
      }

      case "prompt-submit":
        if (sessionId) {
          // User responded in terminal — resolve any pending question
          this.sessionTracker.resolveQuestion(sessionId);
          this.sessionTracker.updateStatus(sessionId, event, { cwd: data.cwd });
        }
        this._respondOk(res);
        break;

      case "notification":
        if (sessionId) {
          this.sessionTracker.updateStatus(sessionId, event, {
            message: data.message,
            cwd: data.cwd,
          });
        }
        // Also update bridge state for backward compat
        this._updateBridgeState(event, data);
        this._respondOk(res);
        break;

      default:
        // post-tool-use, etc.
        if (sessionId) {
          this.sessionTracker.updateStatus(sessionId, event, {
            tool: data.tool,
            cwd: data.cwd,
          });
        }
        this._updateBridgeState(event, data);
        this._respondOk(res);
        break;
    }
  }

  _respondOk(res) {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok" }));
  }

  // ── Legacy single-session bridge state updates ─────────────

  _updateBridgeState(event, data) {
    switch (event) {
      case "session-start":
        this.bridge.updateState({
          claudeStatus: "active",
          lastEvent: event,
        });
        this.bridge.updateButton("status", {
          label: "ACTIVE",
          color: "#00cc66",
        });
        // Session start means Claude is working — clear any stale alert
        if (this.adapter) {
          this.adapter.dismissRespondAlert();
        }
        break;

      case "stop": {
        // Claude finished — only alert if stop_hook_active
        // (meaning Claude is blocked waiting for user input, not just done talking)
        const stopActive = !!data.raw?.stop_hook_active;
        this.bridge.updateState({
          claudeStatus: stopActive ? "waiting" : "idle",
          lastEvent: event,
        });
        if (stopActive) {
          this.bridge.updateButton("status", {
            label: "WAITING",
            color: "#ffcc00",
          });
          if (this.adapter) {
            this.adapter.triggerRespondAlert("stop", "Your turn");
          }
        } else {
          this.bridge.updateButton("status", {
            label: "IDLE",
            color: "#4488ff",
            icon: "circle",
          });
        }
        break;
      }

      case "notification": {
        // Only alert for notification types that require user input
        const notificationType = data.raw?.notification_type;
        const needsInput = !notificationType ||
          notificationType === "permission_prompt" ||
          notificationType === "idle_prompt" ||
          notificationType === "elicitation_dialog";

        this.bridge.updateState({
          claudeStatus: needsInput ? "waiting" : "active",
          lastEvent: event,
        });

        if (needsInput) {
          this.bridge.updateButton("status", {
            label: "ATTENTION",
            color: "#ffcc00",
          });
          if (this.adapter) {
            this.adapter.triggerRespondAlert(
              "notification",
              data.message ? data.message.substring(0, 15) : "Needs input"
            );
          }
        }
        break;
      }

      case "permission-request":
        this.bridge.updateState({
          claudeStatus: "permission",
          lastEvent: event,
        });
        this.bridge.updateButton("status", {
          label: "PERMIT?",
          color: "#ff6600",
        });
        // BLINK: Claude needs permission approval
        if (this.adapter) {
          this.adapter.triggerRespondAlert(
            "permission",
            data.tool ? `Allow ${data.tool}?` : "Permission needed"
          );
        }
        break;

      case "prompt-submit":
        // User just submitted a prompt — they responded, clear alert
        if (this.adapter) {
          this.adapter.dismissRespondAlert();
        }
        break;

      case "pre-tool-use":
        this.bridge.updateButton("tool", {
          label: data.tool || "TOOL",
          color: "#9966ff",
        });
        break;

      case "post-tool-use":
        this.bridge.updateButton("tool", {
          label: "DONE",
          color: "#666666",
        });
        break;

      case "session-end":
        this.bridge.updateState({
          claudeStatus: "offline",
          lastEvent: event,
        });
        this.bridge.updateButton("status", {
          label: "OFFLINE",
          color: "#333333",
        });
        // Session ended — clear alert
        if (this.adapter) {
          this.adapter.dismissRespondAlert();
        }
        break;
    }
  }
}

module.exports = HookReceiver;
