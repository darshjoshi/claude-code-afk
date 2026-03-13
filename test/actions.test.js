const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const {
  ACTIONS,
  KEY_ACTIONS,
  DIAL_ACTIONS,
  PEDAL_ACTIONS,
  TOUCH_ACTIONS,
  LAYOUTS,
  getAction,
  getLayout,
  listActions,
  listCategories,
} = require("../src/streamdeck/actions");

describe("actions", () => {
  it("ACTIONS contains expected core actions", () => {
    assert.ok(ACTIONS.status);
    assert.ok(ACTIONS.abort);
    assert.ok(ACTIONS.sessionsView);
    assert.ok(ACTIONS.allowTool);
    assert.ok(ACTIONS.denyTool);
    assert.ok(ACTIONS.newSession);
  });

  it("includes question-response actions", () => {
    assert.ok(ACTIONS.answerYes);
    assert.ok(ACTIONS.answerNo);
    assert.ok(ACTIONS.answerContinue);
    assert.ok(ACTIONS.answerSkip);
  });

  it("includes pedal and touch actions", () => {
    assert.ok(ACTIONS.pedalAbort);
    assert.ok(ACTIONS.pedalAccept);
    assert.ok(ACTIONS.contextBar);
  });

  it("every action has required fields", () => {
    for (const [id, action] of Object.entries(ACTIONS)) {
      assert.equal(action.id, id, `${id}: id mismatch`);
      assert.ok(action.name, `${id}: missing name`);
      assert.ok(action.description, `${id}: missing description`);
      assert.ok(action.category, `${id}: missing category`);
      assert.ok(action.defaultState, `${id}: missing defaultState`);
      assert.ok(action.defaultState.label, `${id}: missing label`);
    }
  });

  it("key actions have inputType key", () => {
    for (const action of Object.values(KEY_ACTIONS)) {
      assert.equal(action.inputType, "key");
    }
  });

  it("dial actions have inputType dial", () => {
    for (const action of Object.values(DIAL_ACTIONS)) {
      assert.equal(action.inputType, "dial");
    }
  });

  it("pedal actions have inputType pedal", () => {
    for (const action of Object.values(PEDAL_ACTIONS)) {
      assert.equal(action.inputType, "pedal");
    }
  });

  it("touch actions have inputType touch", () => {
    for (const action of Object.values(TOUCH_ACTIONS)) {
      assert.equal(action.inputType, "touch");
    }
  });

  it("getAction returns action by id", () => {
    assert.equal(getAction("status").id, "status");
    assert.equal(getAction("nonexistent"), null);
  });

  it("listActions returns all actions", () => {
    const all = listActions();
    assert.equal(all.length, Object.keys(ACTIONS).length);
  });

  it("listActions filters by inputType", () => {
    const keys = listActions("key");
    assert.ok(keys.length > 0);
    for (const a of keys) {
      assert.equal(a.inputType, "key");
    }

    const dials = listActions("dial");
    assert.ok(dials.length > 0);
    for (const a of dials) {
      assert.equal(a.inputType, "dial");
    }
  });

  it("listCategories groups actions correctly", () => {
    const cats = listCategories();
    assert.ok(cats.info);
    assert.ok(cats.control);
    assert.ok(cats.question);
    assert.ok(cats.permission);
  });
});

describe("layouts", () => {
  const expectedLayouts = [
    "mini", "neo", "standard", "scissor", "plus",
    "xl", "plusXl", "studio", "pedal", "virtual",
  ];

  it("has layouts for all device types", () => {
    for (const id of expectedLayouts) {
      assert.ok(LAYOUTS[id], `Missing layout: ${id}`);
    }
  });

  it("mini layout has 6 key slots", () => {
    assert.equal(Object.keys(LAYOUTS.mini.keys).length, 6);
  });

  it("neo layout has 8 key slots and infobar", () => {
    assert.equal(Object.keys(LAYOUTS.neo.keys).length, 8);
    assert.ok(LAYOUTS.neo.infobar);
  });

  it("plus layout has dials and touch strip", () => {
    assert.ok(LAYOUTS.plus.dials);
    assert.equal(Object.keys(LAYOUTS.plus.dials).length, 4);
    assert.ok(LAYOUTS.plus.touchStrip);
  });

  it("plusXl layout has 36 key slots and 6 dials", () => {
    assert.equal(Object.keys(LAYOUTS.plusXl.keys).length, 36);
    assert.equal(Object.keys(LAYOUTS.plusXl.dials).length, 6);
  });

  it("studio layout has dials", () => {
    assert.ok(LAYOUTS.studio.dials);
    assert.equal(Object.keys(LAYOUTS.studio.dials).length, 2);
  });

  it("pedal layout has 3 pedal slots", () => {
    assert.ok(LAYOUTS.pedal.pedals);
    assert.equal(Object.keys(LAYOUTS.pedal.pedals).length, 3);
  });

  it("getLayout returns correct layout", () => {
    assert.equal(getLayout("mini").device, "mini");
    assert.equal(getLayout("plus").device, "plus");
  });

  it("getLayout defaults to standard for unknown device", () => {
    assert.equal(getLayout("unknown").device, "standard");
  });

  it("all key-mapped actions exist in ACTIONS", () => {
    for (const [layoutId, layout] of Object.entries(LAYOUTS)) {
      if (layout.keys) {
        for (const [key, actionId] of Object.entries(layout.keys)) {
          if (actionId) {
            assert.ok(
              ACTIONS[actionId],
              `Layout ${layoutId} key ${key} references unknown action: ${actionId}`
            );
          }
        }
      }
      if (layout.dials) {
        for (const [idx, actionId] of Object.entries(layout.dials)) {
          if (actionId) {
            assert.ok(
              ACTIONS[actionId],
              `Layout ${layoutId} dial ${idx} references unknown action: ${actionId}`
            );
          }
        }
      }
      if (layout.pedals) {
        for (const [idx, actionId] of Object.entries(layout.pedals)) {
          if (actionId) {
            assert.ok(
              ACTIONS[actionId],
              `Layout ${layoutId} pedal ${idx} references unknown action: ${actionId}`
            );
          }
        }
      }
    }
  });
});
