/**
 * Stream Deck action definitions for Claude Code session control.
 *
 * Three input types supported:
 *   - key:   LCD button press (all models)
 *   - dial:  rotary encoder turn/push (Stream Deck +, + XL, Studio)
 *   - pedal: foot pedal press (Stream Deck Pedal)
 *
 * Actions can be assigned to any input on any device.
 */

const KEY_ACTIONS = {
  // ── Status & Info ──────────────────────────────────────────
  status: {
    id: "status",
    name: "Claude Status",
    description: "Shows Claude Code's current status (idle/running/waiting)",
    inputType: "key",
    category: "info",
    defaultState: { label: "IDLE", color: "#4488ff", icon: "circle" },
    states: {
      idle: { label: "IDLE", color: "#4488ff", icon: "circle" },
      running: { label: "RUNNING", color: "#00cc66", icon: "pulse" },
      waiting: { label: "WAITING", color: "#ffcc00", icon: "clock" },
      permission: { label: "PERMIT?", color: "#ff6600", icon: "shield" },
      error: { label: "ERROR", color: "#cc0000", icon: "alert" },
      offline: { label: "OFFLINE", color: "#333333", icon: "circle" },
    },
    handler: "getStatus",
  },

  toolIndicator: {
    id: "toolIndicator",
    name: "Current Tool",
    description: "Shows which tool Claude is currently using",
    inputType: "key",
    category: "info",
    defaultState: { label: "—", color: "#444444", icon: "wrench" },
    handler: null,
  },

  respondAlert: {
    id: "respondAlert",
    name: "Respond Alert",
    description: "Blinks red when Claude needs your response — press to dismiss and switch to terminal",
    inputType: "key",
    category: "info",
    defaultState: { label: "—", color: "#1a1a1a", icon: "circle" },
    alertState: {
      label: "RESPOND",
      onColor: "#cc0000",
      offColor: "#330000",
      icon: "alert",
    },
    handler: "dismissAlert",
  },

  // ── Session Control ────────────────────────────────────────
  abort: {
    id: "abort",
    name: "Abort",
    description: "Deny pending permission or dismiss question on focused session",
    inputType: "key",
    category: "control",
    defaultState: { label: "ABORT", color: "#cc0000", icon: "stop" },
    handler: "abort",
  },

  newSession: {
    id: "newSession",
    name: "New Session",
    description: "Start a fresh Claude Code session",
    inputType: "key",
    category: "control",
    defaultState: { label: "NEW", color: "#ffffff", icon: "plus" },
    handler: "resetSession",
  },

  // ── Session & Permission Control ──────────────────────────
  sessionButton: {
    id: "sessionButton",
    name: "Session Button",
    description: "Shows a session's status — press to focus/manage",
    inputType: "key",
    category: "session",
    defaultState: { label: "SESS", color: "#444444", icon: "circle" },
    handler: "focusSession",
  },

  allowTool: {
    id: "allowTool",
    name: "Allow Tool",
    description: "Allow the pending tool permission request",
    inputType: "key",
    category: "permission",
    defaultState: { label: "ALLOW", color: "#00cc66", icon: "check" },
    handler: "permissionDecision",
  },

  allowToolSession: {
    id: "allowToolSession",
    name: "Allow Tool (Session)",
    description: "Allow the tool for the rest of this session",
    inputType: "key",
    category: "permission",
    defaultState: { label: "ALLOW\nSESS", color: "#4488ff", icon: "check" },
    handler: "permissionDecision",
  },

  denyTool: {
    id: "denyTool",
    name: "Deny Tool",
    description: "Deny the pending tool permission request",
    inputType: "key",
    category: "permission",
    defaultState: { label: "DENY", color: "#cc0000", icon: "stop" },
    handler: "permissionDecision",
  },

  focusTerminal: {
    id: "focusTerminal",
    name: "Focus Terminal",
    description: "Bring the terminal window for this session to the front",
    inputType: "key",
    category: "session",
    defaultState: { label: "FOCUS", color: "#ffcc00", icon: "eye" },
    handler: "focusTerminal",
  },

  backButton: {
    id: "backButton",
    name: "Back",
    description: "Navigate back to the previous view",
    inputType: "key",
    category: "nav",
    defaultState: { label: "BACK", color: "#666666", icon: "circle" },
    handler: "navigateBack",
  },

  sessionsView: {
    id: "sessionsView",
    name: "Sessions",
    description: "Show all active Claude Code sessions",
    inputType: "key",
    category: "nav",
    defaultState: { label: "SESSIONS", color: "#4488ff", icon: "message" },
    handler: "showSessions",
  },

  permissionInfo: {
    id: "permissionInfo",
    name: "Permission Info",
    description: "Display-only button showing tool or question info",
    inputType: "key",
    category: "info",
    defaultState: { label: "INFO", color: "#ff6600", icon: "shield" },
    handler: null,
  },

  prevPage: {
    id: "prevPage",
    name: "Previous Page",
    description: "Go to the previous page of sessions",
    inputType: "key",
    category: "nav",
    defaultState: { label: "PREV", color: "#666666", icon: "circle" },
    handler: "prevPage",
  },

  nextPage: {
    id: "nextPage",
    name: "Next Page",
    description: "Go to the next page of sessions",
    inputType: "key",
    category: "nav",
    defaultState: { label: "NEXT", color: "#666666", icon: "circle" },
    handler: "nextPage",
  },

  // ── Question Response Actions ──────────────────────────────
  answerYes: {
    id: "answerYes",
    name: "Answer Yes",
    description: "Answer YES to Claude's question",
    inputType: "key",
    category: "question",
    defaultState: { label: "YES", color: "#00cc66", icon: "check" },
    handler: "answerQuestion",
  },

  answerNo: {
    id: "answerNo",
    name: "Answer No",
    description: "Answer NO to Claude's question",
    inputType: "key",
    category: "question",
    defaultState: { label: "NO", color: "#cc0000", icon: "stop" },
    handler: "answerQuestion",
  },

  answerContinue: {
    id: "answerContinue",
    name: "Answer Continue",
    description: "Answer CONTINUE to Claude's question",
    inputType: "key",
    category: "question",
    defaultState: { label: "CONTINUE", color: "#4488ff", icon: "circle" },
    handler: "answerQuestion",
  },

  answerSkip: {
    id: "answerSkip",
    name: "Answer Skip",
    description: "Answer SKIP to Claude's question",
    inputType: "key",
    category: "question",
    defaultState: { label: "SKIP", color: "#888888", icon: "circle" },
    handler: "answerQuestion",
  },
};

