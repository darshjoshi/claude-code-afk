/**
 * Stream Deck action definitions for Claude Code control.
 * Each action maps to a button with visual state and a handler.
 *
 * Actions can be assigned to any Stream Deck key position.
 */

const ACTIONS = {
  // ── Status & Info ──────────────────────────────────────────
  status: {
    id: "status",
    name: "Claude Status",
    description: "Shows Claude Code's current status (idle/running/waiting)",
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
    category: "info",
    defaultState: { label: "—", color: "#444444", icon: "wrench" },
    handler: null, // Passive — updated by hooks
  },

  // ── Quick Prompts ──────────────────────────────────────────
  reviewCode: {
    id: "reviewCode",
    name: "Review Code",
    description: "Ask Claude to review uncommitted changes",
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
    category: "prompt",
    defaultState: { label: "COMMIT", color: "#ff9900", icon: "git" },
    handler: "sendPrompt",
    payload: {
      prompt: "Create a git commit for my staged changes with an appropriate commit message.",
    },
  },

  // ── Session Control ────────────────────────────────────────
  abort: {
    id: "abort",
    name: "Abort",
    description: "Abort the currently running Claude command",
    category: "control",
    defaultState: { label: "ABORT", color: "#cc0000", icon: "stop" },
    handler: "abort",
  },

  newSession: {
    id: "newSession",
    name: "New Session",
    description: "Start a fresh Claude Code session",
    category: "control",
    defaultState: { label: "NEW", color: "#ffffff", icon: "plus" },
    handler: "resetSession",
  },

  compact: {
    id: "compact",
    name: "Compact",
    description: "Ask Claude to compact the conversation context",
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
    category: "prompt",
    defaultState: { label: "CUSTOM", color: "#666666", icon: "message" },
    handler: "sendPrompt",
    payload: {
      prompt: "", // Configured by user
    },
  },

  // ── Git Operations ─────────────────────────────────────────
  gitStatus: {
    id: "gitStatus",
    name: "Git Status",
    description: "Ask Claude for a git status summary",
    category: "git",
    defaultState: { label: "STATUS", color: "#ff6633", icon: "git" },
    handler: "sendPrompt",
    payload: {
      prompt: "Show me a brief git status summary: branch, staged, unstaged, untracked counts.",
      allowedTools: ["Bash"],
    },
  },

  gitDiff: {
    id: "gitDiff",
    name: "Git Diff",
    description: "Ask Claude to summarize the current diff",
    category: "git",
    defaultState: { label: "DIFF", color: "#ff6633", icon: "diff" },
    handler: "sendPrompt",
    payload: {
      prompt: "Summarize the current git diff in bullet points. Be concise.",
      allowedTools: ["Bash"],
    },
  },
};

/**
 * Default Stream Deck layouts for different deck sizes.
 * Maps key positions to action IDs.
 */
const LAYOUTS = {
  // Stream Deck Mini (6 keys, 2 rows x 3 columns)
  mini: {
    name: "Mini (6 keys)",
    keys: 6,
    mapping: {
      0: "status",
      1: "reviewCode",
      2: "fixBugs",
      3: "abort",
      4: "commit",
      5: "newSession",
    },
  },

  // Stream Deck MK.2 (15 keys, 3 rows x 5 columns)
  standard: {
    name: "Standard (15 keys)",
    keys: 15,
    mapping: {
      // Row 1: Status & Info
      0: "status",
      1: "toolIndicator",
      2: null, // spacer
      3: "gitStatus",
      4: "gitDiff",
      // Row 2: Quick Prompts
      5: "reviewCode",
      6: "fixBugs",
      7: "writeTests",
      8: "explain",
      9: "customPrompt",
      // Row 3: Control
      10: "abort",
      11: "newSession",
      12: "compact",
      13: "commit",
      14: null, // spacer
    },
  },

  // Stream Deck XL (32 keys, 4 rows x 8 columns)
  xl: {
    name: "XL (32 keys)",
    keys: 32,
    mapping: {
      // Row 1: Status
      0: "status",
      1: "toolIndicator",
      2: null,
      3: null,
      4: null,
      5: null,
      6: "gitStatus",
      7: "gitDiff",
      // Row 2: Prompts
      8: "reviewCode",
      9: "fixBugs",
      10: "writeTests",
      11: "explain",
      12: null,
      13: null,
      14: null,
      15: "customPrompt",
      // Row 3: More prompts
      16: "commit",
      17: null,
      18: null,
      19: null,
      20: null,
      21: null,
      22: null,
      23: null,
      // Row 4: Control
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
};

function getAction(id) {
  return ACTIONS[id] || null;
}

function getLayout(size) {
  return LAYOUTS[size] || LAYOUTS.standard;
}

function listActions() {
  return Object.values(ACTIONS);
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

module.exports = { ACTIONS, LAYOUTS, getAction, getLayout, listActions, listCategories };
