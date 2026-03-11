/**
 * Demo: renders all button SVGs to show what the Stream Deck will look like.
 */
const ButtonRenderer = require("./streamdeck/ButtonRenderer");
const { ACTIONS, getLayout } = require("./streamdeck/actions");

const renderer = new ButtonRenderer();
const layout = getLayout("standard");

console.log("Stream Deck ↔ Claude Code — Button Preview");
console.log("=".repeat(50));
console.log(`Layout: ${layout.name} (${layout.keys} keys)\n`);

// Show the grid
const cols = 5;
const rows = Math.ceil(layout.keys / cols);

for (let row = 0; row < rows; row++) {
  const labels = [];
  const colors = [];

  for (let col = 0; col < cols; col++) {
    const keyIndex = row * cols + col;
    const actionId = layout.mapping[keyIndex];

    if (actionId) {
      const action = ACTIONS[actionId];
      if (action) {
        labels.push(action.defaultState.label.padStart(10).padEnd(10));
        colors.push(action.defaultState.color.padStart(10).padEnd(10));
      } else {
        labels.push("    ???   ");
        colors.push("          ");
      }
    } else {
      labels.push("    ---   ");
      colors.push("          ");
    }
  }

  console.log("┌──────────┬──────────┬──────────┬──────────┬──────────┐");
  console.log(`│${labels.join("│")}│`);
  console.log(`│${colors.join("│")}│`);
  console.log("└──────────┴──────────┴──────────┴──────────┴──────────┘");
}

console.log("\nAction catalog:");
for (const action of Object.values(ACTIONS)) {
  const state = action.defaultState;
  console.log(`  [${state.color}] ${state.label.padEnd(10)} ${action.name} — ${action.description}`);
}

console.log("\nSample SVG output (status button):");
const svg = renderer.render(ACTIONS.status.defaultState);
console.log(svg.split("\n").map((l) => `  ${l}`).join("\n"));
