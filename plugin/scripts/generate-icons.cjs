#!/usr/bin/env node
/**
 * Generate placeholder PNG icons for the Stream Deck plugin.
 * Creates simple SVG files that the Stream Deck app will use as defaults.
 *
 * Since we render dynamic images via setImage() at runtime, these are
 * just placeholders shown before the plugin connects.
 */
const fs = require("fs");
const path = require("path");

const BASE = path.join(__dirname, "..", "com.claude.code-control.sdPlugin", "imgs");

function svgIcon(size, label, bgColor = "#1a1a2e", fgColor = "#ffffff") {
  const fontSize = Math.round(size * 0.25);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${Math.round(size * 0.08)}" fill="${bgColor}"/>
  <text x="${size / 2}" y="${size / 2 + fontSize * 0.35}" text-anchor="middle"
        font-family="Arial, sans-serif" font-size="${fontSize}" font-weight="bold"
        fill="${fgColor}">${label}</text>
</svg>`;
}

// Plugin icon (256x256)
fs.writeFileSync(path.join(BASE, "plugin-icon.svg"), svgIcon(256, "CC", "#4488ff", "#ffffff"));

// Category icon (28x28 and 56x56)
fs.writeFileSync(path.join(BASE, "category.svg"), svgIcon(56, "C", "#4488ff", "#ffffff"));

// Per-action icons
const actions = [
  { dir: "status", label: "ST", color: "#4488ff" },
  { dir: "prompt", label: "PR", color: "#9966ff" },
  { dir: "control", label: "CT", color: "#cc0000" },
  { dir: "session", label: "SE", color: "#00cc66" },
  { dir: "encoder", label: "EN", color: "#ffcc00" },
  { dir: "gauge", label: "CG", color: "#00cc66" },
  { dir: "pedal", label: "PD", color: "#ff6600" },
];

for (const a of actions) {
  const dir = path.join(BASE, "actions", a.dir);
  // Icon (20x20 / 40x40)
  fs.writeFileSync(path.join(dir, "icon.svg"), svgIcon(40, a.label, a.color, "#ffffff"));
  // Key image (72x72 / 144x144)
  fs.writeFileSync(path.join(dir, "key.svg"), svgIcon(144, a.label, a.color, "#ffffff"));
}

console.log("Placeholder icons generated successfully.");
