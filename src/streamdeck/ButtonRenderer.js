/**
 * Generates SVG button images for Stream Deck keys.
 * Each button shows a label, background color, and optional icon.
 *
 * Stream Deck keys are 72x72 or 144x144 pixels. We generate SVGs
 * that can be rendered to PNGs by the Stream Deck SDK or plugin.
 */
class ButtonRenderer {
  constructor(options = {}) {
    this.width = options.width || 144;
    this.height = options.height || 144;
    this.fontFamily = options.fontFamily || "Arial, sans-serif";
  }

  /**
   * Render a button as an SVG string.
   */
  render(state) {
    const { label = "", color = "#333333", icon = null, sublabel = "" } = state;
    const textColor = this._contrastColor(color);

    const iconSvg = icon ? this._renderIcon(icon, textColor) : "";
    const labelY = icon ? 105 : sublabel ? 65 : 80;
    const fontSize = label.length > 6 ? 16 : label.length > 4 ? 18 : 22;

    return `<svg xmlns="http://www.w3.org/2000/svg" width="${this.width}" height="${this.height}" viewBox="0 0 ${this.width} ${this.height}">
  <rect width="${this.width}" height="${this.height}" rx="12" fill="${color}"/>
  ${iconSvg}
  <text x="${this.width / 2}" y="${labelY}" text-anchor="middle"
        font-family="${this.fontFamily}" font-size="${fontSize}" font-weight="bold"
        fill="${textColor}">${this._escapeXml(label)}</text>
  ${sublabel ? `<text x="${this.width / 2}" y="${labelY + 20}" text-anchor="middle"
        font-family="${this.fontFamily}" font-size="12"
        fill="${textColor}" opacity="0.7">${this._escapeXml(sublabel)}</text>` : ""}
</svg>`;
  }

  /**
   * Render a button as a data URI for embedding.
   */
  renderDataUri(state) {
    const svg = this.render(state);
    const encoded = Buffer.from(svg).toString("base64");
    return `data:image/svg+xml;base64,${encoded}`;
  }

  /**
   * Render all buttons for a layout.
   */
  renderLayout(layout, buttonStates) {
    const result = {};
    for (const [keyIndex, actionId] of Object.entries(layout.mapping)) {
      if (actionId && buttonStates[actionId]) {
        result[keyIndex] = this.render(buttonStates[actionId]);
      } else if (actionId) {
        result[keyIndex] = this.render({
          label: actionId,
          color: "#222222",
        });
      }
    }
    return result;
  }

