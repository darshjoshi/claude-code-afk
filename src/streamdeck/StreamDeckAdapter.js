const { EventEmitter } = require("events");
const { getAction, getLayout } = require("./actions");
const ButtonRenderer = require("./ButtonRenderer");
const AlertManager = require("./AlertManager");
const LayoutManager = require("./LayoutManager");
const InfobarManager = require("./InfobarManager");

/**
 * Connects the bridge server to Stream Deck action logic.
 * Handles incoming commands from the WebSocket client (Stream Deck plugin),
 * dispatches them to session control (via SessionTracker), and updates button visuals.
 *
 * Supports all input types: keys, dials (rotate/press), pedals, and touch.
 * Includes a blinking red alert system for when Claude needs your response.
 *
 * When a SessionTracker is provided, supports multi-session views:
 * session grid, permission approval, and question views.
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
    this.alertManager = new AlertManager({
      blinkIntervalMs: options.blinkIntervalMs || 500,
    });

    // Multi-session support
    this.sessionTracker = options.sessionTracker || null;
    this.terminalFocuser = options.terminalFocuser || null;
    this.layoutManager = null;

    // Infobar + touch point LEDs (Neo and devices with infobar/touch strip)
    this.infobarManager = new InfobarManager(bridge, {
      maxTokens: options.maxTokens || 200000,
      gaugeWidth: options.gaugeWidth || 15,
      ledOverrides: options.ledOverrides || null,
      stateStyleMap: options.stateStyleMap || null,
      sessionColorPalette: options.sessionColorPalette || null,
    });
    this._defaultAnimation = options.defaultAnimation || "blink";

    if (this.sessionTracker) {
      this.layoutManager = new LayoutManager({
        layout: this.layout,
        device: options.device || { keys: 15, cols: 5 },
        deckSize: options.deckSize,
      });
      this._bindSessionEvents();
      this._bindLayoutEvents();
    }

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
   * Resolve action by ID.
   */
  _resolveAction(actionId) {
    return getAction(actionId);
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
          case "dismissAlert":
            this._handleDismissAlert(msg.buttonId);
            break;
          case "updateContext":
            this.infobarManager.updateContext(msg.tokensUsed, msg.maxTokens);
            break;
          case "setTouchPointStyle":
            this.infobarManager.setTouchPointStyle(msg.style);
            break;
          case "setTouchPointLeds":
            this.infobarManager.setLedOverrides(msg.overrides);
            break;
          case "clearTouchPointLeds":
            this.infobarManager.clearLedOverrides();
            break;
          case "startAnimation":
            this.infobarManager.startAnimation(msg.pattern, msg.options || {});
            break;
          case "stopAnimation":
            this.infobarManager.stopAnimation();
            break;
          case "setSessionColor":
            this.infobarManager.setSessionColor(msg.sessionId, msg.color);
            break;
          case "setStateStyle":
            this.infobarManager.setStateStyle(msg.state, msg.style);
            break;
          case "refreshButtons":
            this._refreshAllButtons();
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
   * Update buttons when controller status changes.
   */
  _bindControllerEvents() {
    this.controller.on("status:change", ({ current }) => {
      const statusAction = this._resolveAction("status");
      if (statusAction && statusAction.states && statusAction.states[current]) {
        this._updateButton("status", statusAction.states[current]);
      }
      // Update touch point LEDs to reflect system state
      this.infobarManager.onSystemStateChange(current);
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

      // Resolve keyIndex for plugin routing
      let keyIndex;
      if (this.layoutManager) {
        const layout = this.layoutManager.getCurrentLayout();
        for (const [idx, ctx] of Object.entries(layout.keys)) {
          if (!ctx) continue;
          // Direct match by actionId
          if (ctx.actionId === buttonId) {
            keyIndex = parseInt(idx, 10);
            break;
          }
          // Session alert: buttonId is "session:{id}", layout has actionId "sessionButton"
          if (buttonId.startsWith("session:") && ctx.actionId === "sessionButton" &&
              ctx.meta?.session?.sessionId === buttonId.replace("session:", "")) {
            keyIndex = parseInt(idx, 10);
            break;
          }
        }
      } else if (this.layout && this.layout.keys) {
        for (const [idx, aid] of Object.entries(this.layout.keys)) {
          if (aid === buttonId) {
            keyIndex = parseInt(idx, 10);
            break;
          }
        }
      }

      this.bridge.broadcast("button:render", {
        buttonId,
        keyIndex,
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

  // ── Session events binding ─────────────────────────────────

  _bindSessionEvents() {
    if (!this.sessionTracker) return;

    this.sessionTracker.on("session:added", ({ sessionId }) => {
      this.layoutManager.updateSessions(this.sessionTracker.getAllSessions());
      if (this.layoutManager.currentView === "sessions") {
        this._refreshAllButtons();
      }
    });

    this.sessionTracker.on("session:removed", ({ sessionId }) => {
      this.alertManager.clearAlert(`session:${sessionId}`);
      this.infobarManager.removeSessionColor(sessionId);
      this.layoutManager.updateSessions(this.sessionTracker.getAllSessions());
      if (this.layoutManager.currentView === "sessions") {
        this._refreshAllButtons();
      }
      // If we're viewing this session's permission/question, go back
      if (this.layoutManager.focusedSessionId === sessionId) {
        this.layoutManager.switchView("sessions");
        this._refreshAllButtons();
      }
    });

    this.sessionTracker.on("session:updated", ({ sessionId, session, event }) => {
      // Clear stale alert if session is active again,
      // but NEVER clear if a permission or question is pending
      if (
        session.status !== "stale" &&
        session.status !== "permission" &&
        !session.pendingPermission &&
        !session.pendingQuestion
      ) {
        this.alertManager.clearAlert(`session:${sessionId}`);
      }
      this.layoutManager.updateSessions(this.sessionTracker.getAllSessions());
      if (this.layoutManager.currentView === "sessions") {
        this._refreshAllButtons();
      }
    });

    this.sessionTracker.on("permission:pending", ({ sessionId, tool }) => {
      // Use per-session color for the button alert
      const sessionColor = this.infobarManager.getSessionColor(sessionId);
      this.alertManager.startAlert(`session:${sessionId}`, {
        reason: "permission",
        label: sessionId.slice(-4),
        sublabel: tool ? `${tool}?` : "Permit?",
        onColor: sessionColor,
        offColor: "#331100",
        icon: "shield",
      });
      // Animate touch point LEDs with session-aware colors
      this.infobarManager.showSessionAlert(sessionId, "permission");
      this.layoutManager.updateSessions(this.sessionTracker.getAllSessions());
      if (this.layoutManager.currentView === "sessions") {
        this._refreshAllButtons();
      }
    });

    this.sessionTracker.on("permission:resolved", ({ sessionId }) => {
      this.alertManager.clearAlert(`session:${sessionId}`);
      this.infobarManager.stopAnimation();
      this.infobarManager.onSystemStateChange("active");
      this.layoutManager.updateSessions(this.sessionTracker.getAllSessions());
      if (
        this.layoutManager.currentView === "permission" &&
        this.layoutManager.focusedSessionId === sessionId
      ) {
        this.layoutManager.switchView("sessions");
      }
      this._refreshAllButtons();
    });

    this.sessionTracker.on("question:pending", ({ sessionId, message }) => {
      const sessionColor = this.infobarManager.getSessionColor(sessionId);
      this.alertManager.startAlert(`session:${sessionId}`, {
        reason: "question",
        label: sessionId.slice(-4),
        sublabel: message ? message.substring(0, 10) : "Question",
        onColor: sessionColor,
        offColor: "#332200",
        icon: "clock",
      });
      this.infobarManager.showSessionAlert(sessionId, "waiting");
      this.layoutManager.updateSessions(this.sessionTracker.getAllSessions());
      if (this.layoutManager.currentView === "sessions") {
        this._refreshAllButtons();
      }
    });

    this.sessionTracker.on("question:resolved", ({ sessionId }) => {
      this.alertManager.clearAlert(`session:${sessionId}`);
      this.infobarManager.stopAnimation();
      this.infobarManager.onSystemStateChange("active");
      this.layoutManager.updateSessions(this.sessionTracker.getAllSessions());
      if (
        this.layoutManager.currentView === "question" &&
        this.layoutManager.focusedSessionId === sessionId
      ) {
        this.layoutManager.switchView("sessions");
      }
      this._refreshAllButtons();
    });

    this.sessionTracker.on("session:stale", ({ sessionId }) => {
      this.alertManager.startAlert(`session:${sessionId}`, {
        reason: "stale",
        label: sessionId.slice(-4),
        sublabel: "Idle",
        onColor: "#006666",
        offColor: "#002222",
        icon: "clock",
      });
      this.layoutManager.updateSessions(this.sessionTracker.getAllSessions());
      if (this.layoutManager.currentView === "sessions") {
        this._refreshAllButtons();
      }
    });
  }

  _bindLayoutEvents() {
    if (!this.layoutManager) return;

    this.layoutManager.on("view:changed", ({ view }) => {
      this._refreshAllButtons();
      this.bridge.broadcast("view:changed", { view });
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
    // Multi-session mode: consult LayoutManager
    if (this.layoutManager) {
      const context = this.layoutManager.getActionContext(keyIndex);
      if (!context) return;

      const action = this._resolveAction(context.actionId);
      if (!action) return;

      // Flash the button
      if (!this.alertManager.isAlerting(context.actionId)) {
        this._updateButton(context.actionId, {
          ...(this._buttonStates[context.actionId] || action.defaultState),
          color: "#ffffff",
        });
        setTimeout(() => {
          this._updateButton(
            context.actionId,
            this._buttonStates[context.actionId] || action.defaultState
          );
        }, 150);
      }

      await this._executeAction(action, context.actionId, context);
      this.emit("keyDown", { keyIndex, actionId: context.actionId });
      return;
    }

    // Legacy single-session mode
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

    if (action.onPress === "toggleMute") {
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

  async _executeAction(action, actionId, context) {
    switch (action.handler) {
      case "abort":
        this._handleAbort(context);
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

      // ── Multi-session handlers ───────────────────────────
      case "focusSession":
        this._handleFocusSession(context);
        break;
      case "permissionDecision":
        this._handlePermissionDecision(context);
        break;
      case "navigateBack":
        this._handleNavigateBack();
        break;
      case "showSessions":
        this._handleShowSessions();
        break;
      case "focusTerminal":
        this._handleFocusTerminal(context);
        break;
      case "answerQuestion":
        this._handleAnswerQuestion(context);
        break;
      case "prevPage":
        if (this.layoutManager) {
          this.layoutManager.prevPage();
          this._refreshAllButtons();
        }
        break;
      case "nextPage":
        if (this.layoutManager) {
          this.layoutManager.nextPage();
          this._refreshAllButtons();
        }
        break;
    }
  }

  // ── Multi-session action handlers ──────────────────────────

  _handleFocusSession(context) {
    if (!context || !context.sessionId || !this.sessionTracker || !this.layoutManager) return;

    const session = this.sessionTracker.getSession(context.sessionId);
    if (!session) return;

    if (session.pendingPermission) {
      this.layoutManager.switchView("permission", { sessionId: context.sessionId });
    } else if (session.pendingQuestion) {
      this.layoutManager.switchView("question", { sessionId: context.sessionId });
    } else {
      // No pending action — just focus the terminal
      this._handleFocusTerminal(context);
    }
  }

  _handlePermissionDecision(context) {
    if (!context || !this.sessionTracker || !this.layoutManager) return;

    const sessionId = this.layoutManager.focusedSessionId;
    if (!sessionId) return;

    const decision = context.meta?.decision;
    if (!decision) return;

    if (decision === "allowSession") {
      const session = this.sessionTracker.getSession(sessionId);
      if (session?.pendingPermission) {
        this.sessionTracker.addSessionApproval(sessionId, session.pendingPermission.tool);
      }
      this.sessionTracker.resolvePendingPermission(sessionId, "allow");
    } else if (decision === "allow") {
      this.sessionTracker.resolvePendingPermission(sessionId, "allow");
    } else if (decision === "deny") {
      this.sessionTracker.resolvePendingPermission(sessionId, "deny", "denied by user");
    }

    // Clean up any orphaned legacy respondAlert
    this.dismissRespondAlert();

    // Navigate back to sessions
    this.layoutManager.switchView("sessions");
    this._refreshAllButtons();
  }

  _handleAnswerQuestion(context) {
    if (!this.sessionTracker || !this.layoutManager) return;

    const sessionId = this.layoutManager.focusedSessionId;
    if (!sessionId) return;

    const answer = context?.meta?.answer;
    this.sessionTracker.resolveQuestion(sessionId, answer);

    // Clean up any orphaned legacy respondAlert
    this.dismissRespondAlert();

    // Navigate back to sessions
    this.layoutManager.switchView("sessions");
    this._refreshAllButtons();
  }

  _handleNavigateBack() {
    if (!this.layoutManager) return;

    const current = this.layoutManager.currentView;
    if (current === "permission" || current === "question") {
      this.layoutManager.switchView("sessions");
    } else if (current === "sessions") {
      this.layoutManager.switchView("default");
    }
    this._refreshAllButtons();
  }

  _handleShowSessions() {
    if (!this.layoutManager) return;
    this.layoutManager.switchView("sessions");
    this._refreshAllButtons();
  }

  async _handleFocusTerminal(context) {
    if (!this.terminalFocuser) return;

    const sessionId = context?.sessionId || this.layoutManager?.focusedSessionId;
    if (!sessionId) return;

    const session = this.sessionTracker?.getSession(sessionId);
    await this.terminalFocuser.focus({ sessionId, projectPath: session?.cwd });
  }

  // ── Refresh all buttons for current view ───────────────────

  _refreshAllButtons() {
    if (!this.layoutManager) return;

    const layout = this.layoutManager.getCurrentLayout();
    const totalKeys = (this.layoutManager._device || {}).keys || 15;

    // Clear all keys first
    for (let i = 0; i < totalKeys; i++) {
      const context = layout.keys[i];
      if (!context) {
        // Empty key
        this._updateButton(`_key_${i}`, {
          label: "",
          color: "#000000",
        });
        this.bridge.broadcast("button:render", {
          buttonId: `_key_${i}`,
          keyIndex: i,
          state: { label: "", color: "#000000" },
          svg: this.renderer.render({ label: "", color: "#000000" }),
        });
        continue;
      }

      const actionId = context.actionId;
      const action = this._resolveAction(actionId);
      if (!action) continue;

      let state = { ...action.defaultState };

      // Dynamic state for session buttons
      if (actionId === "sessionButton" && context.meta?.session) {
        const session = context.meta.session;
        state = this._sessionButtonState(session);
      }

      // Dynamic state for permission info
      if (actionId === "permissionInfo" && this.layoutManager.focusedSessionId) {
        const session = this.sessionTracker?.getSession(this.layoutManager.focusedSessionId);
        if (session?.pendingPermission) {
          state = {
            label: session.pendingPermission.tool || "TOOL",
            color: "#ff6600",
            icon: "shield",
            sublabel: `Session ${session.label}`,
          };
        } else if (session?.pendingQuestion) {
          state = {
            label: "QUESTION",
            color: "#ffcc00",
            icon: "clock",
            sublabel: session.pendingQuestion.message
              ? session.pendingQuestion.message.substring(0, 12)
              : "",
          };
        }
      }

      this._buttonStates[actionId] = state;
      const svg = this.renderer.render(state);
      this.bridge.updateButton(actionId, state);
      this.bridge.broadcast("button:render", {
        buttonId: actionId,
        keyIndex: i,
        state,
        svg,
      });
    }
  }

  _sessionButtonState(session) {
    const label = session.label || "SESS";
    if (session.pendingPermission) {
      return {
        label,
        color: "#ff6600",
        icon: "shield",
        sublabel: session.pendingPermission.tool || "Permit?",
      };
    }
    if (session.pendingQuestion) {
      return {
        label,
        color: "#ffcc00",
        icon: "clock",
        sublabel: "Question",
      };
    }
    const statusColors = {
      active: "#00cc66",
      tool: "#9966ff",
      waiting: "#ffcc00",
      attention: "#ffcc00",
      permission: "#ff6600",
      stale: "#006666",
      offline: "#333333",
    };
    return {
      label,
      color: statusColors[session.status] || "#444444",
      icon: "circle",
      sublabel: session.currentTool || session.status || "",
    };
  }

  // ── Original helpers ───────────────────────────────────────

  _handleDismissAlert(buttonId) {
    const id = buttonId || "respondAlert";
    this.alertManager.clearAlert(id);
    this._resetRespondButton();
    this.bridge.broadcast("alert:dismissed", { buttonId: id });
    this.emit("alert:dismissed", { buttonId: id });
  }

  _handleAbort(context) {
    // Aborting counts as responding — clear alert
    this.alertManager.clearAlert("respondAlert");
    this._resetRespondButton();

    // Deny pending permission on focused session
    const sessionId = context?.sessionId || this.layoutManager?.focusedSessionId;
    const aborted = this.controller.abort(sessionId);

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

    // Clear all session approvals if tracker exists
    if (this.sessionTracker) {
      const sessions = this.sessionTracker.getAllSessions();
      for (const session of sessions) {
        session.sessionApprovals.clear();
      }
    }

    this._updateButton("status", {
      label: "RESET",
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
    if (this.layoutManager) {
      status.currentView = this.layoutManager.currentView;
    }
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

    // Resolve keyIndex from current layout so the plugin can route by position
    let keyIndex;
    if (this.layoutManager) {
      const layout = this.layoutManager.getCurrentLayout();
      for (const [idx, ctx] of Object.entries(layout.keys)) {
        if (!ctx) continue;
        if (ctx.actionId === actionId) {
          keyIndex = parseInt(idx, 10);
          break;
        }
        // Session update: actionId is "session:{id}", layout has "sessionButton"
        if (actionId.startsWith("session:") && ctx.actionId === "sessionButton" &&
            ctx.meta?.session?.sessionId === actionId.replace("session:", "")) {
          keyIndex = parseInt(idx, 10);
          break;
        }
      }
    } else if (this.layout && this.layout.keys) {
      for (const [idx, aid] of Object.entries(this.layout.keys)) {
        if (aid === actionId) {
          keyIndex = parseInt(idx, 10);
          break;
        }
      }
    }

    this.bridge.broadcast("button:render", {
      buttonId: actionId,
      keyIndex,
      state,
      svg,
    });
  }
}

module.exports = StreamDeckAdapter;