/**
 * Actions for rotary dials (Stream Deck +, + XL, Studio).
 * Dials support: rotate (CW/CCW), press, and touch.
 */
const DIAL_ACTIONS = {
  volume: {
    id: "volume",
    name: "Notification Volume",
    description: "Adjust notification sound volume",
    inputType: "dial",
    category: "control",
    defaultState: { label: "VOL", color: "#666666" },
    handler: "adjustVolume",
    onRotate: "adjustVolume",
    onPress: "toggleMute",
    min: 0,
    max: 100,
    step: 5,
  },
};

/**
 * Actions for foot pedals (Stream Deck Pedal).
 * 3 pedals: left, center, right.
 */
const PEDAL_ACTIONS = {
  pedalAbort: {
    id: "pedalAbort",
    name: "Pedal: Abort",
    description: "Left pedal aborts current Claude operation",
    inputType: "pedal",
    category: "control",
    defaultState: { label: "ABORT" },
    handler: "abort",
    pedalIndex: 0,
  },

  pedalAccept: {
    id: "pedalAccept",
    name: "Pedal: Accept",
    description: "Center pedal accepts current permission request",
    inputType: "pedal",
    category: "control",
    defaultState: { label: "ACCEPT" },
    handler: "acceptPermission",
    pedalIndex: 1,
  },

  pedalPushToTalk: {
    id: "pedalPushToTalk",
    name: "Pedal: Push-to-Talk",
    description: "Right pedal for voice-to-prompt (hold to record)",
    inputType: "pedal",
    category: "control",
    defaultState: { label: "PTT" },
    handler: "pushToTalk",
    pedalIndex: 2,
    mode: "momentary",
  },
};

/**
 * Actions for Neo infobar / touch strip.
 */
const TOUCH_ACTIONS = {
  contextBar: {
    id: "contextBar",
    name: "Context Bar",
    description: "Shows context usage / token count on infobar or touch strip",
    inputType: "touch",
    category: "info",
    defaultState: { label: "Context", value: 0, max: 100 },
    handler: null,
  },

  contextGauge: {
    id: "contextGauge",
    name: "Context Window Gauge",
    description: "Visual progress bar of context window usage with percentage and token counts",
    inputType: "touch",
    category: "info",
    defaultState: {
      label: "Context",
      value: 0,
      max: 200000,
      percent: 0,
      display: "░░░░░░░░░░░░░░░ 0%",
    },
    // Color thresholds: gauge bar color changes as context fills up
    thresholds: {
      low: { below: 50, color: "#00cc66" },      // green: plenty of room
      medium: { below: 75, color: "#ffcc00" },    // yellow: getting full
      high: { below: 90, color: "#ff6600" },      // orange: watch out
      critical: { below: 101, color: "#cc0000" }, // red: almost out
    },
    handler: null,
  },

  costBar: {
    id: "costBar",
    name: "Cost Bar",
    description: "Shows session cost on touch strip",
    inputType: "touch",
    category: "info",
    defaultState: { label: "Cost", value: "$0.00" },
    handler: null,
  },
};

