const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const ButtonRenderer = require("../src/streamdeck/ButtonRenderer");

describe("ButtonRenderer", () => {
  const renderer = new ButtonRenderer();

  it("renders an SVG with label and color", () => {
    const svg = renderer.render({ label: "TEST", color: "#ff0000" });
    assert.ok(svg.includes("<svg"));
    assert.ok(svg.includes("TEST"));
    assert.ok(svg.includes("#ff0000"));
  });

  it("renders with icon", () => {
    const svg = renderer.render({ label: "OK", color: "#00ff00", icon: "check" });
    assert.ok(svg.includes("polyline")); // check icon uses polyline
  });

  it("renders with sublabel", () => {
    const svg = renderer.render({
      label: "MAIN",
      color: "#333333",
      sublabel: "extra info",
    });
    assert.ok(svg.includes("extra info"));
  });

  it("uses white text on dark backgrounds", () => {
    const svg = renderer.render({ label: "DARK", color: "#000000" });
    assert.ok(svg.includes("#ffffff"));
  });

  it("uses black text on light backgrounds", () => {
    const svg = renderer.render({ label: "LIGHT", color: "#ffffff" });
    assert.ok(svg.includes("#000000"));
  });

  it("renders data URI", () => {
    const uri = renderer.renderDataUri({ label: "URI", color: "#333333" });
    assert.ok(uri.startsWith("data:image/svg+xml;base64,"));
  });

  it("escapes XML characters in labels", () => {
    const svg = renderer.render({ label: "<test>&", color: "#333333" });
    assert.ok(svg.includes("&lt;test&gt;&amp;"));
    assert.ok(!svg.includes("<test>"));
  });

  it("adjusts font size for long labels", () => {
    const short = renderer.render({ label: "OK", color: "#333" });
    const long = renderer.render({ label: "VERY LONG", color: "#333" });
    // Long labels get smaller font size
    assert.ok(short.includes('font-size="22"'));
    assert.ok(long.includes('font-size="16"'));
  });

  it("renders all icon types without error", () => {
    const icons = [
      "circle", "pulse", "stop", "plus", "eye", "bug", "check",
      "wrench", "book", "git", "shield", "clock", "alert",
      "compress", "message", "diff",
    ];
    for (const icon of icons) {
      const svg = renderer.render({ label: icon, color: "#333333", icon });
      assert.ok(svg.includes("<svg"), `Failed to render icon: ${icon}`);
    }
  });

  it("handles unknown icons gracefully", () => {
    const svg = renderer.render({
      label: "X",
      color: "#333333",
      icon: "nonexistent",
    });
    assert.ok(svg.includes("<svg")); // Still renders
  });

  it("renderLayout generates buttons for all mapped keys", () => {
    const layout = {
      mapping: {
        0: "status",
        1: "abort",
        2: null,
      },
    };
    const states = {
      status: { label: "IDLE", color: "#4488ff" },
      abort: { label: "ABORT", color: "#cc0000" },
    };
    const result = renderer.renderLayout(layout, states);
    assert.ok(result[0].includes("IDLE"));
    assert.ok(result[1].includes("ABORT"));
    assert.equal(result[2], undefined);
  });
});
