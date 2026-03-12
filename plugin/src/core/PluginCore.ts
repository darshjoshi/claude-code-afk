import { EventEmitter } from "events";
import streamDeck from "@elgato/streamdeck";

import { HookServer } from "./HookServer.js";
import { BridgeFacade } from "./BridgeFacade.js";

// @ts-ignore - CJS modules imported via Rollup
import ButtonRenderer from "../../src/streamdeck/ButtonRenderer";
// @ts-ignore
import AlertManager from "../../src/streamdeck/AlertManager";
// @ts-ignore
import InfobarManager from "../../src/streamdeck/InfobarManager";
// @ts-ignore
import LayoutManager from "../../src/streamdeck/LayoutManager";
// @ts-ignore
import SessionTracker from "../../src/session/SessionTracker";
// @ts-ignore
import TerminalFocuser from "../../src/session/TerminalFocuser";
// @ts-ignore
import HookReceiver from "../../src/hooks/HookReceiver";
// @ts-ignore
import ClaudeCodeController from "../../src/controller/ClaudeCodeController";
// @ts-ignore
import { getAction, getLayout } from "../../src/streamdeck/actions";

/** Registered action instance in the SDK. */
interface ActionInstance {
  sdAction: any;
  actionId: string;
  deviceId: string;
  context: string;
  isEncoder: boolean;
}

/**
 * PluginCore — Central hub replacing StreamDeckAdapter + BridgeServer roles.
 *
 * Creates all existing modules (HookServer, SessionTracker, AlertManager,
 * ButtonRenderer, LayoutManager, InfobarManager, ClaudeCodeController)
 * and wires them together using BridgeFacade to satisfy the `bridge` parameter.
 */
export class PluginCore extends EventEmitter {
  hookServer: HookServer;
  bridge: BridgeFacade;
  renderer: ButtonRenderer;
  alertManager: AlertManager;
  sessionTracker: SessionTracker;
  terminalFocuser: TerminalFocuser;
  layoutManager: LayoutManager;
  infobarManager: InfobarManager;
  hookReceiver: HookReceiver;
  controller: ClaudeCodeController;

  /** Map of SDK context ID → ActionInstance */
  private _instances = new Map<string, ActionInstance>();
  /** Per-action button states */
  private _buttonStates: Record<string, any> = {};
  /** Dial values for encoder actions */
  private _dialValues: Record<string, number> = {};
  /** Custom prompts set by user */
  private _customPrompts: Record<string, string> = {};

  constructor(options: {
    port?: number;
    host?: string;
    claudeBinary?: string;
    workingDir?: string;
  } = {}) {
    super();

    // Core infrastructure
    this.hookServer = new HookServer({ port: options.port, host: options.host });
    this.bridge = new BridgeFacade(this.hookServer);
    this.renderer = new ButtonRenderer({ width: 144, height: 144 });

    // Session management
    this.sessionTracker = new SessionTracker();
    this.terminalFocuser = new TerminalFocuser();

    // Layout (default to standard 15-key)
    this.layoutManager = new LayoutManager({
      layout: getLayout("standard"),
      device: { keys: 15, cols: 5 },
    });

    // Alert system
    this.alertManager = new AlertManager({ blinkIntervalMs: 500 });

    // Infobar / context gauge / LEDs
    this.infobarManager = new InfobarManager(this.bridge, {
      maxTokens: 200000,
    });

    // Claude Code CLI controller
    this.controller = new ClaudeCodeController({
      claudeBinary: options.claudeBinary,
      workingDir: options.workingDir,
    });

    // Hook receiver — registers HTTP routes on the bridge facade
    this.hookReceiver = new HookReceiver(this.bridge, {
      sessionTracker: this.sessionTracker,
    });

    // Wire events
    this._bindBroadcastEvents();
    this._bindAlertEvents();
    this._bindSessionEvents();
    this._bindLayoutEvents();
    this._bindControllerEvents();
  }

  /**
   * Start the hook server.
   */
  async start(): Promise<void> {
    await this.hookServer.start();
    streamDeck.logger.info(`Hook server listening on ${this.hookServer.host}:${this.hookServer.port}`);
  }

  /**
   * Stop everything.
   */
  async stop(): Promise<void> {
    this.alertManager.clearAll();
    this.infobarManager.destroy();
    this.sessionTracker.destroy();
    await this.hookServer.stop();
  }

  // ── Instance registry ─────────────────────────────────────────

