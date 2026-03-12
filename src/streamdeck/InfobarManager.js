const { EventEmitter } = require("events");
const { getAction, getTouchPointStyle } = require("./actions");

/**
 * Manages the Neo infobar display and touch point LED colors.
 *
 * Features:
 *   - Context window gauge with color-coded thresholds
 *   - Dynamic LED colors that react to system state
 *   - Animation patterns: breathing, pulse, rainbow, chase, flash
 *   - Per-session LED colors (different colors per session needing attention)
 *   - Custom state-to-color mapping (user-configurable)
 *   - Persistent LED preferences via config
 */
class InfobarManager extends EventEmitter {
  constructor(bridge, options = {}) {
    super();
    this.bridge = bridge;
    this._maxTokens = options.maxTokens || 200000;
    this._currentTokens = 0;
    this._percent = 0;
    this._gaugeWidth = options.gaugeWidth || 15;
    this._touchPointStyle = "idle";
    this._animationTimer = null;
    this._animationFrame = 0;
    this._blinkState = false;

    // Custom LED overrides (user config)
    this._ledOverrides = options.ledOverrides || null;

    // Custom state-to-style mapping (user can remap which colors appear for which states)
    this._stateStyleMap = Object.assign(
      {
        idle: "idle",
        offline: "idle",
        active: "active",
        running: "active",
        waiting: "waiting",
        permission: "permission",
        attention: "attention",
      },
      options.stateStyleMap || {}
    );

    // Session color palette — each concurrent session gets a unique color
    this._sessionColorPalette = options.sessionColorPalette || [
      "#ff6600", // orange
      "#cc00ff", // purple
      "#00ccff", // cyan
      "#ff0066", // pink
      "#66ff00", // lime
      "#ffcc00", // gold
      "#0066ff", // blue
      "#ff3300", // red-orange
    ];
    this._sessionColorMap = new Map(); // sessionId -> color
    this._nextColorIndex = 0;
  }

  // ── Context gauge ──────────────────────────────────────────

  /**
   * Update context window usage.
   */
  updateContext(tokensUsed, maxTokens) {
    if (maxTokens) this._maxTokens = maxTokens;
    this._currentTokens = tokensUsed;
    this._percent = Math.min(100, Math.round((tokensUsed / this._maxTokens) * 100));

    const gauge = this._renderGauge();
    const thresholdColor = this._getThresholdColor();

    this.bridge.broadcast("infobar:update", {
      actionId: "contextGauge",
      display: gauge,
      percent: this._percent,
      tokensUsed: this._currentTokens,
      maxTokens: this._maxTokens,
      color: thresholdColor,
      formatted: this._formatTokens(this._currentTokens),
      maxFormatted: this._formatTokens(this._maxTokens),
    });

    // Update touch point LEDs based on context level
    if (this._percent >= 90) {
      this.setTouchPointStyle("contextCritical");
    } else if (this._percent >= 75) {
      this.setTouchPointStyle("contextWarning");
    }

    this.emit("context:updated", {
      percent: this._percent,
      tokensUsed: this._currentTokens,
      maxTokens: this._maxTokens,
    });
  }

  // ── Touch point LED styles ─────────────────────────────────

  /**
   * Set touch point LED style by name or custom config.
   */
  setTouchPointStyle(style) {
    let source;
    if (typeof style === "string") {
      this._touchPointStyle = style;
      source = getTouchPointStyle(style);
    } else {
      this._touchPointStyle = "custom";
      source = style;
    }

    // Deep clone to avoid mutating the style registry
    const resolved = {
      left: { ...source.left },
      right: { ...source.right },
    };

    // Apply user overrides if present
    if (this._ledOverrides) {
      if (this._ledOverrides.left) {
        Object.assign(resolved.left, this._ledOverrides.left);
      }
      if (this._ledOverrides.right) {
        Object.assign(resolved.right, this._ledOverrides.right);
      }
    }

    this.bridge.broadcast("touchpoint:led", {
      left: resolved.left,
      right: resolved.right,
      styleName: this._touchPointStyle,
    });

    this.emit("touchpoint:changed", { style: this._touchPointStyle, resolved });
  }

