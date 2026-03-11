const { EventEmitter } = require("events");

/**
 * Receives HTTP hook callbacks from Claude Code and translates them
 * into events that update Stream Deck button states.
 *
 * Claude Code hooks POST JSON to our bridge server. This module
 * registers the routes and emits normalized events.
 *
 * Supported Claude Code hook events:
 *   - Notification: Claude needs user attention
 *   - Stop: Claude finished responding
 *   - PreToolUse: Claude is about to use a tool
 *   - PostToolUse: Claude finished using a tool
 *   - UserPromptSubmit: User sent a prompt
 *   - PermissionRequest: Claude needs permission
 */
class HookReceiver extends EventEmitter {
  constructor(bridgeServer) {
    super();
    this.bridge = bridgeServer;
    this._registerRoutes();
  }

  _registerRoutes() {
    // Each Claude Code hook event gets its own endpoint
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

    // Catch-all for any hook event
    this.bridge.route("POST", "/hooks", (req, res, body) => {
      const eventType = body?.event || "unknown";
      this._handleHook(eventType, body, res);
    });
  }

  _handleHook(event, body, res) {
    const normalized = this._normalize(event, body);
    this.emit("hook", normalized);
    this.emit(`hook:${event}`, normalized);

    // Update bridge state based on event
    this._updateBridgeState(event, normalized);

    // Respond to Claude Code
    // Exit code 0 = allow (continue), exit code 2 = block
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
        break;

      case "stop":
        this.bridge.updateState({
          claudeStatus: "idle",
          lastEvent: event,
        });
        this.bridge.updateButton("status", {
          label: "IDLE",
          color: "#4488ff",
        });
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
        break;
    }
  }
}

module.exports = HookReceiver;
