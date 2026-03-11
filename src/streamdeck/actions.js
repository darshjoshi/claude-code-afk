/**
 * Stream Deck action definitions for Claude Code control.
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

  // ── Quick Prompts ──────────────────────────────────────────
  reviewCode: {
    id: "reviewCode",
    name: "Review Code",
    description: "Ask Claude to review uncommitted changes",
    inputType: "key",
    category: "prompt",
    defaultState: { label: "REVIEW", color: "#9966ff", icon: "eye" },
    handler: "sendPrompt",
    payload: {
      prompt:
        "Review my uncommitted changes. Focus on bugs, security issues, and improvements. Be concise.",
      allowedTools: ["Read", "Bash", "Glob", "Grep"],
    },
  },

  fixBugs: {
    id: "fixBugs",
    name: "Fix Bugs",
    description: "Ask Claude to find and fix bugs in recent changes",
    inputType: "key",
    category: "prompt",
    defaultState: { label: "FIX", color: "#cc0000", icon: "bug" },
    handler: "sendPrompt",
    payload: {
      prompt:
        "Look at my recent changes and fix any bugs you find. Run the tests afterward.",
    },
  },

  writeTests: {
    id: "writeTests",
    name: "Write Tests",
    description: "Ask Claude to write tests for recent changes",
    inputType: "key",
    category: "prompt",
    defaultState: { label: "TESTS", color: "#00cc88", icon: "check" },
    handler: "sendPrompt",
    payload: {
      prompt:
        "Write tests for the most recently changed files. Follow existing test patterns.",
    },
  },

  explain: {
    id: "explain",
    name: "Explain Code",
    description: "Ask Claude to explain the current project or recent changes",
    inputType: "key",
    category: "prompt",
    defaultState: { label: "EXPLAIN", color: "#4488ff", icon: "book" },
    handler: "sendPrompt",
    payload: {
      prompt:
        "Explain what this project does and summarize the most recent changes. Be concise.",
      allowedTools: ["Read", "Glob", "Grep"],
    },
  },

  commit: {
    id: "commit",
    name: "Commit",
    description: "Ask Claude to commit staged changes with a good message",
    inputType: "key",
    category: "prompt",
    defaultState: { label: "COMMIT", color: "#ff9900", icon: "git" },
    handler: "sendPrompt",
    payload: {
      prompt:
        "Create a git commit for my staged changes with an appropriate commit message.",
    },
  },

  refactor: {
    id: "refactor",
    name: "Refactor",
    description: "Ask Claude to refactor the most recently changed code",
    inputType: "key",
    category: "prompt",
    defaultState: { label: "REFACTR", color: "#cc88ff", icon: "compress" },
    handler: "sendPrompt",
    payload: {
      prompt:
        "Refactor the most recently changed files for clarity, performance, and maintainability.",
    },
  },

  runTests: {
    id: "runTests",
    name: "Run Tests",
    description: "Ask Claude to run the test suite and report results",
    inputType: "key",
    category: "prompt",
    defaultState: { label: "RUN", color: "#00aa66", icon: "check" },
    handler: "sendPrompt",
    payload: {
      prompt: "Run the test suite and report results. If any tests fail, show why.",
      allowedTools: ["Bash"],
    },
  },

  // ── Session Control ────────────────────────────────────────
  abort: {
    id: "abort",
    name: "Abort",
    description: "Abort the currently running Claude command",
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

  compact: {
    id: "compact",
    name: "Compact",
    description: "Ask Claude to compact the conversation context",
    inputType: "key",
    category: "control",
    defaultState: { label: "COMPACT", color: "#888888", icon: "compress" },
    handler: "sendPrompt",
    payload: {
      prompt: "Please compact the conversation to save context.",
    },
  },

  // ── Custom Prompt ──────────────────────────────────────────
  customPrompt: {
    id: "customPrompt",
    name: "Custom Prompt",
    description: "Send a user-configured custom prompt",
    inputType: "key",
    category: "prompt",
    defaultState: { label: "CUSTOM", color: "#666666", icon: "message" },
    handler: "sendPrompt",
    payload: {
      prompt: "",
    },
  },

  // ── Git Operations ─────────────────────────────────────────
  gitStatus: {
    id: "gitStatus",
    name: "Git Status",
    description: "Ask Claude for a git status summary",
    inputType: "key",
    category: "git",
    defaultState: { label: "STATUS", color: "#ff6633", icon: "git" },
    handler: "sendPrompt",
    payload: {
      prompt:
        "Show me a brief git status summary: branch, staged, unstaged, untracked counts.",
      allowedTools: ["Bash"],
    },
  },

  gitDiff: {
    id: "gitDiff",
    name: "Git Diff",
    description: "Ask Claude to summarize the current diff",
    inputType: "key",
    category: "git",
    defaultState: { label: "DIFF", color: "#ff6633", icon: "diff" },
    handler: "sendPrompt",
    payload: {
      prompt: "Summarize the current git diff in bullet points. Be concise.",
      allowedTools: ["Bash"],
    },
  },

  gitPush: {
    id: "gitPush",
    name: "Git Push",
    description: "Ask Claude to push current branch to origin",
    inputType: "key",
    category: "git",
    defaultState: { label: "PUSH", color: "#ff6633", icon: "git" },
    handler: "sendPrompt",
    payload: {
      prompt: "Push the current branch to origin.",
      allowedTools: ["Bash"],
    },
  },
};

/**
 * Actions for rotary dials (Stream Deck +, + XL, Studio).
 * Dials support: rotate (CW/CCW), press, and touch.
 */