/**
 * Touch point LED configuration for Neo's left/right touch buttons.
 */
const TOUCH_POINT_STYLES = {
  // Static presets
  default: {
    left: { color: "#ffffff", brightness: 50 },
    right: { color: "#ffffff", brightness: 50 },
  },
  dim: {
    left: { color: "#666666", brightness: 20 },
    right: { color: "#666666", brightness: 20 },
  },
  off: {
    left: { color: "#000000", brightness: 0 },
    right: { color: "#000000", brightness: 0 },
  },

  // Contextual styles — applied dynamically based on state
  idle: {
    left: { color: "#4488ff", brightness: 30 },
    right: { color: "#4488ff", brightness: 30 },
  },
  active: {
    left: { color: "#00cc66", brightness: 60 },
    right: { color: "#00cc66", brightness: 60 },
  },
  attention: {
    left: { color: "#cc0000", brightness: 100 },
    right: { color: "#cc0000", brightness: 100 },
  },
  permission: {
    left: { color: "#ff6600", brightness: 100 },
    right: { color: "#ff6600", brightness: 100 },
  },
  waiting: {
    left: { color: "#ffcc00", brightness: 80 },
    right: { color: "#ffcc00", brightness: 80 },
  },

  // Asymmetric — different colors per side
  navHighlight: {
    left: { color: "#4488ff", brightness: 50 },
    right: { color: "#4488ff", brightness: 50 },
  },
  contextWarning: {
    left: { color: "#ffcc00", brightness: 60 },
    right: { color: "#ff6600", brightness: 60 },
  },
  contextCritical: {
    left: { color: "#cc0000", brightness: 100 },
    right: { color: "#cc0000", brightness: 100 },
  },
};

function getTouchPointStyle(name) {
  return TOUCH_POINT_STYLES[name] || TOUCH_POINT_STYLES.default;
}

// Unified action registry
const ACTIONS = {
  ...KEY_ACTIONS,
  ...DIAL_ACTIONS,
  ...PEDAL_ACTIONS,
  ...TOUCH_ACTIONS,
};

/**
 * Default layouts for every Stream Deck model.
 * Session-control focused: status, alerts, session management, navigation.
 * Dynamic keys (row 1) are filled by LayoutManager when viewing sessions.
 */
