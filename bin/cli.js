#!/usr/bin/env node

const ClaudeCodeController = require("../src/controller/ClaudeCodeController");
const BridgeServer = require("../src/bridge/BridgeServer");
const HookReceiver = require("../src/hooks/HookReceiver");
const StreamDeckAdapter = require("../src/streamdeck/StreamDeckAdapter");
const { installHooks, uninstallHooks } = require("../src/hooks/installHooks");
const { listActions, listCategories, LAYOUTS, createCustomAction } = require("../src/streamdeck/actions");
const { listDevices, describeDevice } = require("../src/streamdeck/devices");
const ConfigManager = require("../src/config/ConfigManager");

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
    case "devices":
      showDevices();
      break;
    case "layouts":
      showLayouts();
      break;
    case "config":
      handleConfig();
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
  const config = new ConfigManager(getArg("--config"));
  config.load();

  // CLI flags override config
  const port = parseInt(getArg("--port", String(config.toJSON().server.port)), 10);
  const deckSize = getArg("--deck", config.toJSON().device.id);
  const workingDir = getArg("--cwd", config.toJSON().claude.workingDir || process.cwd());

  const controller = new ClaudeCodeController({
    workingDir,
    claudeBinary: config.toJSON().claude.binary,
    model: config.toJSON().claude.model,
    allowedTools: config.toJSON().claude.allowedTools,
  });
  const bridge = new BridgeServer({ port });

  // Resolve layout (config overrides > device defaults)
  const layout = config.getLayout();
  const customActions = {};
  if (config.toJSON().customActions) {
    for (const [id, def] of Object.entries(config.toJSON().customActions)) {
      customActions[id] = createCustomAction(id, def);
    }
  }

  const adapter = new StreamDeckAdapter(bridge, controller, {
    deckSize,
    layout,
    customActions,
  });

  // Wire hooks to adapter so alerts trigger on attention-needed events
  const hooks = new HookReceiver(bridge, { adapter });

  // Log hook events
  hooks.on("hook", (event) => {
    console.log(`[hook] ${event.event}${event.tool ? ` (${event.tool})` : ""}`);
  });

  controller.on("status:change", ({ previous, current }) => {
    console.log(`[claude] ${previous} -> ${current}`);
  });

  adapter.on("keyDown", ({ keyIndex, actionId }) => {
    console.log(`[deck] Key ${keyIndex} -> ${actionId}`);
  });

  adapter.on("dialRotate", ({ dialIndex, actionId, value }) => {
    console.log(`[deck] Dial ${dialIndex} -> ${actionId} = ${value}`);
  });

  adapter.on("pedalDown", ({ pedalIndex, actionId }) => {
    console.log(`[deck] Pedal ${pedalIndex} -> ${actionId}`);
  });

  adapter.on("alert:start", ({ buttonId, reason }) => {
    console.log(`[ALERT] BLINKING: ${reason} — respond now!`);
  });

  adapter.on("alert:clear", ({ buttonId, reason, duration }) => {
    console.log(`[alert] Cleared (${reason}, ${Math.round(duration / 1000)}s)`);
  });

  bridge.on("client:connected", () => {
    console.log("[deck] Stream Deck client connected");
  });

  await bridge.start();

  const device = config.getDevice();
  const layoutName = layout.name || deckSize;
  console.log(`
┌─────────────────────────────────────────────────┐
│  Stream Deck <-> Claude Code Bridge             │
├─────────────────────────────────────────────────┤
│  Server:    http://127.0.0.1:${String(port).padEnd(21)}│
│  WebSocket: ws://127.0.0.1:${String(port).padEnd(23)}│
│  Device:    ${device.name.padEnd(37)}│
│  Layout:    ${layoutName.substring(0, 37).padEnd(37)}│
│  CWD:       ${workingDir.substring(0, 37).padEnd(37)}│
├─────────────────────────────────────────────────┤
│  Inputs: ${String(device.keys || 0).padStart(2)} keys, ${String(device.dials || 0)} dials, ${String(device.pedals || 0)} pedals${" ".repeat(11)}│
├─────────────────────────────────────────────────┤
│  Hook endpoints:                                │
│    POST /hooks/notification                     │
│    POST /hooks/stop                             │
│    POST /hooks/pre-tool-use                     │
│    POST /hooks/post-tool-use                    │
│    POST /hooks/session-start                    │
│    POST /hooks/session-end                      │
│                                                 │
│  Status: GET /status                            │
└─────────────────────────────────────────────────┘
`);

  process.on("SIGINT", async () => {
    console.log("\nShutting down...");
    await bridge.stop();
    process.exit(0);
  });
}

