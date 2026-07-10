import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { measureRgbaPng } from "./measure-registration-master.mjs";

test("measures the approved Mara v5 master without scaling or recropping", () => {
  const imagePath = path.resolve("docs/art/pilot/mara_v5_cutout.png");
  const measurement = measureRgbaPng(readFileSync(imagePath));
  assert.deepEqual(measurement.opaqueBounds, {
    x: 362,
    y: 170,
    width: 538,
    height: 838,
    maxX: 899,
    maxY: 1007,
  });
  assert.equal(measurement.feetBaselineY, 1007);
  assert.equal(measurement.opaquePixels, 254437);
});

test("rejects a non-PNG input", () => {
  assert.throws(() => measureRgbaPng(Buffer.from("not a png")), /Not a PNG/);
});
