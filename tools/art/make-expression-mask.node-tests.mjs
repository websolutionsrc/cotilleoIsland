// Regression tests for the F0.2.2 expression edit mask, run against the
// frozen registration master.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { decodeRgbaPng } from "./png-rgba.mjs";
import { buildExpressionMask } from "./make-expression-mask.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const MASTER_PATH = join(__dirname, "..", "..", "docs", "art", "pilot", "mara_v5_cutout.png");

const master = decodeRgbaPng(readFileSync(MASTER_PATH));
const { mask, editable } = buildExpressionMask(master.width, master.height);

test("expression mask covers both eyes and the mouth", () => {
  const shouldBeEditable = [
    [537, 437], // left eye
    [667, 420], // right eye
    [627, 525], // mouth
  ];
  for (const [x, y] of shouldBeEditable) {
    assert.equal(mask[y * master.width + x], 1, `expression mask missed feature point ${x},${y}`);
  }
});

test("expression mask never touches the nose, ears, or hair", () => {
  const shouldStayProtected = [
    [620, 460], // nose bridge, between the eyes
    [760, 450], // right ear
    [628, 190], // top of hair
  ];
  for (const [x, y] of shouldStayProtected) {
    assert.equal(mask[y * master.width + x], 0, `expression mask touched protected point ${x},${y}`);
  }
});

test("expression mask never extends below the mouth region into the neck/garment", () => {
  for (let y = 601; y < master.height; y++) {
    for (let x = 0; x < master.width; x++) {
      assert.equal(mask[y * master.width + x], 0, `editable pixel too far below face at ${x},${y}`);
    }
  }
});

test("editable region is small - features only, not the whole face", () => {
  const fraction = editable / (master.width * master.height);
  assert.ok(fraction > 0.005, `mask too small: ${fraction}`);
  assert.ok(fraction < 0.05, `mask too large (covering more than just features): ${fraction}`);
});
