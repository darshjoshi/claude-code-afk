/**
 * Ambient module declarations for existing CJS modules.
 * These let TypeScript import the project's JavaScript modules
 * via Rollup's CommonJS plugin.
 */

declare module "../../src/streamdeck/ButtonRenderer" {
  import { EventEmitter } from "events";

  interface ButtonState {
    label?: string;
    color?: string;
    icon?: string | null;
    sublabel?: string;
    muted?: boolean;
  }

  class ButtonRenderer {
    width: number;
    height: number;
    fontFamily: string;
    constructor(options?: { width?: number; height?: number; fontFamily?: string });
    render(state: ButtonState): string;
    renderDataUri(state: ButtonState): string;
    renderLayout(layout: { mapping: Record<string, string> }, buttonStates: Record<string, ButtonState>): Record<string, string>;
  }

  export = ButtonRenderer;
}

declare module "../../src/streamdeck/AlertManager" {
  import { EventEmitter } from "events";

  interface AlertOptions {
    reason?: string;
    label?: string;
    sublabel?: string;
    onColor?: string;
    offColor?: string;
    icon?: string;
  }

  interface BlinkEvent {
    buttonId: string;
    frame: number;
    state: import("../../src/streamdeck/ButtonRenderer").ButtonState;
  }

  class AlertManager extends EventEmitter {
    constructor(options?: { blinkIntervalMs?: number });
    startAlert(buttonId: string, options?: AlertOptions): object;
    clearAlert(buttonId: string): boolean;
    clearAll(): string[];
    clearByPrefix(prefix: string): string[];
    getAlertingIds(): string[];
    isAlerting(buttonId: string): boolean;
    get hasActiveAlerts(): boolean;
    get activeAlerts(): string[];
  }

  export = AlertManager;
}

declare module "../../src/streamdeck/InfobarManager" {
  import { EventEmitter } from "events";

  interface LedStyle {
    color: string;
    brightness: number;
  }

  interface TouchPointStyle {
    left: LedStyle;
    right: LedStyle;
  }

  class InfobarManager extends EventEmitter {
    constructor(bridge: any, options?: {
      maxTokens?: number;
      gaugeWidth?: number;
      ledOverrides?: any;
      stateStyleMap?: Record<string, string>;
      sessionColorPalette?: string[];
    });
    updateContext(tokensUsed: number, maxTokens?: number): void;
    setTouchPointStyle(style: string | TouchPointStyle): void;
    getTouchPointStyle(name: string): TouchPointStyle;
    startAnimation(pattern: string, options?: any): void;
    stopAnimation(): void;
    get isAnimating(): boolean;
    getSessionColor(sessionId: string): string;
    setSessionColor(sessionId: string, color: string): void;
    removeSessionColor(sessionId: string): void;
    showSessionAlert(sessionId: string, state: string): void;
    setStateStyle(state: string, styleName: string): void;
    getStateStyleMap(): Record<string, string>;
    setLedOverrides(overrides: any): void;
    clearLedOverrides(): void;
    onSystemStateChange(state: string): void;
    getState(): any;
    destroy(): void;
  }

  export = InfobarManager;
}

declare module "../../src/streamdeck/LayoutManager" {
  import { EventEmitter } from "events";

  interface ActionContext {
    actionId: string;
    sessionId: string | null;
    meta: any;
  }

  interface CurrentLayout {
    view: string;
    keys: Record<number, ActionContext>;
    dials: Record<number, string>;
    pedals: Record<number, string>;
  }

  class LayoutManager extends EventEmitter {
    _device: { keys: number; cols: number };
    constructor(options?: {
      layout?: any;
      device?: { keys: number; cols: number };
      deckSize?: string;
    });
    get currentView(): string;
    get focusedSessionId(): string | null;
    switchView(name: string, options?: { sessionId?: string }): void;
    updateSessions(sessions: any[]): void;
    getActionContext(keyIndex: number): ActionContext | null;
    getCurrentLayout(): CurrentLayout;
    getBaseLayout(): any;
    nextPage(): void;
    prevPage(): void;
  }

  export = LayoutManager;
}

declare module "../../src/streamdeck/actions" {
  interface ActionDef {
    id: string;
    name: string;
    description: string;
    inputType: string;
    category: string;
    defaultState: { label: string; color: string; icon?: string; sublabel?: string };
    states?: Record<string, any>;
    handler: string | null;
    payload?: { prompt?: string; allowedTools?: string[] };
    alertState?: { label: string; onColor: string; offColor: string; icon: string };
    onRotate?: string;
    onPress?: string;
    options?: string[];
    min?: number;
    max?: number;
    step?: number;
    mode?: string;
    thresholds?: any;
  }