  // ── Animation patterns ─────────────────────────────────────

  /**
   * Start an animation pattern on the touch point LEDs.
   *
   * @param {string} pattern - "blink", "breathe", "pulse", "rainbow", "chase", "flash"
   * @param {object} [options]
   * @param {string} [options.color] - Primary color (for single-color patterns)
   * @param {string} [options.style] - Style name to use as the "on" color
   * @param {number} [options.intervalMs] - Animation speed (default varies by pattern)
   * @param {number} [options.steps] - Number of animation steps (for smooth patterns)
   * @param {string[]} [options.colors] - Color list (for rainbow/chase)
   */
  startAnimation(pattern, options = {}) {
    this.stopAnimation();

    switch (pattern) {
      case "blink":
        this._animateBlink(options);
        break;
      case "breathe":
        this._animateBreathe(options);
        break;
      case "pulse":
        this._animatePulse(options);
        break;
      case "rainbow":
        this._animateRainbow(options);
        break;
      case "chase":
        this._animateChase(options);
        break;
      case "flash":
        this._animateFlash(options);
        break;
      default:
        // Unknown pattern, fall back to blink
        this._animateBlink(options);
    }

    this.emit("animation:started", { pattern, options });
  }

  /**
   * Stop any running animation.
   */
  stopAnimation() {
    if (this._animationTimer) {
      clearInterval(this._animationTimer);
      this._animationTimer = null;
    }
    this._animationFrame = 0;
  }

  /**
   * Check if an animation is currently running.
   */
  get isAnimating() {
    return this._animationTimer !== null;
  }

  // Blink: alternates between on-color and dim
  _animateBlink(options) {
    const onStyle = options.style
      ? getTouchPointStyle(options.style)
      : options.color
        ? { left: { color: options.color, brightness: 100 }, right: { color: options.color, brightness: 100 } }
        : getTouchPointStyle(this._touchPointStyle);
    const offStyle = getTouchPointStyle("dim");
    const intervalMs = options.intervalMs || 500;

    this._blinkState = true;
    this._broadcastLed(onStyle, true);

    this._animationTimer = setInterval(() => {
      this._blinkState = !this._blinkState;
      this._broadcastLed(this._blinkState ? onStyle : offStyle, true);
    }, intervalMs);
  }

  // Breathe: smooth fade in/out using brightness ramp
  _animateBreathe(options) {
    const color = options.color || "#4488ff";
    const steps = options.steps || 30;
    const intervalMs = options.intervalMs || 50; // 50ms * 30 steps = 1.5s per cycle
    this._animationFrame = 0;

    this._animationTimer = setInterval(() => {
      // Sine wave for smooth breathing: 0 → 100 → 0
      const phase = (this._animationFrame % (steps * 2)) / steps;
      const brightness = Math.round(
        phase <= 1
          ? phase * 100          // fade in
          : (2 - phase) * 100    // fade out
      );

      this._broadcastLed({
        left: { color, brightness },
        right: { color, brightness },
      }, true);

      this._animationFrame++;
    }, intervalMs);
  }

  // Pulse: quick bright flash then slow fade (like a heartbeat)
  _animatePulse(options) {
    const color = options.color || "#cc0000";
    const steps = options.steps || 20;
    const intervalMs = options.intervalMs || 40;
    this._animationFrame = 0;

    this._animationTimer = setInterval(() => {
      const frame = this._animationFrame % (steps + 10); // 10 frames of rest
      let brightness;

      if (frame < 3) {
        // Quick flash up
        brightness = Math.round((frame / 2) * 100);
      } else if (frame < steps) {
        // Slow decay
        brightness = Math.round(((steps - frame) / steps) * 100);
      } else {
        // Rest period
        brightness = 0;
      }

      this._broadcastLed({
        left: { color, brightness },
        right: { color, brightness },
      }, true);

      this._animationFrame++;
    }, intervalMs);
  }

