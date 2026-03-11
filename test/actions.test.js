const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const {
  ACTIONS,
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
    assert.ok(ACTIONS.reviewCode);
    assert.ok(ACTIONS.commit);
    assert.ok(ACTIONS.newSession);
  });

  it("every action has required fields", () => {
    for (const [id, action] of Object.entries(ACTIONS)) {
      assert.equal(action.id, id, `${id}: id mismatch`);
      assert.ok(action.name, `${id}: missing name`);
      assert.ok(action.description, `${id}: missing description`);
      assert.ok(action.category, `${id}: missing category`);
      assert.ok(action.defaultState, `${id}: missing defaultState`);
      assert.ok(action.defaultState.label, `${id}: missing label`);
      assert.ok(action.defaultState.color, `${id}: missing color`);
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

  it("listCategories groups actions correctly", () => {
    const cats = listCategories();
    assert.ok(cats.info);
    assert.ok(cats.prompt);
    assert.ok(cats.control);
  });
});

describe("layouts", () => {
  it("has mini, standard, and xl layouts", () => {
    assert.ok(LAYOUTS.mini);
    assert.ok(LAYOUTS.standard);
    assert.ok(LAYOUTS.xl);
  });

  it("mini has 6 keys", () => {
    assert.equal(LAYOUTS.mini.keys, 6);
    assert.equal(Object.keys(LAYOUTS.mini.mapping).length, 6);
  });

  it("standard has 15 keys", () => {
    assert.equal(LAYOUTS.standard.keys, 15);
  });

  it("xl has 32 keys", () => {
    assert.equal(LAYOUTS.xl.keys, 32);
  });

  it("getLayout returns correct layout", () => {
    assert.equal(getLayout("mini").keys, 6);
    assert.equal(getLayout("standard").keys, 15);
  });

  it("getLayout defaults to standard for unknown size", () => {
    assert.equal(getLayout("unknown").keys, 15);
  });

  it("all mapped actions exist in ACTIONS", () => {
    for (const [size, layout] of Object.entries(LAYOUTS)) {
      for (const [key, actionId] of Object.entries(layout.mapping)) {
        if (actionId) {
          assert.ok(
            ACTIONS[actionId],
            `Layout ${size} key ${key} references unknown action: ${actionId}`
          );
        }
      }
    }
  });
});