function setupHooks() {
  const scope = getArg("--scope", "global");
  const config = new ConfigManager(getArg("--config"));
  config.load();
  const port = parseInt(getArg("--port", String(config.toJSON().server.port)), 10);

  console.log(`Installing Claude Code hooks (${scope})...`);
  const result = installHooks({ scope, port });
  console.log(`Hooks installed to: ${result.settingsPath}`);
  console.log(`  Events: ${result.events.join(", ")}`);
  console.log(`\nClaude Code will now send events to http://127.0.0.1:${port}`);
  console.log("Start the bridge server with: streamdeck-claude start");
}

function removeHooks() {
  const scope = getArg("--scope", "global");
  const config = new ConfigManager(getArg("--config"));
  config.load();
  const port = parseInt(getArg("--port", String(config.toJSON().server.port)), 10);

  console.log(`Removing Claude Code hooks (${scope})...`);
  const result = uninstallHooks({ scope, port });
  if (result.removed) {
    console.log(`Removed ${result.count} hook(s)`);
  } else {
    console.log(`Nothing to remove: ${result.reason}`);
  }
}

function showActions() {
  const inputType = getArg("--type");
  const actions = listActions(inputType);
  const categories = {};
  for (const action of actions) {
    if (!categories[action.category]) categories[action.category] = [];
    categories[action.category].push(action);
  }

  console.log(`Available actions${inputType ? ` (${inputType})` : ""}:\n`);
  for (const [category, catActions] of Object.entries(categories)) {
    console.log(`  ${category.toUpperCase()}`);
    for (const action of catActions) {
      const type = action.inputType ? `[${action.inputType}]` : "";
      console.log(`    ${action.id.padEnd(20)} ${type.padEnd(8)} ${action.description}`);
    }
    console.log();
  }
}

function showDevices() {
  console.log("Supported Stream Deck devices:\n");
  for (const device of listDevices()) {
    console.log(`  ${device.id.padEnd(12)} ${describeDevice(device)}`);
  }
  console.log("\nSet your device with: streamdeck-claude config --device <id>");
}

function showLayouts() {
  console.log("Default layouts per device:\n");
  for (const [id, layout] of Object.entries(LAYOUTS)) {
    console.log(`  ${id}: ${layout.name}`);
    if (layout.keys) {
      const entries = Object.entries(layout.keys).filter(([, v]) => v);
      for (const [key, action] of entries) {
        console.log(`    Key ${String(key).padStart(2)}: ${action}`);
      }
    }
    if (layout.dials) {
      const entries = Object.entries(layout.dials).filter(([, v]) => v);
      for (const [idx, action] of entries) {
        console.log(`    Dial ${idx}: ${action}`);
      }
    }
    if (layout.pedals) {
      const entries = Object.entries(layout.pedals).filter(([, v]) => v);
      for (const [idx, action] of entries) {
        console.log(`    Pedal ${idx}: ${action}`);
      }
    }
    if (layout.touchStrip) {
      console.log(`    Touch Strip: ${layout.touchStrip}`);
    }
    if (layout.infobar) {
      console.log(`    Infobar: ${layout.infobar}`);
    }
    console.log();
  }
}