  // Rainbow: cycle through hue spectrum
  _animateRainbow(options) {
    const steps = options.steps || 60;
    const intervalMs = options.intervalMs || 80;
    const brightness = options.brightness || 80;
    this._animationFrame = 0;

    this._animationTimer = setInterval(() => {
      const hue = (this._animationFrame % steps) / steps;
      // Offset right LED by half cycle for a nice effect
      const hueRight = ((this._animationFrame + Math.floor(steps / 2)) % steps) / steps;

      this._broadcastLed({
        left: { color: hslToHex(hue, 1, 0.5), brightness },
        right: { color: hslToHex(hueRight, 1, 0.5), brightness },
      }, true);

      this._animationFrame++;
    }, intervalMs);
  }

  // Chase: color bounces left → right → left
  _animateChase(options) {
    const colors = options.colors || ["#ff6600", "#4488ff"];
    const intervalMs = options.intervalMs || 300;
    this._animationFrame = 0;

    this._animationTimer = setInterval(() => {
      const frame = this._animationFrame % 4;
      let left, right;

      switch (frame) {
        case 0: // Left on, right dim
          left = { color: colors[0], brightness: 100 };
          right = { color: colors[0], brightness: 10 };
          break;
        case 1: // Both on
          left = { color: colors[0], brightness: 60 };
          right = { color: colors[0], brightness: 100 };
          break;
        case 2: // Left dim, right on with color 2
          left = { color: colors[1 % colors.length], brightness: 10 };
          right = { color: colors[1 % colors.length], brightness: 100 };
          break;
        case 3: // Both with color 2
          left = { color: colors[1 % colors.length], brightness: 100 };
          right = { color: colors[1 % colors.length], brightness: 60 };
          break;
      }

      this._broadcastLed({ left, right }, true);
      this._animationFrame++;
    }, intervalMs);
  }

  // Flash: rapid strobe (use sparingly!)
  _animateFlash(options) {
    const color = options.color || "#ffffff";
    const intervalMs = options.intervalMs || 100;
    this._animationFrame = 0;

    this._animationTimer = setInterval(() => {
      const on = this._animationFrame % 2 === 0;
      this._broadcastLed({
        left: { color, brightness: on ? 100 : 0 },
        right: { color, brightness: on ? 100 : 0 },
      }, true);
      this._animationFrame++;
    }, intervalMs);
  }

  _broadcastLed(style, isAnimation = false) {
    this.bridge.broadcast("touchpoint:led", {
      left: style.left,
      right: style.right,
      styleName: isAnimation ? "animation" : this._touchPointStyle,
      animation: isAnimation,
    });
  }

  // ── Legacy blink (backward compat) ─────────────────────────

  startTouchPointBlink(style, intervalMs = 500) {
    this.startAnimation("blink", { style, intervalMs });
  }

  stopTouchPointBlink() {
    this.stopAnimation();
  }

  // ── Per-session LED colors ─────────────────────────────────

  /**
   * Get or assign a unique color for a session.
   */
  getSessionColor(sessionId) {
    if (!this._sessionColorMap.has(sessionId)) {
      const color = this._sessionColorPalette[
        this._nextColorIndex % this._sessionColorPalette.length
      ];
      this._sessionColorMap.set(sessionId, color);
      this._nextColorIndex++;
    }
    return this._sessionColorMap.get(sessionId);
  }

  /**
   * Set a specific color for a session (user override).
   */
  setSessionColor(sessionId, color) {
    this._sessionColorMap.set(sessionId, color);
  }

  /**
   * Remove a session's color assignment.
   */
  removeSessionColor(sessionId) {
    this._sessionColorMap.delete(sessionId);
  }

  /**
   * Show a session's assigned color on the LEDs.
   * Left LED shows the session color, right shows the state color.
   */
  showSessionAlert(sessionId, state) {
    const sessionColor = this.getSessionColor(sessionId);
    const stateStyleName = this._stateStyleMap[state] || "attention";
    const stateStyle = getTouchPointStyle(stateStyleName);

    this.startAnimation("blink", {
      style: {
        left: { color: sessionColor, brightness: 100 },
        right: { ...stateStyle.right },
      },
      intervalMs: state === "permission" ? 400 : 600,
    });
  }

  // ── Custom state-to-style mapping ──────────────────────────

