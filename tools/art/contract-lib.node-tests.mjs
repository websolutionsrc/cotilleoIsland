import assert from "node:assert/strict";
import test from "node:test";
import { validateVisualContracts } from "./contract-lib.mjs";

function validDocument() {
  return {
    schemaVersion: 1,
    release: "v01.01",
    phase: "F0.1",
    globalTokens: {
      styleId: "storybook-with-volume-v1",
      alphaRequired: true,
      lighting: { direction: "top_left", angleDegrees: 30 },
    },
    families: ["character", "environment", "building", "scene"].map((id) => ({
      id,
      status: "pending_human",
      blockedBy: [`${id}-approval`],
      contract: {},
    })).concat([{ id: "icon", status: "frozen", blockedBy: [], contract: {} }]),
    humanGates: ["character", "environment", "building", "scene"].map((id) => ({
      id: `${id}-approval`,
      blocks: [id],
      decision: `Approve ${id}.`,
      owner: "human",
    })),
  };
}

test("accepts all five visual families with explicit gates", () => {
  const result = validateVisualContracts(validDocument());
  assert.equal(result.valid, true);
  assert.deepEqual(result.summary.pendingFamilies, ["character", "environment", "building", "scene"]);
});

test("rejects a missing required family", () => {
  const document = validDocument();
  document.families = document.families.filter((family) => family.id !== "scene");
  const result = validateVisualContracts(document);
  assert.equal(result.valid, false);
  assert.match(result.errors.join("\n"), /missing required family 'scene'/);
});

test("rejects blockers on a frozen contract", () => {
  const document = validDocument();
  document.families[0].status = "frozen";
  const result = validateVisualContracts(document);
  assert.equal(result.valid, false);
  assert.match(result.errors.join("\n"), /frozen contract cannot have blockers/);
});

test("rejects references to unknown human gates", () => {
  const document = validDocument();
  document.families[0].blockedBy = ["missing-gate"];
  const result = validateVisualContracts(document);
  assert.equal(result.valid, false);
  assert.match(result.errors.join("\n"), /references unknown gate 'missing-gate'/);
});
