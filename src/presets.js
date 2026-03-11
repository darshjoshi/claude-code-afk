/**
 * Pre-built switch configurations for common Stream Deck use cases.
 */

const presets = {
  muteToggle: (keyIndex, onAction) => ({
    id: "mute-toggle",
    name: "Mute",
    mode: "toggle",
    keyIndex,
    states: [
      { label: "UNMUTED", color: "#00cc66" },
      { label: "MUTED", color: "#cc0000" },
    ],
    onAction,
  }),

  sceneCycler: (keyIndex, scenes, onAction) => ({
    id: "scene-cycler",
    name: "Scene",
    mode: "cycle",
    keyIndex,
    states: scenes.map((name, i) => ({
      label: name,
      color: `hsl(${(i * 360) / scenes.length}, 70%, 50%)`,
    })),
    onAction,
  }),

  pushToTalk: (keyIndex, onAction) => ({
    id: "push-to-talk",
    name: "PTT",
    mode: "momentary",
    keyIndex,
    states: [
      { label: "SILENT", color: "#333333" },
      { label: "TALK", color: "#ffcc00" },
    ],
    onAction,
  }),

  profileSwitcher: (keyIndex, profiles, onAction) => ({
    id: "profile-switcher",
    name: "Profile",
    mode: "cycle",
    keyIndex,
    states: profiles.map((p) => ({
      label: p,
      color: "#4488ff",
    })),
    onAction,
  }),

  timedToggle: (keyIndex, cooldownMs, onAction) => ({
    id: "timed-toggle",
    name: "Cooldown Toggle",
    mode: "toggle",
    keyIndex,
    cooldownMs,
    states: [
      { label: "OFF", color: "#333333" },
      { label: "ON", color: "#00cc66" },
    ],
    onAction,
  }),

  conditionalSwitch: (keyIndex, condition, onAction) => ({
    id: "conditional-switch",
    name: "Guarded",
    mode: "toggle",
    keyIndex,
    condition,
    states: [
      { label: "DISABLED", color: "#666666" },
      { label: "ENABLED", color: "#00ccff" },
    ],
    onAction,
  }),
};

module.exports = presets;
