#!/usr/bin/env node

const ClaudeCodeController = require("../src/controller/ClaudeCodeController");
const BridgeServer = require("../src/bridge/BridgeServer");
const HookReceiver = require("../src/hooks/HookReceiver");
const StreamDeckAdapter = require("../src/streamdeck/StreamDeckAdapter");
const SessionTracker = require("../src/session/SessionTracker");
const TerminalFocuser = require("../src/session/TerminalFocuser");
const { installHooks, uninstallHooks, installStatuslineScript } = require("../src/hooks/installHooks");
const { listActions, listCategories, LAYOUTS } = require("../src/streamdeck/actions");
const { listDevices, describeDevice, getDevice } = require("../src/streamdeck/devices");
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

  // Multi-session support
  const sessionTracker = new SessionTracker();
  const terminalFocuser = new TerminalFocuser();

  const controller = new ClaudeCodeController({ sessionTracker });
  const bridge = new BridgeServer({ port });

  // Resolve layout (config overrides > device defaults)
  const layout = config.getLayout();
  const device = getDevice(deckSize) || { keys: 15, cols: 5 };

  // Load LED configuration from saved preferences
  const ledConfig = config.getLedConfig() || {};

  const adapter = new StreamDeckAdapter(bridge, controller, {
    deckSize,
    layout,
    sessionTracker,
    terminalFocuser,
    device,
    ledOverrides: ledConfig.overrides || null,
    stateStyleMap: ledConfig.stateStyles || null,
    defaultAnimation: ledConfig.animation || null,
    sessionColorPalette: ledConfig.sessionColors || null,
  });

  // Wire hooks to adapter so alerts trigger on attention-needed events
  const hooks = new HookReceiver(bridge, { adapter, sessionTracker });

  // Log hook events
  hooks.on("hook", (event) => {
    console.log(`[hook] ${event.event}${event.tool ? ` (${event.tool})` : ""}${event.sessionId ? ` [${event.sessionId.slice(-4)}]` : ""}`);
  });

  // Log session events
  sessionTracker.on("session:added", ({ sessionId }) => {
    console.log(`[session] Added: ${sessionId.slice(-4)} (${sessionTracker.sessionCount} active)`);
  });
  sessionTracker.on("session:removed", ({ sessionId }) => {
    console.log(`[session] Removed: ${sessionId.slice(-4)} (${sessionTracker.sessionCount} active)`);
  });
  sessionTracker.on("permission:pending", ({ sessionId, tool }) => {
    console.log(`[PERMISSION] Session ${sessionId.slice(-4)} awaiting approval for: ${tool}`);
  });
  sessionTracker.on("permission:resolved", ({ sessionId, decision }) => {
    console.log(`[permission] Session ${sessionId.slice(-4)} -> ${decision}`);
  });
  sessionTracker.on("question:pending", ({ sessionId }) => {
    console.log(`[QUESTION] Session ${sessionId.slice(-4)} waiting for response`);
  });
  sessionTracker.on("question:resolved", ({ sessionId }) => {
    console.log(`[question] Session ${sessionId.slice(-4)} question resolved`);
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

  const deviceInfo = config.getDevice();
  const layoutName = layout.name || deckSize;
  console.log(`
┌─────────────────────────────────────────────────┐
│  Stream Deck <-> Claude Code Bridge             │
├─────────────────────────────────────────────────┤
│  Server:    http://127.0.0.1:${String(port).padEnd(21)}│
│  WebSocket: ws://127.0.0.1:${String(port).padEnd(23)}│
│  Device:    ${deviceInfo.name.padEnd(37)}│
│  Layout:    ${layoutName.substring(0, 37).padEnd(37)}│
├─────────────────────────────────────────────────┤
│  Inputs: ${String(deviceInfo.keys || 0).padStart(2)} keys, ${String(deviceInfo.dials || 0)} dials, ${String(deviceInfo.pedals || 0)} pedals${" ".repeat(11)}│
│  Multi-session: enabled                        │
├─────────────────────────────────────────────────┤
│  Hook endpoints:                                │
│    POST /hooks/notification                     │
│    POST /hooks/stop                             │
│    POST /hooks/pre-tool-use                     │
│    POST /hooks/post-tool-use                    │
│    POST /hooks/permission-request               │
│    POST /hooks/session-start                    │
│    POST /hooks/session-end                      │
│    POST /hooks/statusline                       │
│                                                 │
│  Status: GET /status                            │
│  Simulator: http://127.0.0.1:${String(port).padEnd(19)}│
│             /simulator                          │
└─────────────────────────────────────────────────┘
`);

  process.on("SIGINT", async () => {
    console.log("\nShutting down...");
    sessionTracker.destroy();
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

  console.log(`\nInstalling statusline script...`);
  const slResult = installStatuslineScript({ port });
  console.log(`Statusline script: ${slResult.scriptPath}`);

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

    // ── LED commands ────────────────────────────────────────
    case "set-led": {
      const side = args[1];
      const color = args[2];
      const brightness = args[3] ? parseInt(args[3], 10) : undefined;
      if (!side || !color || !["left", "right"].includes(side)) {
        console.error("Usage: streamdeck-claude config set-led <left|right> <#hex> [brightness]");
        console.error("Example: streamdeck-claude config set-led left #ff00ff 80");
        process.exit(1);
      }
      config.setLedColor(side, color, brightness);
      config.save();
      console.log(`LED ${side}: ${color}${brightness !== undefined ? ` @ ${brightness}%` : ""}`);
      break;
    }

    case "clear-led": {
      const side = args[1]; // optional
      if (side && !["left", "right"].includes(side)) {
        console.error("Usage: streamdeck-claude config clear-led [left|right]");
        process.exit(1);
      }
      config.clearLedColor(side);
      config.save();
      console.log(side ? `LED ${side} override cleared` : "All LED overrides cleared");
      break;
    }

    case "set-led-state": {
      const state = args[1];
      const style = args[2];
      const validStates = ["idle", "active", "running", "waiting", "permission", "attention", "offline"];
      const validStyles = ["idle", "active", "attention", "permission", "waiting", "dim", "off",
        "navHighlight", "contextWarning", "contextCritical"];
      if (!state || !style) {
        console.error("Usage: streamdeck-claude config set-led-state <state> <style>");
        console.error(`  States:  ${validStates.join(", ")}`);
        console.error(`  Styles:  ${validStyles.join(", ")}`);
        console.error("Example: streamdeck-claude config set-led-state active permission");
        process.exit(1);
      }
      config.setLedStateStyle(state, style);
      config.save();
      console.log(`LED state "${state}" -> style "${style}"`);
      break;
    }

    case "set-led-animation": {
      const pattern = args[1];
      const validPatterns = ["blink", "breathe", "pulse", "rainbow", "chase", "flash"];
      if (!pattern || !validPatterns.includes(pattern)) {
        console.error("Usage: streamdeck-claude config set-led-animation <pattern>");
        console.error(`  Patterns: ${validPatterns.join(", ")}`);
        process.exit(1);
      }
      config.setLedAnimation(pattern);
      config.save();
      console.log(`LED animation: ${pattern}`);
      break;
    }

    case "set-session-palette": {
      // Remaining args are colors
      const colors = args.slice(1).filter((c) => c.startsWith("#"));
      if (colors.length === 0) {
        console.error("Usage: streamdeck-claude config set-session-palette #color1 #color2 ...");
        console.error("Example: streamdeck-claude config set-session-palette #ff6600 #cc00ff #00ccff");
        process.exit(1);
      }
      config.setSessionColorPalette(colors);
      config.save();
      console.log(`Session color palette: ${colors.join(", ")}`);
      break;
    }

    case "show-led": {
      const ledCfg = config.getLedConfig();
      if (!ledCfg || Object.keys(ledCfg).length === 0) {
        console.log("LEDs: using dynamic defaults (no custom config)");
      } else {
        console.log("LED Configuration:");
        if (ledCfg.overrides) {
          console.log("  Static overrides:");
          for (const [side, val] of Object.entries(ledCfg.overrides)) {
            console.log(`    ${side}: ${val.color}${val.brightness !== undefined ? ` @ ${val.brightness}%` : ""}`);
          }
        }
        if (ledCfg.stateStyles) {
          console.log("  State-to-style mapping:");
          for (const [state, style] of Object.entries(ledCfg.stateStyles)) {
            console.log(`    ${state} -> ${style}`);
          }
        }
        if (ledCfg.animation) {
          console.log(`  Animation pattern: ${ledCfg.animation}`);
        }
        if (ledCfg.sessionColors) {
          console.log(`  Session palette: ${ledCfg.sessionColors.join(", ")}`);
        }
        if (ledCfg.sessionOverrides) {
          console.log("  Session overrides:");
          for (const [sid, color] of Object.entries(ledCfg.sessionOverrides)) {
            console.log(`    ${sid}: ${color}`);
          }
        }
      }
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
  config reset                         Reset to defaults

LED commands:
  config set-led <left|right> <#hex> [brightness]
                                       Set static LED color
  config clear-led [left|right]        Clear LED overrides
  config set-led-state <state> <style> Map system state to LED style
  config set-led-animation <pattern>   Set attention animation
                                       (blink/breathe/pulse/rainbow/chase/flash)
  config set-session-palette <colors>  Set session color palette
  config show-led                      Show current LED config

Config file: ~/.streamdeck-claude/config.json
`);
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
streamdeck-claude — Control Claude Code sessions from your Stream Deck

Commands:
  start              Start the bridge server
  setup              Install Claude Code hooks
  uninstall          Remove Claude Code hooks
  devices            List all supported Stream Deck models
  actions            List available button/dial/pedal actions
  layouts            Show default layout for each device
  config [cmd]       Manage configuration (device, layout, LEDs)
  status             Check bridge server status

Options:
  --port <port>      Bridge server port (default: 8247)
  --deck <device>    Device: mini, neo, standard, scissor, plus, xl,
                     plusXl, studio, pedal, virtual (default: standard)
  --scope <scope>    Hook scope: global, project (default: global)
  --config <path>    Custom config file path
  --type <input>     Filter actions by type: key, dial, pedal, touch

Examples:
  streamdeck-claude setup                              Install hooks
  streamdeck-claude start --deck plus                  Start with SD+
  streamdeck-claude config set-device plusXl            Switch to SD+ XL
  streamdeck-claude config set-key 5 answerYes         Remap key 5
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
