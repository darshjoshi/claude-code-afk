const ClaudeCodeController = require("./controller/ClaudeCodeController");
const BridgeServer = require("./bridge/BridgeServer");
const { WebSocketServer } = require("./bridge/WebSocketServer");
const HookReceiver = require("./hooks/HookReceiver");
const { installHooks, uninstallHooks, generateHookConfig } = require("./hooks/installHooks");
const StreamDeckAdapter = require("./streamdeck/StreamDeckAdapter");
const ButtonRenderer = require("./streamdeck/ButtonRenderer");
const AlertManager = require("./streamdeck/AlertManager");
const { DEVICES, getDevice, createCustomDevice, listDevices, describeDevice } = require("./streamdeck/devices");
const {
  ACTIONS, KEY_ACTIONS, DIAL_ACTIONS, PEDAL_ACTIONS, TOUCH_ACTIONS,
  TOUCH_POINT_STYLES, LAYOUTS,
  getAction, getLayout, getTouchPointStyle,
  listActions, listCategories, createCustomAction,
} = require("./streamdeck/actions");
const ConfigManager = require("./config/ConfigManager");
const LayoutManager = require("./streamdeck/LayoutManager");
const InfobarManager = require("./streamdeck/InfobarManager");
const SessionTracker = require("./session/SessionTracker");
const TerminalFocuser = require("./session/TerminalFocuser");

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
  AlertManager,

  // Config
  ConfigManager,
  LayoutManager,
  InfobarManager,

  // Session management
  SessionTracker,
  TerminalFocuser,

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
  TOUCH_POINT_STYLES,
  LAYOUTS,
  getAction,
  getLayout,
  getTouchPointStyle,
  listActions,
  listCategories,
  createCustomAction,

  // Switch primitives
  DynamicSwitch,
  SwitchManager,
};
