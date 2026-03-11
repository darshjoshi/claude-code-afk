const { EventEmitter } = require("events");

/**
 * Receives HTTP hook callbacks from Claude Code and translates them
 * into events that update Stream Deck button states.
 *
 * When Claude needs the user's attention (notification, permission
 * request, or stop/waiting), this triggers a blinking red RESPOND
 * alert on the Stream Deck via the adapter's AlertManager.
 *
 * The alert clears automatically when:
 *   - The user presses the RESPOND button
 *   - The user sends a new prompt
 *   - Claude resumes working (prompt-submit hook)
 *   - A new session starts
 */
class HookReceiver extends EventEmitter {
  constructor(bridgeServer, options = {}) {
    super();
    this.bridge = bridgeServer;
    this.adapter = options.adapter || null;
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
  }

  _handleHook(event, body, res) {
    const normalized = this._normalize(event, body);
    this.emit("hook", normalized);
    this.emit(`hook:${event}`, normalized);

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
      raw: body,
    };
  }

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

      case "stop":
        // Claude stopped and is waiting for you to respond!
        this.bridge.updateState({
          claudeStatus: "waiting",
          lastEvent: event,
        });
        this.bridge.updateButton("status", {
          label: "WAITING",
          color: "#ffcc00",
        });
        // BLINK: Claude finished — your turn to respond
        if (this.adapter) {
          this.adapter.triggerRespondAlert("stop", "Your turn");
        }
        break;

      case "notification":
        this.bridge.updateState({
          claudeStatus: "waiting",
          lastEvent: event,
        });
        this.bridge.updateButton("status", {
          label: "ATTENTION",
          color: "#ffcc00",
        });
        // BLINK: Claude is asking for your attention
        if (this.adapter) {
          this.adapter.triggerRespondAlert(
            "notification",
            data.message ? data.message.substring(0, 15) : "Needs input"
          );
        }
        break;

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
