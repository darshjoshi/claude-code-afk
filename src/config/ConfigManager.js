const fs = require("fs");
const path = require("path");
const os = require("os");
const { getDevice, createCustomDevice } = require("../streamdeck/devices");
const { ACTIONS, getLayout, createCustomAction } = require("../streamdeck/actions");

const CONFIG_DIR = path.join(os.homedir(), ".streamdeck-claude");
const CONFIG_FILE = path.join(CONFIG_DIR, "config.json");

/**
 * Manages user configuration: device selection, custom layouts,
 * custom actions, and per-project profiles.
 *
 * Config file: ~/.streamdeck-claude/config.json
 */
class ConfigManager {
  constructor(configPath) {
    this.configPath = configPath || CONFIG_FILE;
    this._config = null;
  }

  /**
   * Load configuration from disk, or return defaults.
   */
  load() {
    try {
      const raw = fs.readFileSync(this.configPath, "utf8");
      this._config = JSON.parse(raw);
    } catch {
      this._config = this._defaults();
    }
    return this._config;
  }

  /**
   * Save current configuration to disk.
   */
  save() {
    const dir = path.dirname(this.configPath);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(
      this.configPath,
      JSON.stringify(this._config, null, 2) + "\n"
    );
  }

  /**
   * Get the resolved device profile (built-in or custom).
   */
  getDevice() {
    const cfg = this._ensureLoaded();
    if (cfg.device.custom) {
      return createCustomDevice(cfg.device.base || "standard", cfg.device.custom);
    }
    return getDevice(cfg.device.id) || getDevice("standard");
  }

  /**
   * Get the resolved layout (built-in default, user-customized, or fully custom).
   */
  getLayout() {
    const cfg = this._ensureLoaded();
    const base = getLayout(cfg.device.id);

    if (!cfg.layout) return base;

    // Merge user layout overrides onto the base layout
    const merged = { ...base };

    if (cfg.layout.keys) {
      merged.keys = { ...base.keys, ...cfg.layout.keys };
    }
    if (cfg.layout.dials) {
      merged.dials = { ...(base.dials || {}), ...cfg.layout.dials };
    }
    if (cfg.layout.pedals) {
      merged.pedals = { ...(base.pedals || {}), ...cfg.layout.pedals };
    }
    if (cfg.layout.touchStrip !== undefined) {
      merged.touchStrip = cfg.layout.touchStrip;
    }
    if (cfg.layout.infobar !== undefined) {
      merged.infobar = cfg.layout.infobar;
    }

    return merged;
  }

  /**
   * Get all actions including user-defined custom ones.
   */
  getActions() {
    const cfg = this._ensureLoaded();
    const actions = { ...ACTIONS };

    if (cfg.customActions) {
      for (const [id, def] of Object.entries(cfg.customActions)) {
        actions[id] = createCustomAction(id, def);
      }
    }

    return actions;
  }

  /**
   * Set which device to use.
   */
  setDevice(deviceId) {
    const cfg = this._ensureLoaded();
    cfg.device.id = deviceId;
    delete cfg.device.custom;
  }

  /**
   * Override a specific key's action.
   */
  setKeyAction(keyIndex, actionId) {
    const cfg = this._ensureLoaded();
    if (!cfg.layout) cfg.layout = {};
    if (!cfg.layout.keys) cfg.layout.keys = {};
    cfg.layout.keys[keyIndex] = actionId;
  }

  /**
   * Override a specific dial's action.
   */
  setDialAction(dialIndex, actionId) {
    const cfg = this._ensureLoaded();
    if (!cfg.layout) cfg.layout = {};
    if (!cfg.layout.dials) cfg.layout.dials = {};
    cfg.layout.dials[dialIndex] = actionId;
  }

  /**
   * Override a specific pedal's action.
   */
  setPedalAction(pedalIndex, actionId) {
    const cfg = this._ensureLoaded();
    if (!cfg.layout) cfg.layout = {};
    if (!cfg.layout.pedals) cfg.layout.pedals = {};
    cfg.layout.pedals[pedalIndex] = actionId;
  }

