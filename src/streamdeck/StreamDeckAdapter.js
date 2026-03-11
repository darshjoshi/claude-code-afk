const { EventEmitter } = require("events");
const { getAction, getLayout } = require("./actions");
const ButtonRenderer = require("./ButtonRenderer");
const AlertManager = require("./AlertManager");

/**
 * Connects the bridge server to Stream Deck action logic.
 * Handles incoming commands from the WebSocket client (Stream Deck plugin),
 * dispatches them to the ClaudeCodeController, and updates button visuals.
 *
 * Supports all input types: keys, dials (rotate/press), pedals, and touch.
 * Includes a blinking red alert system for when Claude needs your response.
 */
class StreamDeckAdapter extends EventEmitter {
  constructor(bridge, controller, options = {}) {
    super();
    this.bridge = bridge;
    this.controller = controller;
    this.renderer = new ButtonRenderer(options.renderer);
    this.layout = options.layout || getLayout(options.deckSize || "standard");
    this._buttonStates = {};
    this._dialValues = {};
    this._customPrompts = options.customPrompts || {};
    this._customActions = options.customActions || {};
    this.alertManager = new AlertManager({
      blinkIntervalMs: options.blinkIntervalMs || 500,
    });

    this._initButtonStates();
    this._bindBridgeCommands();
    this._bindControllerEvents();
    this._bindAlertManager();
  }

  /**
   * Initialize all inputs to their default states.
   */
  _initButtonStates() {
    // Keys
    if (this.layout.keys) {
      for (const [, actionId] of Object.entries(this.layout.keys)) {
        if (!actionId) continue;
        const action = this._resolveAction(actionId);
        if (action) {
          this._buttonStates[actionId] = { ...action.defaultState };
        }
      }
    }
    // Dials
    if (this.layout.dials) {
      for (const [, actionId] of Object.entries(this.layout.dials)) {
        if (!actionId) continue;
        const action = this._resolveAction(actionId);
        if (action) {
          this._buttonStates[actionId] = { ...action.defaultState };
          this._dialValues[actionId] = action.min || 0;
        }
      }
    }
    // Pedals
    if (this.layout.pedals) {
      for (const [, actionId] of Object.entries(this.layout.pedals)) {
        if (!actionId) continue;
        const action = this._resolveAction(actionId);
        if (action) {
          this._buttonStates[actionId] = { ...action.defaultState };
        }
      }
    }
  }