function handleConfig() {
  const config = new ConfigManager(getArg("--config"));
  config.load();

  const subcommand = args[0];

  switch (subcommand) {
    case "show":
      console.log(JSON.stringify(config.toJSON(), null, 2));
      break;

    case "init": {
      config.save();
      console.log(`Config created at: ${config.configPath}`);
      break;
    }

    case "set-device": {
      const deviceId = args[1];
      if (!deviceId) {
        console.error("Usage: streamdeck-claude config set-device <device-id>");
        console.error("Run 'streamdeck-claude devices' to see available devices.");
        process.exit(1);
      }
      config.setDevice(deviceId);
      config.save();
      console.log(`Device set to: ${deviceId}`);
      break;
    }

    case "set-key": {
      const keyIndex = parseInt(args[1], 10);
      const actionId = args[2];
      if (isNaN(keyIndex) || !actionId) {
        console.error("Usage: streamdeck-claude config set-key <index> <action-id>");
        process.exit(1);
      }
      config.setKeyAction(keyIndex, actionId === "null" ? null : actionId);
      config.save();
      console.log(`Key ${keyIndex} -> ${actionId}`);
      break;
    }

    case "set-dial": {
      const dialIndex = parseInt(args[1], 10);
      const actionId = args[2];
      if (isNaN(dialIndex) || !actionId) {
        console.error("Usage: streamdeck-claude config set-dial <index> <action-id>");
        process.exit(1);
      }
      config.setDialAction(dialIndex, actionId === "null" ? null : actionId);
      config.save();
      console.log(`Dial ${dialIndex} -> ${actionId}`);
      break;
    }

    case "set-pedal": {
      const pedalIndex = parseInt(args[1], 10);
      const actionId = args[2];
      if (isNaN(pedalIndex) || !actionId) {
        console.error("Usage: streamdeck-claude config set-pedal <index> <action-id>");
        process.exit(1);
      }
      config.setPedalAction(pedalIndex, actionId === "null" ? null : actionId);
      config.save();
      console.log(`Pedal ${pedalIndex} -> ${actionId}`);
      break;
    }

    case "add-action": {
      const id = args[1];
      const name = getArg("--name", id);
      const prompt = getArg("--prompt", "");
      const label = getArg("--label", id.substring(0, 7).toUpperCase());
      const color = getArg("--color", "#666666");
      const icon = getArg("--icon", "message");
      if (!id) {
        console.error("Usage: streamdeck-claude config add-action <id> --prompt <text> [--name, --label, --color, --icon]");
        process.exit(1);
      }
      config.addCustomAction(id, { name, prompt, label, color, icon });
      config.save();
      console.log(`Custom action added: ${id}`);
      console.log(`  Assign it to a key: streamdeck-claude config set-key <index> ${id}`);
      break;
    }

    case "remove-action": {
      const id = args[1];
      if (!id) {
        console.error("Usage: streamdeck-claude config remove-action <id>");
        process.exit(1);
      }
      config.removeCustomAction(id);
      config.save();
      console.log(`Custom action removed: ${id}`);
      break;
    }

    case "reset":
      config.reset();
      config.save();
      console.log("Config reset to defaults.");
      break;

    default:
      console.log(`
Config commands:
  config show                          Show current configuration
  config init                          Create default config file
  config set-device <device-id>        Set Stream Deck model
  config set-key <index> <action-id>   Assign action to key
  config set-dial <index> <action-id>  Assign action to dial
  config set-pedal <index> <action-id> Assign action to pedal
  config add-action <id> [options]     Create custom prompt action
  config remove-action <id>            Remove custom action
  config reset                         Reset to defaults

Config file: ~/.streamdeck-claude/config.json
`);
  }
}

async function sendPrompt(prompt) {
  if (!prompt) {
    console.error("Usage: streamdeck-claude send <prompt>");
    process.exit(1);
  }
  const config = new ConfigManager(getArg("--config"));
  config.load();
  const controller = new ClaudeCodeController({
    claudeBinary: config.toJSON().claude.binary,
    model: config.toJSON().claude.model,
  });
  try {
    const result = await controller.send(prompt);
    console.log(result.result || JSON.stringify(result, null, 2));
  } catch (err) {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  }
}

async function showStatus() {
  const config = new ConfigManager(getArg("--config"));
  config.load();
  const port = config.toJSON().server.port;
  try {
    const res = await fetch(`http://127.0.0.1:${port}/status`);
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
  devices            List all supported Stream Deck models
  actions            List available button/dial/pedal actions
  layouts            Show default layout for each device
  config [cmd]       Manage configuration (device, layout, custom actions)
  send <prompt>      Send a one-shot prompt to Claude
  status             Check bridge server status

Options:
  --port <port>      Bridge server port (default: 8247)
  --deck <device>    Device: mini, neo, standard, scissor, plus, xl,
                     plusXl, studio, pedal, virtual (default: standard)
  --scope <scope>    Hook scope: global, project (default: global)
  --cwd <dir>        Working directory for Claude Code
  --config <path>    Custom config file path
  --type <input>     Filter actions by type: key, dial, pedal, touch

Examples:
  streamdeck-claude setup                              Install hooks
  streamdeck-claude start --deck plus                  Start with SD+
  streamdeck-claude config set-device plusXl            Switch to SD+ XL
  streamdeck-claude config set-key 5 runTests          Remap key 5
  streamdeck-claude config add-action lint \\
    --prompt "Run the linter and fix issues" \\
    --label LINT --color "#ffaa00"                     Add custom action
  streamdeck-claude config set-key 14 lint             Assign custom action
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