  /**
   * Register an SDK action instance when it appears on the Stream Deck.
   */
  registerInstance(sdAction: any, actionId: string, ev: any): void {
    const context = ev.action.id + ":" + (ev.context ?? Math.random().toString(36).slice(2));
    const instance: ActionInstance = {
      sdAction,
      actionId,
      deviceId: ev.device ?? "",
      context,
      isEncoder: typeof ev.action.isEncoder === "function" ? ev.action.isEncoder() : false,
    };
    this._instances.set(context, instance);

    // Render initial state
    const action = getAction(actionId);
    if (action) {
      const state = this._buttonStates[actionId] || { ...action.defaultState };
      this._renderInstance(instance, state);
    }
  }

  /**
   * Unregister an SDK action instance when it disappears.
   */
  unregisterInstance(sdAction: any, ev: any): void {
    const context = ev.action.id + ":" + (ev.context ?? "");
    this._instances.delete(context);
  }

  // ── Action execution ──────────────────────────────────────────

  /**
   * Execute an action by its internal actionId.
   */
  async executeAction(actionId: string, context?: any): Promise<void> {
    const action = getAction(actionId);
    if (!action) return;

    switch (action.handler) {
      case "sendPrompt": {
        const prompt = this._customPrompts[actionId] || action.payload?.prompt;
        if (!prompt) return;
        try {
          await this.controller.send(prompt, {
            allowedTools: action.payload?.allowedTools,
          });
        } catch {
          // Controller emits error events
        }
        break;
      }
      case "abort":
        this.controller.abort();
        break;
      case "resetSession":
        this.controller.resetSession();
        break;
      case "getStatus":
        // No-op for native plugin — status displayed directly
        break;
      case "dismissAlert":
        this.alertManager.clearAlert("respondAlert");
        this._resetRespondButton();
        break;
      case "acceptPermission":
        // Resolve focused session permission
        if (this.layoutManager.focusedSessionId) {
          this.sessionTracker.resolvePendingPermission(
            this.layoutManager.focusedSessionId,
            "allow"
          );
        }
        break;
      case "pushToTalk":
        // Future: voice input
        break;
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
        this.layoutManager.switchView("sessions");
        this._refreshAllButtons();
        break;
      case "focusTerminal":
        this._handleFocusTerminal(context);
        break;
      case "prevPage":
        this.layoutManager.prevPage();
        this._refreshAllButtons();
        break;
      case "nextPage":
        this.layoutManager.nextPage();
        this._refreshAllButtons();
        break;
    }
  }

  // ── Encoder handling ──────────────────────────────────────────

  handleDialRotate(actionId: string, ticks: number): void {
    const action = getAction(actionId);
    if (!action) return;

    const step = action.step || 1;
    const min = action.min || 0;
    const max = action.max || 100;
    const current = this._dialValues[actionId] || min;
    const newValue = Math.max(min, Math.min(max, current + ticks * step));
    this._dialValues[actionId] = newValue;

    this._updateActionState(actionId, {
      ...(this._buttonStates[actionId] || action.defaultState),
      sublabel: `${newValue}`,
    });
  }

  handleDialPress(actionId: string): void {
    const action = getAction(actionId);
    if (!action) return;

    if (action.onPress === "resetScroll") {
      this._dialValues[actionId] = 0;
    } else if (action.onPress === "confirmModel") {
      const options = action.options || [];
      const idx = (this._dialValues[actionId] || 0) % options.length;
      const model = options[idx];
      if (model) this.controller.model = model;
    } else if (action.onPress === "resetMaxTurns") {
      this._dialValues[actionId] = action.min || 1;
    } else if (action.onPress === "toggleMute") {
      const muted = !this._buttonStates[actionId]?.muted;
      this._updateActionState(actionId, {
        ...this._buttonStates[actionId],
        muted,
        sublabel: muted ? "MUTED" : `${this._dialValues[actionId]}`,
      });
    }
  }

  // ── Settings update ───────────────────────────────────────────

  handleSettingsUpdate(actionId: string, settings: any): void {
    if (settings.customPrompt) {
      this._customPrompts[actionId] = settings.customPrompt;
    }
    // Re-render the button with potentially new actionId
    const action = getAction(actionId);
    if (action) {
      this._updateActionState(actionId, { ...action.defaultState });
    }
  }

  // ── Internal: broadcast event handling ────────────────────────

  private _bindBroadcastEvents(): void {
    this.bridge.on("broadcast", (msg: any) => {
      const { type, ...data } = msg;

      switch (type) {
        case "button:update":
          this._onButtonUpdate(data.buttonId, data.state);
          break;
        case "infobar:update":
          this._onInfobarUpdate(data);
          break;
        case "touchpoint:led":
          // Store for future Neo LED API support
          break;
        case "button:render":
          this._onButtonRender(data.buttonId, data.state, data.keyIndex);
          break;
        case "view:changed":
          this._refreshAllButtons();
          break;
      }
    });
  }

  private _onButtonUpdate(buttonId: string, state: any): void {
    this._buttonStates[buttonId] = { ...this._buttonStates[buttonId], ...state };
    this._pushImageToInstances(buttonId, state);
  }