  /**
   * Add a custom action (user-defined prompt button).
   */
  addCustomAction(id, definition) {
    const cfg = this._ensureLoaded();
    if (!cfg.customActions) cfg.customActions = {};
    cfg.customActions[id] = definition;
  }

  /**
   * Remove a custom action.
   */
  removeCustomAction(id) {
    const cfg = this._ensureLoaded();
    if (cfg.customActions) {
      delete cfg.customActions[id];
    }
  }

  // ── LED configuration ─────────────────────────────────────

  /**
   * Get LED configuration.
   */
  getLedConfig() {
    const cfg = this._ensureLoaded();
    return cfg.leds || {};
  }

  /**
   * Set static LED color for a touch point.
   * @param {string} side - "left" or "right"
   * @param {string} color - Hex color
   * @param {number} [brightness] - 0-100
   */
  setLedColor(side, color, brightness) {
    const cfg = this._ensureLoaded();
    if (!cfg.leds) cfg.leds = {};
    if (!cfg.leds.overrides) cfg.leds.overrides = {};
    cfg.leds.overrides[side] = { color };
    if (brightness !== undefined) {
      cfg.leds.overrides[side].brightness = brightness;
    }
  }

  /**
   * Clear LED color override for a touch point.
   * @param {string} [side] - "left", "right", or omit to clear both
   */
  clearLedColor(side) {
    const cfg = this._ensureLoaded();
    if (!cfg.leds?.overrides) return;
    if (side) {
      delete cfg.leds.overrides[side];
    } else {
      delete cfg.leds.overrides;
    }
  }

  /**
   * Set which LED style to use for a given system state.
   * @param {string} state - System state (idle, active, waiting, permission, attention)
   * @param {string} style - Style name from TOUCH_POINT_STYLES
   */
  setLedStateStyle(state, style) {
    const cfg = this._ensureLoaded();
    if (!cfg.leds) cfg.leds = {};
    if (!cfg.leds.stateStyles) cfg.leds.stateStyles = {};
    cfg.leds.stateStyles[state] = style;
  }

  /**
   * Set the default animation pattern for attention states.
   * @param {string} pattern - "blink", "breathe", "pulse", "rainbow", "chase", "flash"
   */
  setLedAnimation(pattern) {
    const cfg = this._ensureLoaded();
    if (!cfg.leds) cfg.leds = {};
    cfg.leds.animation = pattern;
  }

  /**
   * Set the session color palette.
   * @param {string[]} colors - Array of hex colors
   */
  setSessionColorPalette(colors) {
    const cfg = this._ensureLoaded();
    if (!cfg.leds) cfg.leds = {};
    cfg.leds.sessionColors = colors;
  }

  /**
   * Set a specific session's LED color.
   */
  setSessionLedColor(sessionId, color) {
    const cfg = this._ensureLoaded();
    if (!cfg.leds) cfg.leds = {};
    if (!cfg.leds.sessionOverrides) cfg.leds.sessionOverrides = {};
    cfg.leds.sessionOverrides[sessionId] = color;
  }

  /**
   * Set bridge server options.
   */
  setServer(options) {
    const cfg = this._ensureLoaded();
    Object.assign(cfg.server, options);
  }

  /**
   * Set Claude Code controller options.
   */
  setClaude(options) {
    const cfg = this._ensureLoaded();
    Object.assign(cfg.claude, options);
  }

  /**
   * Reset to defaults.
   */
  reset() {
    this._config = this._defaults();
  }

  /**
   * Get raw config object.
   */
  toJSON() {
    return this._ensureLoaded();
  }

  _ensureLoaded() {
    if (!this._config) {
      this.load();
    }
    return this._config;
  }

  _defaults() {
    return {
      device: {
        id: "standard",
      },
      server: {
        port: 8247,
        host: "127.0.0.1",
      },
      claude: {
        binary: "claude",
        model: null,
        allowedTools: [],
        workingDir: null,
      },
      layout: null, // null = use device default
      customActions: {},
      leds: null, // null = use dynamic defaults
    };
  }
}

module.exports = ConfigManager;