  /**
   * Override which LED style is used for a given system state.
   * @param {string} state - System state name
   * @param {string} styleName - Touch point style name to use
   */
  setStateStyle(state, styleName) {
    this._stateStyleMap[state] = styleName;
  }

  /**
   * Get the current state-to-style mapping.
   */
  getStateStyleMap() {
    return { ...this._stateStyleMap };
  }

  // ── Overrides ──────────────────────────────────────────────

  /**
   * Set custom LED colors for the touch points (user preference).
   * These override the dynamic style colors.
   */
  setLedOverrides(overrides) {
    this._ledOverrides = overrides;
    this.setTouchPointStyle(this._touchPointStyle);
  }

  /**
   * Clear LED overrides, reverting to dynamic colors.
   */
  clearLedOverrides() {
    this._ledOverrides = null;
    this.setTouchPointStyle(this._touchPointStyle);
  }

  // ── System state handler ───────────────────────────────────

  /**
   * Update LED state based on system events (called by adapter).
   */
  onSystemStateChange(state) {
    // Don't override context-critical LED state
    if (this._percent >= 90) return;
    if (this._percent >= 75) {
      this.setTouchPointStyle("contextWarning");
      return;
    }

    const styleName = this._stateStyleMap[state] || "idle";

    // Animated states
    if (state === "waiting" || state === "permission" || state === "attention") {
      this.startAnimation("blink", { style: styleName, intervalMs: 500 });
    } else {
      this.stopAnimation();
      this.setTouchPointStyle(styleName);
    }
  }

  // ── State ──────────────────────────────────────────────────

  getState() {
    return {
      percent: this._percent,
      tokensUsed: this._currentTokens,
      maxTokens: this._maxTokens,
      display: this._renderGauge(),
      color: this._getThresholdColor(),
      touchPointStyle: this._touchPointStyle,
      isAnimating: this.isAnimating,
      stateStyleMap: { ...this._stateStyleMap },
      sessionColors: Object.fromEntries(this._sessionColorMap),
    };
  }

  // ── Internal ───────────────────────────────────────────────

  _renderGauge() {
    const filled = Math.round((this._percent / 100) * this._gaugeWidth);
    const empty = this._gaugeWidth - filled;
    const bar = "\u2588".repeat(filled) + "\u2591".repeat(empty);
    const tokensStr = this._formatTokens(this._currentTokens);
    const maxStr = this._formatTokens(this._maxTokens);
    return `${bar} ${this._percent}% (${tokensStr}/${maxStr})`;
  }

  _getThresholdColor() {
    const action = getAction("contextGauge");
    const thresholds = action?.thresholds || {};

    if (this._percent < (thresholds.low?.below || 50)) {
      return thresholds.low?.color || "#00cc66";
    }
    if (this._percent < (thresholds.medium?.below || 75)) {
      return thresholds.medium?.color || "#ffcc00";
    }
    if (this._percent < (thresholds.high?.below || 90)) {
      return thresholds.high?.color || "#ff6600";
    }
    return thresholds.critical?.color || "#cc0000";
  }

  _formatTokens(n) {
    if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
    if (n >= 1000) return `${Math.round(n / 1000)}k`;
    return String(n);
  }

  destroy() {
    this.stopAnimation();
    this.removeAllListeners();
  }
}

// ── Helpers ────────────────────────────────────────────────────

/**
 * Convert HSL (0-1 range) to hex color string.
 */
function hslToHex(h, s, l) {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h * 6) % 2) - 1));
  const m = l - c / 2;
  let r, g, b;

  const sector = Math.floor(h * 6) % 6;
  switch (sector) {
    case 0: r = c; g = x; b = 0; break;
    case 1: r = x; g = c; b = 0; break;
    case 2: r = 0; g = c; b = x; break;
    case 3: r = 0; g = x; b = c; break;
    case 4: r = x; g = 0; b = c; break;
    case 5: r = c; g = 0; b = x; break;
  }

  const toHex = (v) => Math.round((v + m) * 255).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

module.exports = InfobarManager;
module.exports.hslToHex = hslToHex;
