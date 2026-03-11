const { EventEmitter } = require("events");
const { getAction, getLayout } = require("./actions");
const ButtonRenderer = require("./ButtonRenderer");

/**
 * Connects the bridge server to Stream Deck action logic.
 * Handles incoming commands from the WebSocket client (Stream Deck plugin),
 * dispatches them to the ClaudeCodeController, and updates button visuals.
 */
class StreamDeckAdapter extends EventEmitter {
  constructor(bridge, controller, options = {}) {
    super();
    this.bridge = bridge;
    this.controller = controller;
    this.renderer = new ButtonRenderer(options.renderer);
    this.layout = getLayout(options.deckSize || "standard");
    this._buttonStates = {};
    this._customPrompts = options.customPrompts || {};

    this._initButtonStates();
    this._bindBridgeCommands();
    this._bindControllerEvents();
  }

  /**
   * Initialize all buttons to their default states.
   */
  _initButtonStates() {
    for (const [keyIndex, actionId] of Object.entries(this.layout.mapping)) {
      if (!actionId) continue;
      const action = getAction(actionId);
      if (action) {
        this._buttonStates[actionId] = { ...action.defaultState };
      }
    }
  }

  /**
   * Handle commands from the Stream Deck plugin via WebSocket.
   */
  _bindBridgeCommands() {
    this.bridge.on("command", async (msg) => {
      try {
        switch (msg.action) {
          case "keyDown":
            await this._handleKeyDown(msg.keyIndex);
            break;
          case "keyUp":
            this._handleKeyUp(msg.keyIndex);
            break;
          case "sendPrompt":
            await this._handleSendPrompt(msg.prompt, msg.options);
            break;
          case "abort":
            this._handleAbort();
            break;
          case "resetSession":
            this._handleResetSession();
            break;
          case "getStatus":
            this._handleGetStatus();
            break;
          case "getLayout":
            this._sendLayout();
            break;
          case "setCustomPrompt":
            this._customPrompts[msg.buttonId] = msg.prompt;
            break;
          default:
            this.bridge.broadcast("error", {
              error: `Unknown action: ${msg.action}`,
            });
        }
      } catch (err) {
        this.bridge.broadcast("error", { error: err.message });
      }
    });
  }

  /**
   * Update buttons when Claude Code status changes.
   */
  _bindControllerEvents() {
    this.controller.on("status:change", ({ current }) => {
      const statusAction = getAction("status");
      if (statusAction && statusAction.states[current]) {
        this._updateButton("status", statusAction.states[current]);
      }
    });

    this.controller.on("prompt:sent", ({ prompt }) => {
      this._updateButton("status", {
        label: "RUNNING",
        color: "#00cc66",
        icon: "pulse",
        sublabel: prompt.substring(0, 12) + "...",
      });
    });

    this.controller.on("prompt:response", (result) => {
      this._updateButton("status", {
        label: "DONE",
        color: "#4488ff",
        icon: "check",
      });

      // Auto-reset to IDLE after 3 seconds
      setTimeout(() => {
        this._updateButton("status", {
          label: "IDLE",
          color: "#4488ff",
          icon: "circle",
        });
      }, 3000);
    });

    this.controller.on("prompt:error", ({ error }) => {
      this._updateButton("status", {
        label: "ERROR",
        color: "#cc0000",
        icon: "alert",
        sublabel: error.substring(0, 15),
      });
    });
  }

  async _handleKeyDown(keyIndex) {
    const actionId = this.layout.mapping[keyIndex];
    if (!actionId) return;

    const action = getAction(actionId);
    if (!action) return;

    // Flash the button
    this._updateButton(actionId, {
      ...this._buttonStates[actionId],
      color: "#ffffff",
    });
    setTimeout(() => {
      this._updateButton(actionId, this._buttonStates[actionId]);
    }, 150);

    switch (action.handler) {
      case "sendPrompt": {
        const prompt =
          actionId === "customPrompt"
            ? this._customPrompts.customPrompt || action.payload.prompt
            : action.payload.prompt;

        if (!prompt) {
          this.bridge.broadcast("error", {
            error: "No prompt configured for this button",
          });
          return;
        }

        await this.controller.send(prompt, {
          allowedTools: action.payload?.allowedTools,
        });
        break;
      }
      case "abort":
        this._handleAbort();
        break;
      case "resetSession":
        this._handleResetSession();
        break;
      case "getStatus":
        this._handleGetStatus();
        break;
    }

    this.emit("keyDown", { keyIndex, actionId });
  }

  _handleKeyUp(keyIndex) {
    this.emit("keyUp", { keyIndex });
  }

  async _handleSendPrompt(prompt, options = {}) {
    return this.controller.send(prompt, options);
  }

  _handleAbort() {
    const aborted = this.controller.abort();
    if (aborted) {
      this._updateButton("status", {
        label: "ABORTED",
        color: "#ff6600",
        icon: "stop",
      });
      setTimeout(() => {
        this._updateButton("status", {
          label: "IDLE",
          color: "#4488ff",
          icon: "circle",
        });
      }, 2000);
    }
  }

  _handleResetSession() {
    this.controller.resetSession();
    this._updateButton("status", {
      label: "NEW",
      color: "#ffffff",
      icon: "plus",
    });
    setTimeout(() => {
      this._updateButton("status", {
        label: "IDLE",
        color: "#4488ff",
        icon: "circle",
      });
    }, 1500);
  }

  _handleGetStatus() {
    const status = this.controller.getStatus();
    this.bridge.broadcast("status:response", status);
  }

  _sendLayout() {
    const rendered = this.renderer.renderLayout(
      this.layout,
      this._buttonStates
    );
    this.bridge.broadcast("layout:sync", {
      layout: this.layout,
      buttons: rendered,
    });
  }

  _updateButton(actionId, state) {
    this._buttonStates[actionId] = state;
    const svg = this.renderer.render(state);
    this.bridge.updateButton(actionId, state);
    this.bridge.broadcast("button:render", {
      buttonId: actionId,
      state,
      svg,
    });
  }
}

module.exports = StreamDeckAdapter;