  /**
   * Resolve action by ID, checking custom actions first.
   */
  _resolveAction(actionId) {
    return this._customActions[actionId] || getAction(actionId);
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
          case "dialRotate":
            this._handleDialRotate(msg.dialIndex, msg.ticks);
            break;
          case "dialPress":
            await this._handleDialPress(msg.dialIndex);
            break;
          case "pedalDown":
            await this._handlePedalDown(msg.pedalIndex);
            break;
          case "pedalUp":
            this._handlePedalUp(msg.pedalIndex);
            break;
          case "touchTap":
            this._handleTouchTap(msg.position);
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
          case "dismissAlert":
            this._handleDismissAlert(msg.buttonId);
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
      const statusAction = this._resolveAction("status");
      if (statusAction && statusAction.states && statusAction.states[current]) {
        this._updateButton("status", statusAction.states[current]);
      }
    });

    this.controller.on("prompt:sent", ({ prompt }) => {
      // User responded — clear any active alert
      this.alertManager.clearAlert("respondAlert");
      this._resetRespondButton();

      this._updateButton("status", {
        label: "RUNNING",
        color: "#00cc66",
        icon: "pulse",
        sublabel: prompt.substring(0, 12) + "...",
      });
    });

    this.controller.on("prompt:response", () => {
      this._updateButton("status", {
        label: "DONE",
        color: "#4488ff",
        icon: "check",
      });
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

  /**
   * Wire up the AlertManager to push blink frames to Stream Deck buttons.
   */
  _bindAlertManager() {
    this.alertManager.on("blink", ({ buttonId, state }) => {
      // Push the blink frame directly — don't save to _buttonStates
      // so that when the alert clears, we can restore the default state
      const svg = this.renderer.render(state);
      this.bridge.updateButton(buttonId, state);
      this.bridge.broadcast("button:render", {
        buttonId,
        state,
        svg,
      });
    });

    this.alertManager.on("alert:start", ({ buttonId, reason }) => {
      this.bridge.broadcast("alert:start", { buttonId, reason });
      this.emit("alert:start", { buttonId, reason });
    });

    this.alertManager.on("alert:clear", ({ buttonId, reason, duration }) => {
      this.bridge.broadcast("alert:clear", { buttonId, reason, duration });
      this.emit("alert:clear", { buttonId, reason, duration });
    });
  }

  /**
   * Trigger the blinking red RESPOND alert.
   * Called by the HookReceiver when Claude needs user attention.
   */
  triggerRespondAlert(reason, sublabel) {
    const action = this._resolveAction("respondAlert");
    const alertConfig = action?.alertState || {};

    this.alertManager.startAlert("respondAlert", {
      reason,
      label: alertConfig.label || "RESPOND",
      sublabel: sublabel || reason || "",
      onColor: alertConfig.onColor || "#cc0000",
      offColor: alertConfig.offColor || "#330000",
      icon: alertConfig.icon || "alert",
    });
  }

  /**
   * Clear the RESPOND alert and restore the button to its quiet state.
   */
  dismissRespondAlert() {
    this.alertManager.clearAlert("respondAlert");
    this._resetRespondButton();
  }

  _resetRespondButton() {
    const action = this._resolveAction("respondAlert");
    if (action) {
      this._updateButton("respondAlert", { ...action.defaultState });
    }
  }

  // ── Key handling ──────────────────────────────────────────

  async _handleKeyDown(keyIndex) {
    const actionId = this.layout.keys && this.layout.keys[keyIndex];
    if (!actionId) return;

    const action = this._resolveAction(actionId);
    if (!action) return;

    // Flash the button (skip if it's currently alerting)
    if (!this.alertManager.isAlerting(actionId)) {
      this._updateButton(actionId, {
        ...this._buttonStates[actionId],
        color: "#ffffff",
      });
      setTimeout(() => {
        this._updateButton(actionId, this._buttonStates[actionId]);
      }, 150);
    }

    await this._executeAction(action, actionId);
    this.emit("keyDown", { keyIndex, actionId });
  }

  _handleKeyUp(keyIndex) {
    this.emit("keyUp", { keyIndex });
  }

  // ── Dial handling ─────────────────────────────────────────

  _handleDialRotate(dialIndex, ticks) {
    const actionId = this.layout.dials && this.layout.dials[dialIndex];
    if (!actionId) return;

    const action = this._resolveAction(actionId);
    if (!action) return;

    const step = action.step || 1;
    const min = action.min || 0;
    const max = action.max || 100;
    const current = this._dialValues[actionId] || min;
    const newValue = Math.max(min, Math.min(max, current + ticks * step));
    this._dialValues[actionId] = newValue;

    this._updateButton(actionId, {
      ...this._buttonStates[actionId],
      sublabel: `${newValue}`,
    });

    this.bridge.broadcast("dial:rotate", {
      dialIndex,
      actionId,
      value: newValue,
      ticks,
    });

    this.emit("dialRotate", { dialIndex, actionId, value: newValue, ticks });
  }

  async _handleDialPress(dialIndex) {
    const actionId = this.layout.dials && this.layout.dials[dialIndex];
    if (!actionId) return;

    const action = this._resolveAction(actionId);
    if (!action) return;

    if (action.onPress === "resetScroll") {
      this._dialValues[actionId] = 0;
      this._updateButton(actionId, {
        ...this._buttonStates[actionId],
        sublabel: "0",
      });
    } else if (action.onPress === "confirmModel") {
      const options = action.options || [];
      const idx = (this._dialValues[actionId] || 0) % options.length;
      const model = options[idx];
      if (model) {
        this.controller.model = model;
        this.bridge.broadcast("model:changed", { model });
      }
    } else if (action.onPress === "resetMaxTurns") {
      this._dialValues[actionId] = action.min || 1;
    } else if (action.onPress === "toggleMute") {
      const muted = !this._buttonStates[actionId]?.muted;
      this._updateButton(actionId, {
        ...this._buttonStates[actionId],
        muted,
        sublabel: muted ? "MUTED" : `${this._dialValues[actionId]}`,
      });
    }

    this.emit("dialPress", { dialIndex, actionId });
  }

  // ── Pedal handling ────────────────────────────────────────

  async _handlePedalDown(pedalIndex) {
    const actionId = this.layout.pedals && this.layout.pedals[pedalIndex];
    if (!actionId) return;

    const action = this._resolveAction(actionId);
    if (!action) return;

    await this._executeAction(action, actionId);
    this.emit("pedalDown", { pedalIndex, actionId });
  }

  _handlePedalUp(pedalIndex) {
    this.emit("pedalUp", { pedalIndex });
  }

  // ── Touch handling ────────────────────────────────────────

  _handleTouchTap(position) {
    this.bridge.broadcast("touch:tap", { position });
    this.emit("touchTap", { position });
  }

  // ── Shared action execution ───────────────────────────────

  async _executeAction(action, actionId) {
    switch (action.handler) {
      case "sendPrompt": {
        const prompt =
          this._customPrompts[actionId] || action.payload?.prompt;

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
      case "acceptPermission":
        this.bridge.broadcast("permission:accept", {});
        break;
      case "pushToTalk":
        this.bridge.broadcast("ptt:start", {});
        break;
      case "dismissAlert":
        this._handleDismissAlert(actionId);
        break;
    }
  }

  _handleDismissAlert(buttonId) {
    const id = buttonId || "respondAlert";
    this.alertManager.clearAlert(id);
    this._resetRespondButton();
    this.bridge.broadcast("alert:dismissed", { buttonId: id });
    this.emit("alert:dismissed", { buttonId: id });
  }

  async _handleSendPrompt(prompt, options = {}) {
    return this.controller.send(prompt, options);
  }

  _handleAbort() {
    // Aborting counts as responding — clear alert
    this.alertManager.clearAlert("respondAlert");
    this._resetRespondButton();

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
    // Resetting clears alert
    this.alertManager.clearAlert("respondAlert");
    this._resetRespondButton();

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
    status.alerting = this.alertManager.hasActiveAlerts;
    status.activeAlerts = this.alertManager.activeAlerts;
    this.bridge.broadcast("status:response", status);
  }

  _sendLayout() {
    const rendered = {};
    if (this.layout.keys) {
      rendered.keys = this.renderer.renderLayout(
        { mapping: this.layout.keys },
        this._buttonStates
      );
    }
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
