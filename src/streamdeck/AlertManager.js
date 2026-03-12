const { EventEmitter } = require("events");

/**
 * Manages blinking alert states for Stream Deck buttons.
 *
 * When Claude Code needs attention (permission request, notification,
 * waiting for user input), this triggers a fast-blinking red alert
 * on a designated button. The blink alternates between two frames
 * at a configurable rate.
 *
 * The alert persists until explicitly dismissed (user presses the
 * button, sends a response, or the hook reports Claude resumed).
 */
class AlertManager extends EventEmitter {
  constructor(options = {}) {
    super();
    this.blinkIntervalMs = options.blinkIntervalMs || 500;
    this._alerts = new Map(); // buttonId -> { timer, frame, reason, ... }
  }

  /**
   * Start blinking a button.
   * @param {string} buttonId - The button to blink
   * @param {object} options
   * @param {string} options.reason - Why the alert fired (notification, permission, etc.)
   * @param {string} options.label - Text to show on the ON frame
   * @param {string} options.sublabel - Optional sublabel
   * @param {string} options.onColor - Blink ON color (default: #cc0000 red)
   * @param {string} options.offColor - Blink OFF color (default: #330000 dark red)
   * @param {string} options.icon - Icon to show (default: alert)
   */
  startAlert(buttonId, options = {}) {
    // Clear any existing alert on this button
    this.clearAlert(buttonId);

    const alert = {
      buttonId,
      reason: options.reason || "unknown",
      label: options.label || "RESPOND",
      sublabel: options.sublabel || "",
      onColor: options.onColor || "#cc0000",
      offColor: options.offColor || "#330000",
      icon: options.icon || "alert",
      frame: 0, // 0 = ON (bright), 1 = OFF (dim)
      startedAt: Date.now(),
      timer: null,
    };

    alert.timer = setInterval(() => {
      alert.frame = alert.frame === 0 ? 1 : 0;
      this.emit("blink", {
        buttonId,
        frame: alert.frame,
        state: this._frameState(alert),
      });
    }, this.blinkIntervalMs);

    this._alerts.set(buttonId, alert);

    // Emit initial ON frame immediately
    this.emit("blink", {
      buttonId,
      frame: 0,
      state: this._frameState(alert),
    });

    this.emit("alert:start", {
      buttonId,
      reason: alert.reason,
    });

    return alert;
  }

  /**
   * Stop blinking a button and return it to normal.
   */
  clearAlert(buttonId) {
    const alert = this._alerts.get(buttonId);
    if (!alert) return false;

    clearInterval(alert.timer);
    this._alerts.delete(buttonId);

    this.emit("alert:clear", {
      buttonId,
      reason: alert.reason,
      duration: Date.now() - alert.startedAt,
    });

    return true;
  }

  /**
   * Clear all active alerts.
   */
  clearAll() {
    const cleared = [];
    for (const buttonId of this._alerts.keys()) {
      cleared.push(buttonId);
      this.clearAlert(buttonId);
    }
    return cleared;
  }

  /**
   * Clear all alerts whose buttonId starts with a given prefix.
   * Useful for clearing all session-related alerts (e.g., "session:").
   */
  clearByPrefix(prefix) {
    const cleared = [];
    for (const buttonId of this._alerts.keys()) {
      if (buttonId.startsWith(prefix)) {
        cleared.push(buttonId);
        this.clearAlert(buttonId);
      }
    }
    return cleared;
  }

  /**
   * Get all currently alerting button IDs.
   */
  getAlertingIds() {
    return [...this._alerts.keys()];
  }

  /**
   * Check if a button is currently alerting.
   */
  isAlerting(buttonId) {
    return this._alerts.has(buttonId);
  }

  /**
   * Check if any alerts are active.
   */
  get hasActiveAlerts() {
    return this._alerts.size > 0;
  }

  /**
   * Get all active alert button IDs.
   */
  get activeAlerts() {
    return [...this._alerts.keys()];
  }

  /**
   * Get the current visual state for an alert frame.
   */
  _frameState(alert) {
    if (alert.frame === 0) {
      // ON frame — bright, fully visible
      return {
        label: alert.label,
        sublabel: alert.sublabel,
        color: alert.onColor,
        icon: alert.icon,
        blink: true,
      };
    }
    // OFF frame — dim/dark
    return {
      label: alert.label,
      sublabel: alert.sublabel,
      color: alert.offColor,
      icon: alert.icon,
      blink: true,
    };
  }

  destroy() {
    this.clearAll();
    this.removeAllListeners();
  }
}

module.exports = AlertManager;
