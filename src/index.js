const ClaudeCodeController = require("./controller/ClaudeCodeController");
const BridgeServer = require("./bridge/BridgeServer");
const { WebSocketServer } = require("./bridge/WebSocketServer");
const HookReceiver = require("./hooks/HookReceiver");
const { installHooks, uninstallHooks, generateHookConfig } = require("./hooks/installHooks");
const StreamDeckAdapter = require("./streamdeck/StreamDeckAdapter");
const ButtonRenderer = require("./streamdeck/ButtonRenderer");
const { ACTIONS, LAYOUTS, getAction, getLayout, listActions, listCategories } = require("./streamdeck/actions");

// Also re-export the original switch primitives
const DynamicSwitch = require("./DynamicSwitch");
const SwitchManager = require("./SwitchManager");

module.exports = {
  // Core
  ClaudeCodeController,
  BridgeServer,
  WebSocketServer,
  HookReceiver,
  StreamDeckAdapter,
  ButtonRenderer,

  // Hooks
  installHooks,
  uninstallHooks,
  generateHookConfig,

  // Actions & Layouts
  ACTIONS,
  LAYOUTS,
  getAction,
  getLayout,
  listActions,
  listCategories,

  // Switch primitives
  DynamicSwitch,
  SwitchManager,
};
