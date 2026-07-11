// Regression tests for the F0.2.2 garment edit mask, run against the frozen
// registration master (in-repo). If the master ever changes, these assert
// the regenerated mask still respects the protected regions before any
// generated garment is validated against it.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { decodeRgbaPng } from "./png-rgba.mjs";
import { buildGarmentMask } from "./make-garment-mask.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const MASTER_PATH = join(__dirname, "..", "..", "docs", "art", "pilot", "mara_v5_cutout.png");

const master = decodeRgbaPng(readFileSync(MASTER_PATH));
const { mask, editable, width, height } = buildGarmentMask(master);

test("mask never touches the face/hair zone above the chin guard", () => {
  // Dilation may only grow downward from seeds at y >= 560; allow the
  // 16px dilation reach above it, nothing further up than that.
  const hardCeiling = 560 - 16 - 1;
  for (let y = 0; y <= hardCeiling; y++) {
    for (let x = 0; x < width; x++) {
      assert.equal(mask[y * width + x], 0, `editable pixel intruded at ${x},${y}`);
    }
  }
});

test("mask never touches feet or ankles", () => {
  // Seeds stop at y=900, dilation reaches at most 916; feet begin ~940.
  for (let y = 917; y < height; y++) {
    for (let x = 0; x < width; x++) {
      assert.equal(mask[y * width + x], 0, `editable pixel intruded at ${x},${y}`);
    }
  }
});

test("mask stays within the silhouette halo", () => {
  // Every editable pixel must be within ALPHA_HALO_PX+DILATE_PX of an opaque
  // pixel; cheap proxy: no editable pixel in the far background corners.
  const corners = [
    [0, 0, 300, 300],
    [width - 300, 0, width, 300],
    [0, height - 200, 300, height],
    [width - 300, height - 200, width, height],
  ];
  for (const [x0, y0, x1, y1] of corners) {
    for (let y = y0; y < y1; y++) {
      for (let x = x0; x < x1; x++) {
        assert.equal(mask[y * width + x], 0, `editable pixel in background at ${x},${y}`);
      }
    }
  }
});

test("editable region stays in the sane garment range", () => {
  const fraction = editable / (width * height);
  assert.ok(fraction > 0.02, `mask too small: ${fraction}`);
  assert.ok(fraction < 0.06, `mask too large: ${fraction}`);
});
