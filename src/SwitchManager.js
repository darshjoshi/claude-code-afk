const { EventEmitter } = require("events");
const DynamicSwitch = require("./DynamicSwitch");

/**
 * Manages a collection of DynamicSwitches, maps them to Stream Deck keys,
 * and provides a unified API for handling key events.
 */
class SwitchManager extends EventEmitter {
  constructor() {
    super();
    this.switches = new Map();
    this.keyMap = new Map(); // keyIndex -> switchId
  }

  add(config) {
    if (this.switches.has(config.id)) {
      throw new Error(`Switch "${config.id}" already exists`);
    }

    const sw = new DynamicSwitch(config);

    sw.on("change", (event) => {
      this.emit("switch:change", event);
    });

    sw.on("blocked", (event) => {
      this.emit("switch:blocked", event);
    });

    this.switches.set(config.id, sw);

    if (sw.keyIndex !== null) {
      this.keyMap.set(sw.keyIndex, sw.id);
    }

    this.emit("switch:added", { switchId: sw.id });
    return sw;
  }

  remove(id) {
    const sw = this.switches.get(id);
    if (!sw) return false;

    sw.removeAllListeners();
    if (sw.keyIndex !== null) {
      this.keyMap.delete(sw.keyIndex);
    }
    this.switches.delete(id);
    this.emit("switch:removed", { switchId: id });
    return true;
  }

  get(id) {
    return this.switches.get(id) || null;
  }

  getByKey(keyIndex) {
    const id = this.keyMap.get(keyIndex);
    return id ? this.switches.get(id) : null;
  }

  handleKeyDown(keyIndex) {
    const sw = this.getByKey(keyIndex);
    if (sw) {
      return sw.press();
    }
    return null;
  }

  handleKeyUp(keyIndex) {
    const sw = this.getByKey(keyIndex);
    if (sw) {
      return sw.release();
    }
    return null;
  }

  loadConfig(configs) {
    const results = [];
    for (const config of configs) {
      results.push(this.add(config));
    }
    return results;
  }

  snapshot() {
    const result = {};
    for (const [id, sw] of this.switches) {
      result[id] = sw.toJSON();
    }
    return result;
  }

  get size() {
    return this.switches.size;
  }

  [Symbol.iterator]() {
    return this.switches.values();
  }
}

module.exports = SwitchManager;
