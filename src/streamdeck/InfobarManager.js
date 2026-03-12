const { EventEmitter } = require("events");
const { getAction, getTouchPointStyle } = require("./actions");

/**
 * Manages the Neo infobar display and touch point LED colors.
 *
 * The infobar shows a context window usage gauge:
 *   ████████░░░░░░░ 54% (108k/200k)
 *
 * Touch point LEDs change color based on system state:
 *   - Idle: dim blue
 *   - Active: green
 *   - Permission needed: orange (blinking)
 *   - Waiting for input: yellow
 *   - Context critical: red
 *
 * Context data is extracted from hook payloads when available,
 * or can be updated directly via updateContext().
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
    this._blinkTimer = null;
    this._blinkState = false;

    // Custom LED overrides (user config)
    this._ledOverrides = options.ledOverrides || null;
  }

  /**
   * Update context window usage.
   * @param {number} tokensUsed - Current tokens in context
   * @param {number} [maxTokens] - Max context window size (optional override)
   */
  updateContext(tokensUsed, maxTokens) {
    if (maxTokens) this._maxTokens = maxTokens;
    this._currentTokens = tokensUsed;
    this._percent = Math.min(100, Math.round((tokensUsed / this._maxTokens) * 100));

    const gauge = this._renderGauge();
    const thresholdColor = this._getThresholdColor();

    // Update the infobar display
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

  /**
   * Set touch point LED style by name or custom config.
   * @param {string|object} style - Style name from TOUCH_POINT_STYLES or { left, right } object
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

  /**
   * Start blinking touch point LEDs (for attention states).
   * Alternates between the given style and dim/off.
   */
  startTouchPointBlink(style, intervalMs = 500) {
    this.stopTouchPointBlink();

    const onStyle = typeof style === "string" ? getTouchPointStyle(style) : style;
    const offStyle = getTouchPointStyle("dim");

    this._blinkState = true;
    this.setTouchPointStyle(style);

    this._blinkTimer = setInterval(() => {
      this._blinkState = !this._blinkState;
      const current = this._blinkState ? onStyle : offStyle;
      this.bridge.broadcast("touchpoint:led", {
        left: current.left,
        right: current.right,
        styleName: this._blinkState ? this._touchPointStyle : "dim",
        blink: true,
      });
    }, intervalMs);
  }

  /**
   * Stop blinking touch point LEDs.
   */
  stopTouchPointBlink() {
    if (this._blinkTimer) {
      clearInterval(this._blinkTimer);
      this._blinkTimer = null;
    }
  }

  /**
   * Set custom LED colors for the touch points (user preference).
   * These override the dynamic style colors.
   * @param {object} overrides - { left: { color, brightness }, right: { color, brightness } }
   */
  setLedOverrides(overrides) {
    this._ledOverrides = overrides;
    // Re-apply current style with new overrides
    this.setTouchPointStyle(this._touchPointStyle);
  }

  /**
   * Clear LED overrides, reverting to dynamic colors.
   */
  clearLedOverrides() {
    this._ledOverrides = null;
    this.setTouchPointStyle(this._touchPointStyle);
  }

  /**
   * Update state based on system events (called by adapter).
   */
  onSystemStateChange(state) {
    // Don't override context-critical LED state
    if (this._percent >= 90) return;
    if (this._percent >= 75) {
      this.setTouchPointStyle("contextWarning");
      return;
    }

    switch (state) {
      case "idle":
      case "offline":
        this.stopTouchPointBlink();
        this.setTouchPointStyle("idle");
        break;
      case "active":
      case "running":
        this.stopTouchPointBlink();
        this.setTouchPointStyle("active");
        break;
      case "waiting":
        this.startTouchPointBlink("waiting");
        break;
      case "permission":
        this.startTouchPointBlink("permission");
        break;
      case "attention":
        this.startTouchPointBlink("attention");
        break;
      default:
        this.stopTouchPointBlink();
        this.setTouchPointStyle("idle");
    }
  }

  /**
   * Get the current gauge state for display.
   */
  getState() {
    return {
      percent: this._percent,
      tokensUsed: this._currentTokens,
      maxTokens: this._maxTokens,
      display: this._renderGauge(),
      color: this._getThresholdColor(),
      touchPointStyle: this._touchPointStyle,
    };
  }

  // ── Internal ───────────────────────────────────────────────

  _renderGauge() {
    const filled = Math.round((this._percent / 100) * this._gaugeWidth);
    const empty = this._gaugeWidth - filled;
    const bar = "█".repeat(filled) + "░".repeat(empty);
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
    this.stopTouchPointBlink();
    this.removeAllListeners();
  }
}

module.exports = InfobarManager;