  private _onButtonRender(buttonId: string, state: any, keyIndex?: number): void {
    this._buttonStates[buttonId] = state;
    this._pushImageToInstances(buttonId, state);
  }

  private _onInfobarUpdate(data: any): void {
    // Push to all context-gauge encoder instances
    for (const instance of this._instances.values()) {
      if (instance.actionId === "contextGauge") {
        const color = data.color || "#00cc66";
        try {
          (instance.sdAction as any).setFeedback({
            "gauge-bar": {
              value: data.percent || 0,
              bar_fill_c: `0:${color},1:${color}`,
            },
            "gauge-percent": `${data.percent || 0}%`,
            "gauge-tokens": `${data.formatted || "0k"} / ${data.maxFormatted || "200k"}`,
          });
        } catch {
          // Instance may have been removed
        }
      }
    }
  }

  // ── Internal: alert events ────────────────────────────────────

  private _bindAlertEvents(): void {
    this.alertManager.on("blink", ({ buttonId, state }: any) => {
      // Push blink frame directly to matching instances
      this._pushImageToInstances(buttonId, state);
    });

    this.alertManager.on("alert:start", ({ buttonId, reason }: any) => {
      this.emit("alert:start", { buttonId, reason });
    });

    this.alertManager.on("alert:clear", ({ buttonId }: any) => {
      // Restore default state
      const action = getAction(buttonId);
      if (action) {
        const state = this._buttonStates[buttonId] || action.defaultState;
        this._pushImageToInstances(buttonId, state);
      }
    });
  }

  // ── Internal: session events ──────────────────────────────────

