#!/usr/bin/env node

const ClaudeCodeController = require("../src/controller/ClaudeCodeController");
const BridgeServer = require("../src/bridge/BridgeServer");
const HookReceiver = require("../src/hooks/HookReceiver");
const StreamDeckAdapter = require("../src/streamdeck/StreamDeckAdapter");
const { installHooks, uninstallHooks } = require("../src/hooks/installHooks");
const { listActions, listCategories, LAYOUTS } = require("../src/streamdeck/actions");

const [,, command, ...args] = process.argv;

async function main() {
  switch (command) {
    case "start":
      await startServer();
      break;
    case "setup":
      setupHooks();
      break;
    case "uninstall":
      removeHooks();
      break;
    case "actions":
      showActions();
      break;
    case "layouts":
      showLayouts();
      break;
    case "send":
      await sendPrompt(args.join(" "));
      break;
    case "status":
      await showStatus();
      break;
    default:
      showHelp();
  }
}

async function startServer() {
  const port = parseInt(getArg("--port", "8247"), 10);
  const deckSize = getArg("--deck", "standard");
  const workingDir = getArg("--cwd", process.cwd());

  const controller = new ClaudeCodeController({ workingDir });
  const bridge = new BridgeServer({ port });
  const hooks = new HookReceiver(bridge);
  const adapter = new StreamDeckAdapter(bridge, controller, { deckSize });

  // Log hook events
  hooks.on("hook", (event) => {
    console.log(`[hook] ${event.event}${event.tool ? ` (${event.tool})` : ""}`);
  });

  // Log controller events
  controller.on("status:change", ({ previous, current }) => {
    console.log(`[claude] ${previous} → ${current}`);
  });

  adapter.on("keyDown", ({ keyIndex, actionId }) => {
    console.log(`[deck] Key ${keyIndex} → ${actionId}`);
  });

  bridge.on("client:connected", () => {
    console.log("[deck] Stream Deck client connected");
  });

  await bridge.start();

  console.log(`
┌─────────────────────────────────────────────┐
│  Stream Deck ↔ Claude Code Bridge           │
├─────────────────────────────────────────────┤
│  Server:  http://127.0.0.1:${port}            │
│  WebSocket: ws://127.0.0.1:${port}            │
│  Deck:    ${LAYOUTS[deckSize]?.name || deckSize}                      │
│  CWD:     ${workingDir.substring(0, 33).padEnd(33)}│
├─────────────────────────────────────────────┤
│  Hook endpoints:                            │
│    POST /hooks/notification                 │
│    POST /hooks/stop                         │
│    POST /hooks/pre-tool-use                 │
│    POST /hooks/post-tool-use                │
│    POST /hooks/session-start                │
│    POST /hooks/session-end                  │
│                                             │
│  Status: GET /status                        │
├─────────────────────────────────────────────┤
│  Run 'streamdeck-claude setup' to install   │
│  Claude Code hooks automatically.           │
└─────────────────────────────────────────────┘
`);

  // Graceful shutdown
  process.on("SIGINT", async () => {
    console.log("\nShutting down...");
    await bridge.stop();
    process.exit(0);
  });
}

function setupHooks() {
  const scope = getArg("--scope", "global");
  const port = parseInt(getArg("--port", "8247"), 10);

  console.log(`Installing Claude Code hooks (${scope})...`);
  const result = installHooks({ scope, port });
  console.log(`✓ Hooks installed to: ${result.settingsPath}`);
  console.log(`  Events: ${result.events.join(", ")}`);
  console.log(`\nClaude Code will now send events to http://127.0.0.1:${port}`);
  console.log("Start the bridge server with: streamdeck-claude start");
}

function removeHooks() {
  const scope = getArg("--scope", "global");
  const port = parseInt(getArg("--port", "8247"), 10);

  console.log(`Removing Claude Code hooks (${scope})...`);
  const result = uninstallHooks({ scope, port });
  if (result.removed) {
    console.log(`✓ Removed ${result.count} hook(s)`);
  } else {
    console.log(`Nothing to remove: ${result.reason}`);
  }
}

function showActions() {
  const categories = listCategories();
  console.log("Available Stream Deck actions:\n");
  for (const [category, actions] of Object.entries(categories)) {
    console.log(`  ${category.toUpperCase()}`);
    for (const action of actions) {
      console.log(`    ${action.id.padEnd(20)} ${action.description}`);
    }
    console.log();
  }
}

function showLayouts() {
  console.log("Available Stream Deck layouts:\n");
  for (const [size, layout] of Object.entries(LAYOUTS)) {
    console.log(`  ${size}: ${layout.name}`);
    const entries = Object.entries(layout.mapping).filter(([, v]) => v);
    for (const [key, action] of entries) {
      console.log(`    Key ${key.padStart(2)}: ${action}`);
    }
    console.log();
  }
}

async function sendPrompt(prompt) {
  if (!prompt) {
    console.error("Usage: streamdeck-claude send <prompt>");
    process.exit(1);
  }
  const controller = new ClaudeCodeController();
  try {
    const result = await controller.send(prompt);
    console.log(result.result || JSON.stringify(result, null, 2));
  } catch (err) {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  }
}

async function showStatus() {
  try {
    const res = await fetch("http://127.0.0.1:8247/status");
    const data = await res.json();
    console.log(JSON.stringify(data, null, 2));
  } catch {
    console.log("Bridge server is not running.");
    console.log("Start it with: streamdeck-claude start");
  }
}

function showHelp() {
  console.log(`
streamdeck-claude — Control Claude Code from your Stream Deck

Commands:
  start              Start the bridge server
  setup              Install Claude Code hooks
  uninstall          Remove Claude Code hooks
  actions            List available button actions
  layouts            Show deck layout options
  send <prompt>      Send a one-shot prompt to Claude
  status             Check bridge server status

Options:
  --port <port>      Bridge server port (default: 8247)
  --deck <size>      Deck layout: mini, standard, xl (default: standard)
  --scope <scope>    Hook scope: global, project (default: global)
  --cwd <dir>        Working directory for Claude Code
`);
}

function getArg(flag, defaultValue) {
  const idx = args.indexOf(flag);
  if (idx !== -1 && args[idx + 1]) {
    return args[idx + 1];
  }
  return defaultValue;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