const LAYOUTS = {
  mini: {
    name: "Mini (6 keys)",
    device: "mini",
    keys: {
      0: "status",
      1: "respondAlert",
      2: "sessionsView",
      3: "abort",
      4: "focusTerminal",
      5: "backButton",
    },
  },

  neo: {
    name: "Neo (8 keys + infobar)",
    device: "neo",
    keys: {
      0: "status",
      1: "respondAlert",
      2: "toolIndicator",
      3: "sessionsView",
      4: "abort",
      5: "focusTerminal",
      6: "backButton",
      7: null,
    },
    touchPoints: {
      0: "prevPage",
      1: "nextPage",
    },
    infobar: "contextGauge",
  },

  standard: {
    name: "Standard / MK.2 (15 keys)",
    device: "standard",
    keys: {
      0: "status",
      1: "respondAlert",
      2: "toolIndicator",
      3: "sessionsView",
      4: "focusTerminal",
      5: null,
      6: null,
      7: null,
      8: null,
      9: null,
      10: "abort",
      11: "backButton",
      12: null,
      13: "prevPage",
      14: "nextPage",
    },
  },

  scissor: {
    name: "Scissor Keys (15 keys)",
    device: "scissor",
    keys: {
      0: "status",
      1: "respondAlert",
      2: "toolIndicator",
      3: "sessionsView",
      4: "focusTerminal",
      5: null,
      6: null,
      7: null,
      8: null,
      9: null,
      10: "abort",
      11: "backButton",
      12: null,
      13: "prevPage",
      14: "nextPage",
    },
  },

  plus: {
    name: "Stream Deck + (8 keys + 4 dials + touch strip)",
    device: "plus",
    keys: {
      0: "status",
      1: "respondAlert",
      2: "toolIndicator",
      3: "sessionsView",
      4: "abort",
      5: "focusTerminal",
      6: "backButton",
      7: null,
    },
    dials: {
      0: "volume",
      1: null,
      2: null,
      3: null,
    },
    touchStrip: "contextBar",
  },

  xl: {
    name: "XL (32 keys)",
    device: "xl",
    keys: {
      0: "status",
      1: "respondAlert",
      2: "toolIndicator",
      3: "sessionsView",
      4: "focusTerminal",
      5: null,
      6: null,
      7: null,
      8: null,
      9: null,
      10: null,
      11: null,
      12: null,
      13: null,
      14: null,
      15: null,
      16: null,
      17: null,
      18: null,
      19: null,
      20: null,
      21: null,
      22: null,
      23: null,
      24: "abort",
      25: "backButton",
      26: null,
      27: null,
      28: null,
      29: null,
      30: "prevPage",
      31: "nextPage",
    },
  },

  plusXl: {
    name: "Stream Deck + XL (36 keys + 6 dials + touch strip)",
    device: "plusXl",
    keys: {
      0: "status",
      1: "respondAlert",
      2: "toolIndicator",
      3: "sessionsView",
      4: "focusTerminal",
      5: null,
      6: null,
      7: null,
      8: null,
      9: null,
      10: null,
      11: null,
      12: null,
      13: null,
      14: null,
      15: null,
      16: null,
      17: null,
      18: null,
      19: null,
      20: null,
      21: null,
      22: null,
      23: null,
      24: null,
      25: null,
      26: null,
      27: "abort",
      28: "backButton",
      29: null,
      30: null,
      31: null,
      32: null,
      33: null,
      34: "prevPage",
      35: "nextPage",
    },
    dials: {
      0: "volume",
      1: null,
      2: null,
      3: null,
      4: null,
      5: null,
    },
    touchStrip: "costBar",
  },

  studio: {
    name: "Studio (32 keys + 2 dials)",
    device: "studio",
    keys: {
      0: "status",
      1: "respondAlert",
      2: "toolIndicator",
      3: "sessionsView",
      4: "focusTerminal",
      5: null,
      6: null,
      7: null,
      8: null,
      9: null,
      10: null,
      11: null,
      12: null,
      13: null,
      14: null,
      15: null,
      16: null,
      17: null,
      18: null,
      19: null,
      20: null,
      21: null,
      22: null,
      23: null,
      24: "abort",
      25: "backButton",
      26: null,
      27: null,
      28: null,
      29: null,
      30: "prevPage",
      31: "nextPage",
    },
    dials: {
      0: "volume",
      1: null,
    },
  },

  pedal: {
    name: "Pedal (3 foot pedals)",
    device: "pedal",
    pedals: {
      0: "pedalAbort",
      1: "pedalAccept",
      2: "pedalPushToTalk",
    },
  },

  virtual: {
    name: "Virtual Stream Deck (up to 64 keys)",
    device: "virtual",
    keys: {
      0: "status",
      1: "respondAlert",
      2: "toolIndicator",
      3: "sessionsView",
      4: "focusTerminal",
      5: null,
      6: null,
      7: null,
      8: null,
      9: null,
      10: null,
      11: null,
      12: null,
      13: null,
      14: null,
      15: null,
      16: null,
      17: null,
      18: null,
      19: null,
      20: "abort",
      21: "backButton",
      22: "prevPage",
      23: "nextPage",
    },
  },
};

// ── Public API ────────────────────────────────────────────────

function getAction(id) {
  return ACTIONS[id] || null;
}

function getLayout(deviceId) {
  return LAYOUTS[deviceId] || LAYOUTS.standard;
}

function listActions(inputType) {
  const all = Object.values(ACTIONS);
  if (inputType) {
    return all.filter((a) => a.inputType === inputType);
  }
  return all;
}

function listCategories() {
  const categories = {};
  for (const action of Object.values(ACTIONS)) {
    if (!categories[action.category]) {
      categories[action.category] = [];
    }
    categories[action.category].push(action);
  }
  return categories;
}

/**
 * Create a custom action (user-defined button).
 */
function createCustomAction(id, options) {
  return {
    id,
    name: options.name || id,
    description: options.description || "Custom action",
    inputType: options.inputType || "key",
    category: "custom",
    defaultState: {
      label: options.label || id.substring(0, 7).toUpperCase(),
      color: options.color || "#666666",
      icon: options.icon || "message",
    },
    handler: options.handler || null,
    payload: options.prompt ? { prompt: options.prompt } : undefined,
  };
}

module.exports = {
  ACTIONS,
  KEY_ACTIONS,
  DIAL_ACTIONS,
  PEDAL_ACTIONS,
  TOUCH_ACTIONS,
  TOUCH_POINT_STYLES,
  LAYOUTS,
  getAction,
  getLayout,
  getTouchPointStyle,
  listActions,
  listCategories,
  createCustomAction,
};