const DIAL_ACTIONS = {
  scrollContext: {
    id: "scrollContext",
    name: "Scroll Context",
    description: "Rotate to scroll through Claude's last response",
    inputType: "dial",
    category: "control",
    defaultState: { label: "SCROLL", color: "#4488ff" },
    handler: "scrollResponse",
    onRotate: "scrollResponse",
    onPress: "resetScroll",
  },

  modelSelect: {
    id: "modelSelect",
    name: "Model Selector",
    description: "Rotate to cycle between Claude models",
    inputType: "dial",
    category: "control",
    defaultState: { label: "MODEL", color: "#9966ff" },
    handler: "cycleModel",
    onRotate: "cycleModel",
    onPress: "confirmModel",
    options: [
      "claude-opus-4-6",
      "claude-sonnet-4-6",
      "claude-haiku-4-5-20251001",
    ],
  },

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

  maxTurns: {
    id: "maxTurns",
    name: "Max Turns",
    description: "Rotate to set max agentic turns for next prompt",
    inputType: "dial",
    category: "control",
    defaultState: { label: "TURNS", color: "#ffcc00" },
    handler: "setMaxTurns",
    onRotate: "setMaxTurns",
    onPress: "resetMaxTurns",
    min: 1,
    max: 50,
    step: 1,
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

// Unified action registry
const ACTIONS = {
  ...KEY_ACTIONS,
  ...DIAL_ACTIONS,
  ...PEDAL_ACTIONS,
  ...TOUCH_ACTIONS,
};

/**
 * Default layouts for every Stream Deck model.
 * Each layout maps input indices to action IDs.
 * Layout keys use the `keys` map; dials in `dials`; pedals in `pedals`.
 */
const LAYOUTS = {
  mini: {
    name: "Mini (6 keys)",
    device: "mini",
    keys: {
      0: "status",
      1: "reviewCode",
      2: "fixBugs",
      3: "abort",
      4: "commit",
      5: "newSession",
    },
  },

  neo: {
    name: "Neo (8 keys + infobar)",
    device: "neo",
    keys: {
      0: "status",
      1: "reviewCode",
      2: "fixBugs",
      3: "writeTests",
      4: "abort",
      5: "commit",
      6: "newSession",
      7: "customPrompt",
    },
    touchPoints: {
      0: "prevPage",
      1: "nextPage",
    },
    infobar: "contextBar",
  },

  standard: {
    name: "Standard / MK.2 (15 keys)",
    device: "standard",
    keys: {
      0: "status",
      1: "toolIndicator",
      2: null,
      3: "gitStatus",
      4: "gitDiff",
      5: "reviewCode",
      6: "fixBugs",
      7: "writeTests",
      8: "explain",
      9: "customPrompt",
      10: "abort",
      11: "newSession",
      12: "compact",
      13: "commit",
      14: "runTests",
    },
  },

  scissor: {
    name: "Scissor Keys (15 keys)",
    device: "scissor",
    keys: {
      0: "status",
      1: "toolIndicator",
      2: null,
      3: "gitStatus",
      4: "gitDiff",
      5: "reviewCode",
      6: "fixBugs",
      7: "writeTests",
      8: "explain",
      9: "customPrompt",
      10: "abort",
      11: "newSession",
      12: "compact",
      13: "commit",
      14: "runTests",
    },
  },

  plus: {
    name: "Stream Deck + (8 keys + 4 dials + touch strip)",
    device: "plus",
    keys: {
      0: "status",
      1: "reviewCode",
      2: "fixBugs",
      3: "writeTests",
      4: "abort",
      5: "commit",
      6: "newSession",
      7: "customPrompt",
    },
    dials: {
      0: "scrollContext",
      1: "modelSelect",
      2: "maxTurns",
      3: "volume",
    },
    touchStrip: "contextBar",
  },

  xl: {
    name: "XL (32 keys)",
    device: "xl",
    keys: {
      0: "status",
      1: "toolIndicator",
      2: null,
      3: null,
      4: null,
      5: null,
      6: "gitStatus",
      7: "gitDiff",
      8: "reviewCode",
      9: "fixBugs",
      10: "writeTests",
      11: "explain",
      12: "refactor",
      13: null,
      14: null,
      15: "customPrompt",
      16: "commit",
      17: "gitPush",
      18: "runTests",
      19: null,
      20: null,
      21: null,
      22: null,
      23: null,
      24: "abort",
      25: "newSession",
      26: "compact",
      27: null,
      28: null,
      29: null,
      30: null,
      31: null,
    },
  },

  plusXl: {
    name: "Stream Deck + XL (36 keys + 6 dials + touch strip)",
    device: "plusXl",
    keys: {
      0: "status",
      1: "toolIndicator",
      2: null,
      3: null,
      4: null,
      5: null,
      6: "gitStatus",
      7: "gitDiff",
      8: null,
      9: "reviewCode",
      10: "fixBugs",
      11: "writeTests",
      12: "explain",
      13: "refactor",
      14: null,
      15: null,
      16: "customPrompt",
      17: null,
      18: "commit",
      19: "gitPush",
      20: "runTests",
      21: null,
      22: null,
      23: null,
      24: null,
      25: null,
      26: null,
      27: "abort",
      28: "newSession",
      29: "compact",
      30: null,
      31: null,
      32: null,
      33: null,
      34: null,
      35: null,
    },
    dials: {
      0: "scrollContext",
      1: "modelSelect",
      2: "maxTurns",
      3: "volume",
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
      1: "toolIndicator",
      2: null,
      3: null,
      4: null,
      5: null,
      6: "gitStatus",
      7: "gitDiff",
      8: "reviewCode",
      9: "fixBugs",
      10: "writeTests",
      11: "explain",
      12: "refactor",
      13: null,
      14: null,
      15: "customPrompt",
      16: "commit",
      17: "gitPush",
      18: "runTests",
      19: null,
      20: null,
      21: null,
      22: null,
      23: null,
      24: "abort",
      25: "newSession",
      26: "compact",
      27: null,
      28: null,
      29: null,
      30: null,
      31: null,
    },
    dials: {
      0: "scrollContext",
      1: "modelSelect",
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
      1: "toolIndicator",
      2: null,
      3: null,
      4: null,
      5: null,
      6: "gitStatus",
      7: "gitDiff",
      8: "reviewCode",
      9: "fixBugs",
      10: "writeTests",
      11: "explain",
      12: "refactor",
      13: "runTests",
      14: null,
      15: "customPrompt",
      16: "commit",
      17: "gitPush",
      18: null,
      19: null,
      20: null,
      21: null,
      22: null,
      23: null,
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
 * Create a custom action (user-defined prompt button).
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
    handler: "sendPrompt",
    payload: {
      prompt: options.prompt || "",
      allowedTools: options.allowedTools || [],
    },
  };
}

module.exports = {
  ACTIONS,
  KEY_ACTIONS,
  DIAL_ACTIONS,
  PEDAL_ACTIONS,
  TOUCH_ACTIONS,
  LAYOUTS,
  getAction,
  getLayout,
  listActions,
  listCategories,
  createCustomAction,
};
