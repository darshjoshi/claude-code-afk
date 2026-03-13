/**
 * Convert an SVG string to a data URI suitable for setImage().
 */
export function svgToDataUri(svg: string): string {
  const encoded = Buffer.from(svg).toString("base64");
  return `data:image/svg+xml;base64,${encoded}`;
}

/**
 * Generate a 144x144 "OFFLINE" SVG for disconnected state.
 */
export function offlineSvg(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="144" height="144" viewBox="0 0 144 144">
  <rect width="144" height="144" rx="12" fill="#1a1a1a"/>
  <circle cx="72" cy="58" r="16" fill="none" stroke="#444" stroke-width="2"/>
  <line x1="60" y1="46" x2="84" y2="70" stroke="#444" stroke-width="2"/>
  <text x="72" y="100" text-anchor="middle" fill="#555" font-family="Arial,sans-serif" font-size="14" font-weight="bold">OFFLINE</text>
</svg>`;
}

/**
 * Generate a 144x144 context gauge SVG for key 7 (Neo workaround).
 */
export function contextGaugeSvg(
  percent: number,
  color: string,
  formatted: string,
  maxFormatted: string
): string {
  const clampedPercent = Math.max(0, Math.min(100, percent));
  const barWidth = Math.round((clampedPercent / 100) * 112);
  const percentText = `${Math.round(clampedPercent)}%`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="144" height="144" viewBox="0 0 144 144">
  <rect width="144" height="144" rx="12" fill="#111"/>
  <text x="72" y="30" text-anchor="middle" fill="#888" font-family="Arial,sans-serif" font-size="10">CONTEXT</text>
  <text x="72" y="58" text-anchor="middle" fill="${color}" font-family="Arial,sans-serif" font-size="22" font-weight="bold">${percentText}</text>
  <rect x="16" y="70" width="112" height="10" rx="5" fill="#333"/>
  <rect x="16" y="70" width="${barWidth}" height="10" rx="5" fill="${color}"/>
  <text x="72" y="100" text-anchor="middle" fill="#aaa" font-family="Arial,sans-serif" font-size="10">${formatted}</text>
  <text x="72" y="115" text-anchor="middle" fill="#666" font-family="Arial,sans-serif" font-size="9">of ${maxFormatted}</text>
</svg>`;
}