  _renderIcon(icon, color) {
    const cx = this.width / 2;
    const icons = {
      circle: `<circle cx="${cx}" cy="45" r="16" fill="none" stroke="${color}" stroke-width="3"/>`,
      pulse: `<circle cx="${cx}" cy="45" r="16" fill="none" stroke="${color}" stroke-width="3">
        <animate attributeName="r" values="12;18;12" dur="1.5s" repeatCount="indefinite"/>
        <animate attributeName="opacity" values="1;0.5;1" dur="1.5s" repeatCount="indefinite"/>
      </circle>`,
      stop: `<rect x="${cx - 14}" y="31" width="28" height="28" rx="4" fill="${color}"/>`,
      plus: `<line x1="${cx}" y1="31" x2="${cx}" y2="59" stroke="${color}" stroke-width="3" stroke-linecap="round"/>
             <line x1="${cx - 14}" y1="45" x2="${cx + 14}" y2="45" stroke="${color}" stroke-width="3" stroke-linecap="round"/>`,
      eye: `<ellipse cx="${cx}" cy="45" rx="18" ry="12" fill="none" stroke="${color}" stroke-width="2.5"/>
            <circle cx="${cx}" cy="45" r="6" fill="${color}"/>`,
      bug: `<ellipse cx="${cx}" cy="48" rx="12" ry="14" fill="none" stroke="${color}" stroke-width="2.5"/>
            <circle cx="${cx}" cy="36" r="8" fill="none" stroke="${color}" stroke-width="2.5"/>`,
      check: `<polyline points="${cx - 12},45 ${cx - 3},54 ${cx + 14},34" fill="none" stroke="${color}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`,
      wrench: `<line x1="${cx - 10}" y1="55" x2="${cx + 10}" y2="35" stroke="${color}" stroke-width="3" stroke-linecap="round"/>
               <circle cx="${cx + 12}" cy="33" r="8" fill="none" stroke="${color}" stroke-width="2.5"/>`,
      book: `<rect x="${cx - 16}" y="29" width="32" height="32" rx="3" fill="none" stroke="${color}" stroke-width="2.5"/>
             <line x1="${cx}" y1="29" x2="${cx}" y2="61" stroke="${color}" stroke-width="2"/>`,
      git: `<circle cx="${cx}" cy="37" r="6" fill="none" stroke="${color}" stroke-width="2.5"/>
            <circle cx="${cx}" cy="55" r="6" fill="none" stroke="${color}" stroke-width="2.5"/>
            <line x1="${cx}" y1="43" x2="${cx}" y2="49" stroke="${color}" stroke-width="2.5"/>`,
      shield: `<path d="M${cx},28 L${cx + 18},36 L${cx + 18},50 Q${cx + 18},62 ${cx},64 Q${cx - 18},62 ${cx - 18},50 L${cx - 18},36 Z" fill="none" stroke="${color}" stroke-width="2.5"/>`,
      clock: `<circle cx="${cx}" cy="45" r="16" fill="none" stroke="${color}" stroke-width="2.5"/>
              <line x1="${cx}" y1="45" x2="${cx}" y2="35" stroke="${color}" stroke-width="2.5" stroke-linecap="round"/>
              <line x1="${cx}" y1="45" x2="${cx + 8}" y2="49" stroke="${color}" stroke-width="2.5" stroke-linecap="round"/>`,
      alert: `<path d="M${cx},30 L${cx + 18},60 L${cx - 18},60 Z" fill="none" stroke="${color}" stroke-width="2.5" stroke-linejoin="round"/>
              <line x1="${cx}" y1="42" x2="${cx}" y2="50" stroke="${color}" stroke-width="2.5" stroke-linecap="round"/>
              <circle cx="${cx}" cy="55" r="2" fill="${color}"/>`,
      compress: `<polyline points="${cx - 10},32 ${cx},40 ${cx + 10},32" fill="none" stroke="${color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
                 <polyline points="${cx - 10},58 ${cx},50 ${cx + 10},58" fill="none" stroke="${color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>`,
      message: `<rect x="${cx - 18}" y="30" width="36" height="24" rx="4" fill="none" stroke="${color}" stroke-width="2.5"/>
                <polyline points="${cx - 6},54 ${cx - 12},62 ${cx - 6},54 ${cx + 6},54" fill="none" stroke="${color}" stroke-width="2.5"/>`,
      diff: `<line x1="${cx - 12}" y1="38" x2="${cx + 12}" y2="38" stroke="#cc0000" stroke-width="2.5" stroke-linecap="round"/>
             <line x1="${cx - 12}" y1="52" x2="${cx + 12}" y2="52" stroke="#00cc66" stroke-width="2.5" stroke-linecap="round"/>
             <line x1="${cx}" y1="45" x2="${cx}" y2="59" stroke="#00cc66" stroke-width="2" stroke-linecap="round"/>`,
    };

    return icons[icon] || "";
  }

  _contrastColor(hex) {
    const rgb = this._hexToRgb(hex);
    if (!rgb) return "#ffffff";
    const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
    return luminance > 0.5 ? "#000000" : "#ffffff";
  }

  _hexToRgb(hex) {
    const match = hex.match(/^#([0-9a-f]{6})$/i);
    if (!match) return null;
    return {
      r: parseInt(match[1].substring(0, 2), 16),
      g: parseInt(match[1].substring(2, 4), 16),
      b: parseInt(match[1].substring(4, 6), 16),
    };
  }

  _escapeXml(str) {
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }
}

module.exports = ButtonRenderer;
