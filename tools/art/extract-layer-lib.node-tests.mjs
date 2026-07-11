// Synthetic-canvas tests for extract-layer-lib.mjs (no file I/O).
import test from "node:test";
import assert from "node:assert/strict";
import { extractEditLayer, normalizeEditedAlpha } from "./extract-layer-lib.mjs";

const W = 8;
const H = 8;

function makeImage(fill = [100, 100, 100, 255]) {
  const pixels = Buffer.alloc(W * H * 4);
  for (let i = 0; i < W * H; i++) {
    pixels[i * 4] = fill[0];
    pixels[i * 4 + 1] = fill[1];
    pixels[i * 4 + 2] = fill[2];
    pixels[i * 4 + 3] = fill[3];
  }
  return { width: W, height: H, pixels, sourceColorType: 6 };
}

function setPx(image, x, y, [r, g, b, a]) {
  const i = (y * W + x) * 4;
  image.pixels[i] = r;
  image.pixels[i + 1] = g;
  image.pixels[i + 2] = b;
  image.pixels[i + 3] = a;
}

function maskWithEditableColumn(x0, x1) {
  const mask = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) for (let x = x0; x <= x1; x++) mask[y * W + x] = 1;
  return mask;
}

test("changed pixels inside the mask land in the layer, unchanged ones do not", () => {
  const master = makeImage();
  const edited = makeImage();
  setPx(edited, 3, 4, [200, 50, 50, 255]); // inside mask, changed
  const mask = maskWithEditableColumn(2, 4);

  const result = extractEditLayer(master, edited, mask);
  assert.equal(result.passed, true);
  assert.equal(result.colorDrift.count, 0);
  assert.equal(result.layerCount, 1);
  const i = (4 * W + 3) * 4;
  assert.deepEqual([...result.layerPixels.subarray(i, i + 4)], [200, 50, 50, 255]);
});

test("changes outside the mask are color-drift violations, not layer content", () => {
  const master = makeImage();
  const edited = makeImage();
  setPx(edited, 6, 1, [220, 220, 220, 255]); // outside mask, delta 120 (severe)
  const mask = maskWithEditableColumn(2, 4);

  const result = extractEditLayer(master, edited, mask);
  assert.equal(result.layerCount, 0);
  assert.equal(result.colorDrift.count, 1);
  assert.deepEqual(result.colorDrift.samples[0], { x: 6, y: 1, delta: 120 });
  // Single severe pixel on an 8x8 canvas is 1.5625% - well past the 0.3% severe cap.
  assert.equal(result.colorDrift.severeCount, 1);
  assert.equal(result.colorDrift.passed, false);
  assert.equal(result.passed, false);
});

test("generator noise within tolerance on protected pixels is accepted", () => {
  const master = makeImage();
  const edited = makeImage([104, 97, 102, 255]); // global +-4 noise everywhere, well under COLOR_DRIFT_TOLERANCE=25
  const mask = maskWithEditableColumn(2, 4);

  const result = extractEditLayer(master, edited, mask);
  assert.equal(result.passed, true);
  assert.equal(result.colorDrift.count, 0);
  assert.equal(result.layerCount, 0); // below layerThreshold: not real garment change
});

test("silhouette change outside the mask fails the silhouette fraction check", () => {
  const master = makeImage();
  setPx(master, 7, 7, [0, 0, 0, 0]); // master transparent corner
  const edited = makeImage(); // edited made it opaque
  const mask = maskWithEditableColumn(2, 4);

  const result = extractEditLayer(master, edited, mask);
  assert.equal(result.silhouette.count, 1);
  // 1/64 = 1.5625%, well past the 0.5% silhouette cap.
  assert.equal(result.silhouette.passed, false);
  assert.equal(result.passed, false);
});

test("a large-enough color drift fails on count fraction even if no single pixel is severe", () => {
  const master = makeImage();
  // Delta 30: past COLOR_DRIFT_TOLERANCE (25) but under SEVERE_COLOR_DRIFT_THRESHOLD (60).
  const edited = makeImage([130, 100, 100, 255]);
  const mask = maskWithEditableColumn(2, 4); // 3 of 8 columns editable -> 5/8 columns protected

  const result = extractEditLayer(master, edited, mask);
  assert.equal(result.colorDrift.severeCount, 0);
  assert.ok(result.colorDrift.count > 0);
  // 5 protected columns * 8 rows = 40 px changed out of 64 = 62.5%, past the 5% cap.
  assert.equal(result.colorDrift.passed, false);
  assert.equal(result.passed, false);
});

test("canvas mismatch throws instead of silently comparing", () => {
  const master = makeImage();
  const edited = { width: 4, height: 4, pixels: Buffer.alloc(64), sourceColorType: 6 };
  assert.throws(() => extractEditLayer(master, edited, new Uint8Array(W * H)), /Canvas mismatch/);
});

test("normalizeEditedAlpha strips near-white background from RGB generator output", () => {
  const rgb = makeImage([250, 250, 248, 255]);
  rgb.sourceColorType = 2;
  setPx(rgb, 2, 2, [180, 90, 40, 255]); // one figure pixel
  const normalized = normalizeEditedAlpha(rgb);
  assert.equal(normalized.pixels[(2 * W + 2) * 4 + 3], 255);
  assert.equal(normalized.pixels[0 * 4 + 3], 0);
});