  interface TouchPointStyle {
    left: { color: string; brightness: number };
    right: { color: string; brightness: number };
  }

  export const ACTIONS: Record<string, ActionDef>;
  export const KEY_ACTIONS: Record<string, ActionDef>;
  export const DIAL_ACTIONS: Record<string, ActionDef>;
  export const PEDAL_ACTIONS: Record<string, ActionDef>;
  export const TOUCH_ACTIONS: Record<string, ActionDef>;
  export const TOUCH_POINT_STYLES: Record<string, TouchPointStyle>;
  export const LAYOUTS: Record<string, any>;
  export function getAction(id: string): ActionDef | null;
  export function getLayout(deviceId: string): any;
  export function getTouchPointStyle(name: string): TouchPointStyle;
  export function listActions(inputType?: string): ActionDef[];
  export function listCategories(): Record<string, ActionDef[]>;
  export function createCustomAction(id: string, options: any): ActionDef;
}

declare module "../../src/streamdeck/devices" {
  interface DeviceProfile {
    id: string;
    name: string;
    keys: number;
    rows: number;
    cols: number;
    dials: number;
    touchStrips: number;
    touchPoints: number;
    pedals: number;
    keySize: number;
    hasInfobar?: boolean;
    hasNfc?: boolean;
    hasEthernet?: boolean;
    isVirtual?: boolean;
  }

  export const DEVICES: Record<string, DeviceProfile>;
  export function getDevice(id: string): DeviceProfile | null;
  export function createCustomDevice(base: string | DeviceProfile, overrides: Partial<DeviceProfile>): DeviceProfile;
  export function listDevices(): DeviceProfile[];
  export function describeDevice(device: string | DeviceProfile): string | null;
}

declare module "../../src/session/SessionTracker" {
  import { EventEmitter } from "events";

  interface Session {
    sessionId: string;
    status: string;
    lastEvent: string | null;
    lastEventTime: number;
    currentTool: string | null;
    pendingPermission: any;
    pendingQuestion: any;
    sessionApprovals: Set<string>;
    label: string;
  }

  class SessionTracker extends EventEmitter {
    constructor(options?: {
      responseTimeoutMs?: number;
      staleThresholdMs?: number;
      cleanupIntervalMs?: number;
    });
    registerSession(id: string): Session;
    removeSession(id: string): void;
    getSession(id: string): Session | null;
    getAllSessions(): Session[];
    get sessionCount(): number;
    updateStatus(id: string, event: string, data?: any): void;
    hasSessionApproval(id: string, tool: string): boolean;
    addSessionApproval(id: string, tool: string): void;
    setPendingPermission(id: string, opts: { tool: string; body: any; resolve: (response: any) => void }): void;
    resolvePendingPermission(id: string, decision: string, reason?: string): boolean;
    setPendingQuestion(id: string, opts: { message: string; resolve: (response: any) => void }): void;
    resolveQuestion(id: string): boolean;
    getAttentionSessions(): Session[];
    get hasAttentionNeeded(): boolean;
    destroy(): void;
  }

  export = SessionTracker;
}

declare module "../../src/session/TerminalFocuser" {
  class TerminalFocuser {
    constructor(options?: { platform?: string });
    focus(opts: { sessionId?: string; projectPath?: string }): Promise<boolean>;
  }

  export = TerminalFocuser;
}

declare module "../../src/controller/ClaudeCodeController" {
  import { EventEmitter } from "events";

  class ClaudeCodeController extends EventEmitter {
    claudeBinary: string;
    workingDir: string;
    sessionId: string | null;
    model: string | null;
    allowedTools: string[];
    status: string;
    constructor(options?: {
      claudeBinary?: string;
      workingDir?: string;
      sessionId?: string;
      model?: string;
      allowedTools?: string[];
    });
    send(prompt: string, options?: any): Promise<any>;
    abort(): boolean;
    oneShot(prompt: string, options?: any): Promise<any>;
    getVersion(): Promise<string>;
    getStatus(): any;
    resetSession(): void;
  }

  export = ClaudeCodeController;
}

declare module "../../src/hooks/HookReceiver" {
  import { EventEmitter } from "events";

  class HookReceiver extends EventEmitter {
    bridge: any;
    adapter: any;
    sessionTracker: any;
    constructor(bridgeServer: any, options?: {
      adapter?: any;
      sessionTracker?: any;
    });
    setAdapter(adapter: any): void;
  }

  export = HookReceiver;
}
