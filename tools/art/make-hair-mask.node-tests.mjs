// Regression tests for the F0.2.2 hair edit mask, run against the frozen
// registration master.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { decodeRgbaPng } from "./png-rgba.mjs";
import { buildHairMask } from "./make-hair-mask.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const MASTER_PATH = join(__dirname, "..", "..", "docs", "art", "pilot", "mara_v5_cutout.png");

const master = decodeRgbaPng(readFileSync(MASTER_PATH));
const { mask, editable } = buildHairMask(master.width, master.height);

test("hair mask never touches the measured eye/eyebrow/mouth landmarks", () => {
  const protectedPoints = [
    [537, 437], // left eye
    [667, 420], // right eye
    [532, 392], // left eyebrow
    [680, 365], // right eyebrow
    [627, 525], // mouth
    [760, 450], // right ear
  ];
  for (const [x, y] of protectedPoints) {
    assert.equal(mask[y * master.width + x], 0, `hair mask touched protected point ${x},${y}`);
  }
});

test("hair mask never extends below the shoulder clip line", () => {
  for (let y = 561; y < master.height; y++) {
    for (let x = 0; x < master.width; x++) {
      assert.equal(mask[y * master.width + x], 0, `editable pixel below shoulder clip at ${x},${y}`);
    }
  }
});

test("hair mask covers the current hair region (sanity check it's not empty/misplaced)", () => {
  // Top-of-head hair (measured hair pixel from the calibration sampling pass) must be editable.
  assert.equal(mask[190 * master.width + 628], 1);
});

test("editable region is a sane fraction of the canvas", () => {
  const fraction = editable / (master.width * master.height);
  assert.ok(fraction > 0.08, `mask too small: ${fraction}`);
  assert.ok(fraction < 0.2, `mask too large: ${fraction}`);
});