  private _bindSessionEvents(): void {
    this.sessionTracker.on("session:added", () => {
      this.layoutManager.updateSessions(this.sessionTracker.getAllSessions());
      if (this.layoutManager.currentView === "sessions") {
        this._refreshAllButtons();
      }
    });

    this.sessionTracker.on("session:removed", ({ sessionId }: any) => {
      this.alertManager.clearAlert(`session:${sessionId}`);
      this.infobarManager.removeSessionColor(sessionId);
      this.layoutManager.updateSessions(this.sessionTracker.getAllSessions());
      if (this.layoutManager.currentView === "sessions") {
        this._refreshAllButtons();
      }
      if (this.layoutManager.focusedSessionId === sessionId) {
        this.layoutManager.switchView("sessions");
        this._refreshAllButtons();
      }
    });

    this.sessionTracker.on("session:updated", () => {
      this.layoutManager.updateSessions(this.sessionTracker.getAllSessions());
      if (this.layoutManager.currentView === "sessions") {
        this._refreshAllButtons();
      }
    });

    this.sessionTracker.on("permission:pending", ({ sessionId, tool }: any) => {
      const sessionColor = this.infobarManager.getSessionColor(sessionId);
      this.alertManager.startAlert(`session:${sessionId}`, {
        reason: "permission",
        label: sessionId.slice(-4),
        sublabel: tool ? `${tool}?` : "Permit?",
        onColor: sessionColor,
        offColor: "#331100",
        icon: "shield",
      });
      this.infobarManager.showSessionAlert(sessionId, "permission");
      this.layoutManager.updateSessions(this.sessionTracker.getAllSessions());
      if (this.layoutManager.currentView === "sessions") {
        this._refreshAllButtons();
      }
    });

    this.sessionTracker.on("permission:resolved", ({ sessionId }: any) => {
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

    this.sessionTracker.on("question:pending", ({ sessionId, message }: any) => {
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

    this.sessionTracker.on("question:resolved", ({ sessionId }: any) => {
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
  }

  // ── Internal: layout events ───────────────────────────────────

  private _bindLayoutEvents(): void {
    this.layoutManager.on("view:changed", () => {
      this._refreshAllButtons();
    });
  }

  // ── Internal: controller events ───────────────────────────────

  private _bindControllerEvents(): void {
    this.controller.on("status:change", ({ current }: any) => {
      const statusAction = getAction("status");
      if (statusAction?.states?.[current]) {
        this._updateActionState("status", statusAction.states[current]);
      }
      this.infobarManager.onSystemStateChange(current);
    });

    this.controller.on("prompt:sent", () => {
      this.alertManager.clearAlert("respondAlert");
      this._resetRespondButton();
    });

    this.controller.on("prompt:response", () => {
      this._updateActionState("status", {
        label: "DONE",
        color: "#4488ff",
        icon: "check",
      });
      setTimeout(() => {
        this._updateActionState("status", {
          label: "IDLE",
          color: "#4488ff",
          icon: "circle",
        });
      }, 3000);
    });

    this.controller.on("prompt:error", ({ error }: any) => {
      this._updateActionState("status", {
        label: "ERROR",
        color: "#cc0000",
        icon: "alert",
        sublabel: typeof error === "string" ? error.substring(0, 15) : "Error",
      });
    });
  }

  // ── Internal: multi-session handlers ──────────────────────────

  private _handleFocusSession(context: any): void {
    if (!context?.sessionId) return;
    const session = this.sessionTracker.getSession(context.sessionId);
    if (!session) return;

    if (session.pendingPermission) {
      this.layoutManager.switchView("permission", { sessionId: context.sessionId });
    } else if (session.pendingQuestion) {
      this.layoutManager.switchView("question", { sessionId: context.sessionId });
    } else {
      this._handleFocusTerminal(context);
    }
  }

  private _handlePermissionDecision(context: any): void {
    const sessionId = this.layoutManager.focusedSessionId;
    if (!sessionId) return;

    const decision = context?.meta?.decision;
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

    this.layoutManager.switchView("sessions");
    this._refreshAllButtons();
  }

  private _handleNavigateBack(): void {
    const current = this.layoutManager.currentView;
    if (current === "permission" || current === "question") {
      this.layoutManager.switchView("sessions");
    } else if (current === "sessions") {
      this.layoutManager.switchView("default");
    }
    this._refreshAllButtons();
  }

  private async _handleFocusTerminal(context: any): Promise<void> {
    const sessionId = context?.sessionId || this.layoutManager.focusedSessionId;
    if (!sessionId) return;
    await this.terminalFocuser.focus({ sessionId });
  }

  // ── Internal: rendering ───────────────────────────────────────

  private _updateActionState(actionId: string, state: any): void {
    this._buttonStates[actionId] = state;
    this._pushImageToInstances(actionId, state);
  }

  private _resetRespondButton(): void {
    const action = getAction("respondAlert");
    if (action) {
      this._updateActionState("respondAlert", { ...action.defaultState });
    }
  }

  /**
   * Push a rendered SVG image to all SDK instances of a given actionId.
   */
  private _pushImageToInstances(actionId: string, state: any): void {
    const dataUri = this.renderer.renderDataUri(state);
    for (const instance of this._instances.values()) {
      if (instance.actionId === actionId && !instance.isEncoder) {
        try {
          (instance.sdAction as any).setImage(dataUri);
        } catch {
          // Instance may have been removed
        }
      }
    }
  }

  /**
   * Render an individual instance with a given state.
   */
  private _renderInstance(instance: ActionInstance, state: any): void {
    if (instance.isEncoder) {
      // Encoders use setFeedback, not setImage
      return;
    }
    const dataUri = this.renderer.renderDataUri(state);
    try {
      (instance.sdAction as any).setImage(dataUri);
    } catch {
      // Instance may have been removed
    }
  }

  /**
   * Refresh all button instances for the current view.
   * Mirrors StreamDeckAdapter._refreshAllButtons().
   */
  _refreshAllButtons(): void {
    const layout = this.layoutManager.getCurrentLayout();
    const totalKeys = this.layoutManager._device?.keys || 15;

    // Build a keyIndex → state map from the current layout
    const keyStates: Record<number, { actionId: string; state: any }> = {};

    for (let i = 0; i < totalKeys; i++) {
      const context = layout.keys[i];
      if (!context) {
        keyStates[i] = {
          actionId: `_key_${i}`,
          state: { label: "", color: "#000000" },
        };
        continue;
      }

      const actionId = context.actionId;
      const action = getAction(actionId);
      if (!action) continue;

      let state = { ...action.defaultState };

      // Dynamic state for session buttons
      if (actionId === "sessionButton" && context.meta?.session) {
        state = this._sessionButtonState(context.meta.session);
      }

      // Dynamic state for permission/question info
      if (actionId === "permissionInfo" && this.layoutManager.focusedSessionId) {
        const session = this.sessionTracker.getSession(this.layoutManager.focusedSessionId);
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
      keyStates[i] = { actionId, state };
    }

    // Now push images to all session-type instances based on position
    // For non-session views, match by actionId
    for (const instance of this._instances.values()) {
      const matchingKey = Object.entries(keyStates).find(
        ([, ks]) => ks.actionId === instance.actionId
      );
      if (matchingKey) {
        this._renderInstance(instance, matchingKey[1].state);
      }
    }
  }

  private _sessionButtonState(session: any): any {
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
    const statusColors: Record<string, string> = {
      active: "#00cc66",
      tool: "#9966ff",
      waiting: "#ffcc00",
      attention: "#ffcc00",
      permission: "#ff6600",
      offline: "#333333",
    };
    return {
      label,
      color: statusColors[session.status] || "#444444",
      icon: "circle",
      sublabel: session.currentTool || session.status || "",
    };
  }
}
