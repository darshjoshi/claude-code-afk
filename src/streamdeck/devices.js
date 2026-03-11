/**
 * Complete Elgato Stream Deck device registry.
 * Every model with its physical input capabilities and grid dimensions.
 */

const DEVICES = {
  mini: {
    id: "mini",
    name: "Stream Deck Mini",
    keys: 6,
    rows: 2,
    cols: 3,
    dials: 0,
    touchStrips: 0,
    touchPoints: 0,
    pedals: 0,
    keySize: 80, // px per key icon
  },

  neo: {
    id: "neo",
    name: "Stream Deck Neo",
    keys: 8,
    rows: 2,
    cols: 4,
    dials: 0,
    touchStrips: 0,
    touchPoints: 2, // left/right page navigation
    pedals: 0,
    hasInfobar: true, // small LCD strip between touch points
    keySize: 96,
  },

  standard: {
    id: "standard",
    name: "Stream Deck MK.2",
    keys: 15,
    rows: 3,
    cols: 5,
    dials: 0,
    touchStrips: 0,
    touchPoints: 0,
    pedals: 0,
    keySize: 72,
  },

  scissor: {
    id: "scissor",
    name: "Stream Deck Scissor Keys",
    keys: 15,
    rows: 3,
    cols: 5,
    dials: 0,
    touchStrips: 0,
    touchPoints: 0,
    pedals: 0,
    keySize: 72,
  },

  plus: {
    id: "plus",
    name: "Stream Deck +",
    keys: 8,
    rows: 2,
    cols: 4,
    dials: 4,
    touchStrips: 1,
    touchPoints: 0,
    pedals: 0,
    keySize: 120,
  },

  xl: {
    id: "xl",
    name: "Stream Deck XL",
    keys: 32,
    rows: 4,
    cols: 8,
    dials: 0,
    touchStrips: 0,
    touchPoints: 0,
    pedals: 0,
    keySize: 96,
  },

  plusXl: {
    id: "plusXl",
    name: "Stream Deck + XL",
    keys: 36,
    rows: 4,
    cols: 9,
    dials: 6,
    touchStrips: 1,
    touchPoints: 0,
    pedals: 0,
    keySize: 96,
  },

  studio: {
    id: "studio",
    name: "Stream Deck Studio",
    keys: 32,
    rows: 4,
    cols: 8,
    dials: 2,
    touchStrips: 0,
    touchPoints: 0,
    pedals: 0,
    hasNfc: true,
    hasEthernet: true,
    keySize: 96,
  },

  pedal: {
    id: "pedal",
    name: "Stream Deck Pedal",
    keys: 0,
    rows: 0,
    cols: 0,
    dials: 0,
    touchStrips: 0,
    touchPoints: 0,
    pedals: 3,
    keySize: 0,
  },

  virtual: {
    id: "virtual",
    name: "Virtual Stream Deck",
    keys: 64, // max, user-configurable
    rows: 8,
    cols: 8,
    dials: 0,
    touchStrips: 0,
    touchPoints: 0,
    pedals: 0,
    keySize: 72,
    isVirtual: true,
  },

  module6: {
    id: "module6",
    name: "Stream Deck Module (6-key)",
    keys: 6,
    rows: 2,
    cols: 3,
    dials: 0,
    touchStrips: 0,
    touchPoints: 0,
    pedals: 0,
    keySize: 80,
  },

  module15: {
    id: "module15",
    name: "Stream Deck Module (15-key)",
    keys: 15,
    rows: 3,
    cols: 5,
    dials: 0,
    touchStrips: 0,
    touchPoints: 0,
    pedals: 0,
    keySize: 72,
  },

  module32: {
    id: "module32",
    name: "Stream Deck Module (32-key)",
    keys: 32,
    rows: 4,
    cols: 8,
    dials: 0,
    touchStrips: 0,
    touchPoints: 0,
    pedals: 0,
    keySize: 96,
  },

  // Fully custom — user specifies everything
  custom: {
    id: "custom",
    name: "Custom Device",
    keys: 0,
    rows: 0,
    cols: 0,
    dials: 0,
    touchStrips: 0,
    touchPoints: 0,
    pedals: 0,
    keySize: 72,
  },
};

/**
 * Get a device by ID. Returns null if not found.
 */
function getDevice(id) {
  return DEVICES[id] || null;
}

/**
 * Create a custom device profile by overriding base device properties.
 */
function createCustomDevice(base, overrides) {
  const baseDevice = typeof base === "string" ? DEVICES[base] : base;
  if (!baseDevice) {
    throw new Error(`Unknown base device: ${base}`);
  }
  return {
    ...baseDevice,
    ...overrides,
    id: overrides.id || `${baseDevice.id}-custom`,
    name: overrides.name || `${baseDevice.name} (Custom)`,
  };
}

/**
 * List all devices.
 */
function listDevices() {
  return Object.values(DEVICES);
}

/**
 * Get a summary of a device's input capabilities.
 */
function describeDevice(device) {
  const d = typeof device === "string" ? DEVICES[device] : device;
  if (!d) return null;

  const parts = [];
  if (d.keys > 0) parts.push(`${d.keys} keys (${d.rows}x${d.cols})`);
  if (d.dials > 0) parts.push(`${d.dials} dials`);
  if (d.touchStrips > 0) parts.push(`${d.touchStrips} touch strip`);
  if (d.touchPoints > 0) parts.push(`${d.touchPoints} touch points`);
  if (d.pedals > 0) parts.push(`${d.pedals} pedals`);
  if (d.hasInfobar) parts.push("infobar");
  if (d.hasNfc) parts.push("NFC");

  return `${d.name}: ${parts.join(", ") || "no inputs"}`;
}

module.exports = { DEVICES, getDevice, createCustomDevice, listDevices, describeDevice };
