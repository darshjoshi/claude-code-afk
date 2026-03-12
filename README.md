# streamdeck-claude-code

Control [Claude Code](https://docs.anthropic.com/en/docs/claude-code) entirely from your [Elgato Stream Deck](https://www.elgato.com/stream-deck). Send prompts, abort runs, review code, commit changes, and get blinking alerts when Claude needs your attention — all from physical buttons, dials, and pedals.

**Zero dependencies.** Pure Node.js. No `npm install` required.

---

## Why?

Claude Code is a powerful CLI coding agent, but it runs in a terminal. When it hits a permission gate, needs input, or finishes a long task, you have to be watching the terminal to know. If you step away — even briefly — you lose time.

**streamdeck-claude-code** solves the "AFK problem." A bright red blinking button on your desk tells you the moment Claude needs you. One press sends a code review. Another press aborts a runaway session. Another commits your staged changes with an AI-generated message. Your Stream Deck becomes a physical control surface for AI-assisted development.

---

## Features

- **One-press prompts** — Review code, fix bugs, write tests, explain code, refactor, commit, and more
- **Blinking alerts** — Red flashing button when Claude needs your response (permission request, waiting for input)
- **Full session control** — Abort, new session, compact context
- **Git integration** — Status, diff, push — all from hardware buttons
- **Dial support** — Scroll context, select models, set max turns with rotary encoders
- **Pedal support** — Foot pedals for abort, accept, and push-to-talk
- **Custom actions** — Define your own prompts and assign them to any button
- **13 Stream Deck models** — Mini, Neo, MK.2, Plus, XL, Plus XL, Studio, Pedal, and more
- **Pre-built layouts** — Optimized default button layouts for every supported device
- **Zero dependencies** — Hand-rolled WebSocket server, pure Node.js built-ins only

---

## How It Works

```
Stream Deck Hardware
    ↕  (WebSocket)
Bridge Server (localhost:8247)
    ↕  (events)
Stream Deck Adapter ←→ Alert Manager
    │                       ↑
    ↓                       │
Claude Code Controller    Hook Receiver
    │                       ↑
    ↓                       │
claude CLI ────────────→ HTTP hooks (POST /hooks/*)
```

1. The **bridge server** runs locally and speaks WebSocket to your Stream Deck plugin
2. Button presses are mapped to **actions** (prompts, controls, git commands)
3. Actions spawn the `claude` CLI and send structured prompts
4. Claude Code fires **HTTP hooks** back to the bridge when events occur
5. The **alert manager** blinks buttons when Claude needs attention
6. All state changes are broadcast back to the Stream Deck in real-time

---

## Quick Start

### Prerequisites

- **Node.js** 18+
- **Claude Code CLI** installed and authenticated ([installation guide](https://docs.anthropic.com/en/docs/claude-code/getting-started))
- An **Elgato Stream Deck** (any model)

### Install

```bash
# Clone the repo
git clone https://github.com/anthropics/streamdeck-claude-code.git
cd streamdeck-claude-code

# Install globally (no dependencies to fetch)
npm link
```

Or run directly:

```bash
node bin/cli.js start
```

### Setup

```bash
# Install Claude Code hooks (required once)
streamdeck-claude setup

# Start the bridge server
streamdeck-claude start
```

The setup command writes hook entries to `~/.claude/settings.json` so Claude Code sends event callbacks to the bridge.

### Verify

```bash
# Check server status
streamdeck-claude status

# List available actions
streamdeck-claude actions

# Send a test prompt
streamdeck-claude send "What is 2+2?"
```

---

## CLI Reference

| Command | Description |
|---|---|
| `streamdeck-claude start` | Start the bridge server |
| `streamdeck-claude setup` | Install Claude Code hooks |
| `streamdeck-claude uninstall` | Remove hooks from Claude Code settings |
| `streamdeck-claude devices` | List all supported Stream Deck models |
| `streamdeck-claude actions` | List all available actions |
| `streamdeck-claude layouts` | Show default button layouts per device |
| `streamdeck-claude config` | View and modify configuration |
| `streamdeck-claude send <prompt>` | Send a one-shot prompt to Claude |
| `streamdeck-claude status` | Query bridge server status |

### Options

| Flag | Description | Default |
|---|---|---|
| `--port <port>` | Server port | `8247` |
| `--deck <device>` | Stream Deck device ID | `standard` |
| `--cwd <dir>` | Working directory for Claude Code | Current directory |
| `--scope <global\|project>` | Hook install scope | `global` |
| `--config <path>` | Config file path | `~/.streamdeck-claude/config.json` |
| `--type <key\|dial\|pedal\|touch>` | Filter actions by input type | All |

---

## Built-in Actions

### Key Actions (Buttons)

| Action | Label | Description |
|---|---|---|
| `status` | IDLE | Shows Claude's current status (idle/running/waiting/error) |
| `respondAlert` | — | Blinks red when Claude needs your response |
| `toolIndicator` | — | Shows which tool Claude is currently using |
| `reviewCode` | REVIEW | Review uncommitted changes for bugs and issues |
| `fixBugs` | FIX | Find and fix bugs in recent changes |
| `writeTests` | TESTS | Write tests for recently changed files |
| `explain` | EXPLAIN | Explain the project and recent changes |
| `commit` | COMMIT | Commit staged changes with a generated message |
| `refactor` | REFACTR | Refactor recent changes for clarity and performance |
| `runTests` | RUN | Run the test suite and report results |
| `abort` | ABORT | Kill the currently running Claude command |
| `newSession` | NEW | Start a fresh Claude Code session |
| `compact` | COMPACT | Compact the conversation to save context |
| `customPrompt` | CUSTOM | Send a user-configured custom prompt |

### Dial Actions (Rotary Encoders)

| Action | Description |
|---|---|
| `scrollContext` | Scroll through Claude's output context |
| `modelSelect` | Cycle through available Claude models |
| `maxTurns` | Adjust maximum agentic turns |

### Pedal Actions

| Action | Description |
|---|---|
| `pedalAbort` | Foot pedal to abort current command |
| `pedalAccept` | Foot pedal to accept/dismiss alerts |
| `pedalPushToTalk` | Hold to record, release to send prompt |

---

## Supported Devices

| Device | Keys | Dials | Pedals | Touch |
|---|---|---|---|---|
| Stream Deck Mini | 6 | — | — | — |
| Stream Deck Neo | 8 | — | — | 2 points |
| Stream Deck MK.2 | 15 | — | — | — |
| Stream Deck + | 8 | 4 | — | 1 strip |
| Stream Deck XL | 32 | — | — | — |
| Stream Deck + XL | 36 | 6 | — | — |
| Stream Deck Studio | 32 | 2 | — | — |
| Stream Deck Pedal | — | — | 3 | — |

Each device gets a pre-optimized default layout. See all layouts with `streamdeck-claude layouts`.

---

## Configuration

Configuration lives at `~/.streamdeck-claude/config.json`:

```json
{
  "device": { "id": "standard" },
  "server": { "port": 8247, "host": "127.0.0.1" },
  "claude": {
    "binary": "claude",
    "model": null,
    "allowedTools": [],
    "workingDir": null
  },
  "layout": null,
  "customActions": {}
}
```

### Manage via CLI

```bash
# Set your Stream Deck model
streamdeck-claude config device xl

# Remap a key
streamdeck-claude config set-key 5 fixBugs

# Add a custom prompt action
streamdeck-claude config add-action lint "Run the linter and fix all warnings"

# View current config
streamdeck-claude config
```

---

## Custom Actions

Create your own prompt buttons without writing code:

```bash
# Add a custom action
streamdeck-claude config add-action deploy "Deploy the current branch to staging"

# Assign it to key 14
streamdeck-claude config set-key 14 deploy
```

Custom actions automatically get a button label, color, and icon. They're saved in your config and persist across restarts.

---

## Hook Events

The bridge listens for these Claude Code hook callbacks:

| Endpoint | Trigger |
|---|---|
| `POST /hooks/notification` | Claude sends a notification |
| `POST /hooks/stop` | Claude stops and needs input |
| `POST /hooks/pre-tool-use` | Before Claude uses a tool |
| `POST /hooks/post-tool-use` | After Claude uses a tool |
| `POST /hooks/prompt-submit` | When a prompt is submitted |
| `POST /hooks/session-start` | Claude Code session begins |
| `POST /hooks/session-end` | Claude Code session ends |

When a hook fires that requires attention (`stop`, `notification`, `permission-request`), the **respondAlert** button starts blinking red until dismissed.

---

## Programmatic API

Use as a Node.js module for custom integrations:

```javascript
const {
  BridgeServer,
  ClaudeCodeController,
  StreamDeckAdapter,
  HookReceiver,
  DynamicSwitch,
  SwitchManager,
} = require("streamdeck-claude-code");

const controller = new ClaudeCodeController({ cwd: process.cwd() });
const bridge = new BridgeServer({ port: 8247 });
const adapter = new StreamDeckAdapter(bridge, controller, { deviceId: "xl" });
const hooks = new HookReceiver(bridge, adapter);

bridge.start();
```

The `DynamicSwitch` and `SwitchManager` classes provide a lower-level state machine API for building custom toggle/cycle/momentary button behaviors.

---

## Architecture

```
src/
├── index.js                    # Public API exports
├── DynamicSwitch.js            # State machine primitive (toggle/cycle/momentary)
├── SwitchManager.js            # Collection manager for switches
├── presets.js                  # Factory functions for common switch patterns
├── bridge/
│   ├── BridgeServer.js         # HTTP + WebSocket server
│   └── WebSocketServer.js      # Hand-rolled RFC 6455 WebSocket
├── config/
│   └── ConfigManager.js        # Persistent JSON configuration
├── controller/
│   └── ClaudeCodeController.js # Claude Code CLI wrapper
├── hooks/
│   ├── HookReceiver.js         # Hook event processing
│   └── installHooks.js         # Claude settings.json modification
└── streamdeck/
    ├── actions.js              # Action definitions & device layouts
    ├── AlertManager.js         # Blinking alert system
    ├── ButtonRenderer.js       # SVG button image generation
    ├── devices.js              # Stream Deck device registry
    └── StreamDeckAdapter.js    # Central orchestrator
```

### Design Principles

- **Zero dependencies** — The WebSocket server is ~140 lines implementing RFC 6455 frame encoding. No `npm install`, no supply chain risk.
- **Event-driven** — Every component extends `EventEmitter`. Loose coupling through events, not direct calls.
- **Declarative actions** — Actions are plain data objects. Users extend the system through config, not code.
- **Device-agnostic** — Physical device specs are separated from input-to-action mappings. Every model gets a tailored default layout.

---

## Testing

```bash
npm test
```

Tests use Node.js built-in test runner (`node:test`). No test framework dependencies.

```
test/
├── actions.test.js
├── AlertManager.test.js
├── BridgeServer.test.js
├── ButtonRenderer.test.js
├── ClaudeCodeController.test.js
├── ConfigManager.test.js
├── devices.test.js
├── DynamicSwitch.test.js
├── installHooks.test.js
└── SwitchManager.test.js
```

---

## License

[MIT](LICENSE)
