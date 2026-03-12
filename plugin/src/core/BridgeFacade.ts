import { EventEmitter } from "events";
import { HookServer } from "./HookServer.js";

/**
 * BridgeFacade — Adapter that implements the BridgeServer interface
 * expected by HookReceiver, InfobarManager, and other existing modules.
 *
 * Instead of broadcasting over WebSocket, it emits events that PluginCore
 * translates into SDK calls (setImage, setFeedback, etc.).
 */
export class BridgeFacade extends EventEmitter {
  private _hookServer: HookServer;
  private _state: {
    claudeStatus: string;
    lastEvent: string | null;
    buttons: Record<string, any>;
  };

  constructor(hookServer: HookServer) {
    super();
    this._hookServer = hookServer;
    this._state = {
      claudeStatus: "idle",
      lastEvent: null,
      buttons: {},
    };
  }

  /**
   * Register an HTTP route — delegates to HookServer.
   * This is called by HookReceiver._registerRoutes().
   */
  route(method: string, path: string, handler: (...args: any[]) => void): void {
    this._hookServer.route(method, path, handler);
  }

  /**
   * Broadcast a message. Instead of sending over WebSocket,
   * emits a local event that PluginCore listens to.
   */
  broadcast(type: string, data: any): void {
    this.emit("broadcast", { type, ...data });
  }

  /**
   * Update shared state and emit broadcast.
   */
  updateState(patch: Record<string, any>): void {
    Object.assign(this._state, patch);
    this.broadcast("state:update", { patch });
  }

  /**
   * Update a specific button's visual state.
   */
  updateButton(buttonId: string, state: any): void {
    this._state.buttons[buttonId] = {
      ...this._state.buttons[buttonId],
      ...state,
    };
    this.broadcast("button:update", { buttonId, state });
  }

  /**
   * Get current state (for status queries).
   */
  getState(): typeof this._state {
    return this._state;
  }
}
