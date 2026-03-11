const ClaudeCodeController = require("./controller/ClaudeCodeController");
const BridgeServer = require("./bridge/BridgeServer");
const { WebSocketServer } = require("./bridge/WebSocketServer");
const HookReceiver = require("./hooks/HookReceiver");
const { installHooks, uninstallHooks, generateHookConfig } = require("./hooks/installHooks");
const StreamDeckAdapter = require("./streamdeck/StreamDeckAdapter");
const ButtonRenderer = require("./streamdeck/ButtonRenderer");
const { DEVICES, getDevice, createCustomDevice, listDevices, describeDevice } = require("./streamdeck/devices");
const {
  ACTIONS, KEY_ACTIONS, DIAL_ACTIONS, PEDAL_ACTIONS, TOUCH_ACTIONS,
  LAYOUTS, getAction, getLayout, listActions, listCategories, createCustomAction,
} = require("./streamdeck/actions");
const ConfigManager = require("./config/ConfigManager");

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

  // Config
  ConfigManager,

  // Hooks
  installHooks,
  uninstallHooks,
  generateHookConfig,

  // Devices
  DEVICES,
  getDevice,
  createCustomDevice,
  listDevices,
  describeDevice,

  // Actions & Layouts
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

  // Switch primitives
  DynamicSwitch,
  SwitchManager,
};
