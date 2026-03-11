const DynamicSwitch = require("./DynamicSwitch");
const SwitchManager = require("./SwitchManager");
const presets = require("./presets");

module.exports = { DynamicSwitch, SwitchManager, presets };

// When run directly, demonstrate the switches in action
if (require.main === module) {
  const manager = new SwitchManager();

  manager.on("switch:change", ({ switchId, state }) => {
    console.log(`[${switchId}] → ${state.label} (${state.color})`);
  });

  manager.on("switch:blocked", ({ reason }) => {
    console.log(`[blocked] ${reason}`);
  });

  // Load a demo configuration
  manager.loadConfig([
    presets.muteToggle(0, ({ state }) => {
      console.log(`  action: microphone is now ${state.label}`);
    }),
    presets.sceneCycler(1, ["Game", "Camera", "Desktop", "BRB"]),
    presets.pushToTalk(2),
    presets.timedToggle(3, 1000),
  ]);

  console.log("Stream Deck Dynamic Switches - Demo");
  console.log("====================================\n");
  console.log(`Loaded ${manager.size} switches:\n`);

  const snap = manager.snapshot();
  for (const [id, info] of Object.entries(snap)) {
    console.log(`  Key ${info.keyIndex}: ${info.name} [${info.state.label}] (${info.mode})`);
  }

  console.log("\nSimulating key presses...\n");

  // Simulate mute toggle
  manager.handleKeyDown(0);
  manager.handleKeyDown(0);

  // Simulate scene cycling
  manager.handleKeyDown(1);
  manager.handleKeyDown(1);
  manager.handleKeyDown(1);

  // Simulate push-to-talk
  console.log("\n--- Push-to-talk (press & release) ---");
  manager.handleKeyDown(2);
  manager.handleKeyUp(2);

  console.log("\nFinal state:");
  const finalSnap = manager.snapshot();
  for (const [id, info] of Object.entries(finalSnap)) {
    console.log(`  ${info.name}: ${info.state.label}`);
  }
}
