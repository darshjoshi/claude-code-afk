const { EventEmitter } = require("events");

/**
 * A dynamic, state-aware switch that can be bound to a Stream Deck key.
 * Supports multiple modes: toggle (on/off), cycle (rotate through states),
 * and momentary (active only while held).
 */
class DynamicSwitch extends EventEmitter {
  constructor(config) {
    super();
    this.id = config.id;
    this.name = config.name || config.id;
    this.mode = config.mode || "toggle"; // toggle | cycle | momentary
    this.states = config.states || [
      { label: "OFF", color: "#333333" },
      { label: "ON", color: "#00cc66" },
    ];
    this.currentIndex = config.initialState || 0;
    this.onAction = config.onAction || null;
    this.condition = config.condition || null;
    this.keyIndex = config.keyIndex ?? null;
    this.cooldownMs = config.cooldownMs || 0;
    this._lastPress = 0;
  }

  get currentState() {
    return this.states[this.currentIndex];
  }

  get stateLabel() {
    return this.currentState.label;
  }

  get stateColor() {
    return this.currentState.color;
  }

  get isOn() {
    return this.currentIndex > 0;
  }

  press() {
    const now = Date.now();
    if (this.cooldownMs && now - this._lastPress < this.cooldownMs) {
      return this.currentState;
    }
    this._lastPress = now;

    if (this.condition && !this.condition(this)) {
      this.emit("blocked", { switch: this, reason: "condition not met" });
      return this.currentState;
    }

    const previousIndex = this.currentIndex;

    switch (this.mode) {
      case "toggle":
        this.currentIndex = this.currentIndex === 0 ? 1 : 0;
        break;
      case "cycle":
        this.currentIndex = (this.currentIndex + 1) % this.states.length;
        break;
      case "momentary":
        this.currentIndex = 1;
        break;
      default:
        throw new Error(`Unknown switch mode: ${this.mode}`);
    }

    const result = {
      switchId: this.id,
      previousIndex,
      currentIndex: this.currentIndex,
      state: this.currentState,
    };

    if (this.onAction) {
      this.onAction(result);
    }

    this.emit("change", result);
    return this.currentState;
  }

  release() {
    if (this.mode === "momentary" && this.currentIndex !== 0) {
      const previousIndex = this.currentIndex;
      this.currentIndex = 0;
      const result = {
        switchId: this.id,
        previousIndex,
        currentIndex: 0,
        state: this.currentState,
      };
      this.emit("change", result);
      return this.currentState;
    }
    return this.currentState;
  }

  setState(index) {
    if (index < 0 || index >= this.states.length) {
      throw new RangeError(
        `State index ${index} out of range [0, ${this.states.length - 1}]`
      );
    }
    const previousIndex = this.currentIndex;
    this.currentIndex = index;
    if (previousIndex !== index) {
      this.emit("change", {
        switchId: this.id,
        previousIndex,
        currentIndex: index,
        state: this.currentState,
      });
    }
    return this.currentState;
  }

  reset() {
    return this.setState(0);
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      mode: this.mode,
      currentIndex: this.currentIndex,
      state: this.currentState,
      keyIndex: this.keyIndex,
    };
  }
}

module.exports = DynamicSwitch;
