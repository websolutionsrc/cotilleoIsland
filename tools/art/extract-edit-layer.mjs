#!/usr/bin/env node
// v01.01.F0.2.2 - CLI wrapper for edit-layer extraction and validation.
//
// Usage:
//   node tools/art/extract-edit-layer.mjs --edited <generated.png> \
//     [--master docs/art/pilot/mara_v5_cutout.png] \
//     [--mask docs/art/pilot/masks/mara_v5_garment_mask.png] \
//     [--out <layer.png>] [--report <report.json>] \
//     [--color-drift-tolerance 25] [--severe-color-drift-threshold 60] \
//     [--max-silhouette-mismatch-fraction 0.005] [--max-color-drift-fraction 0.05] \
//     [--max-severe-color-drift-fraction 0.003] [--layer-threshold 12]
//
// Exits nonzero unless BOTH the silhouette check and the color-drift check
// pass - see extract-layer-lib.mjs's header for why they're independent
// checks, calibrated against three real generations (docs/art/pilot/raw/
// garment_v1.png, v2.png, v2.1.png - vault Historial has the measurements).

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { basename, dirname, extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { decodeRgbaPng, encodeRgbaPng } from "./png-rgba.mjs";
import {
  extractEditLayer,
  COLOR_DRIFT_TOLERANCE,
  SEVERE_COLOR_DRIFT_THRESHOLD,
  MAX_SILHOUETTE_MISMATCH_FRACTION,
  MAX_COLOR_DRIFT_FRACTION,
  MAX_SEVERE_COLOR_DRIFT_FRACTION,
  LAYER_THRESHOLD,
} from "./extract-layer-lib.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO = join(__dirname, "..", "..");
const DEFAULT_MASTER = join(REPO, "docs", "art", "pilot", "mara_v5_cutout.png");
const DEFAULT_MASK = join(REPO, "docs", "art", "pilot", "masks", "mara_v5_garment_mask.png");

function parseArgs(argv) {
  const options = {
    master: DEFAULT_MASTER,
    mask: DEFAULT_MASK,
    edited: null,
    out: null,
    report: null,
    colorDriftTolerance: COLOR_DRIFT_TOLERANCE,
    severeColorDriftThreshold: SEVERE_COLOR_DRIFT_THRESHOLD,
    maxSilhouetteMismatchFraction: MAX_SILHOUETTE_MISMATCH_FRACTION,
    maxColorDriftFraction: MAX_COLOR_DRIFT_FRACTION,
    maxSevereColorDriftFraction: MAX_SEVERE_COLOR_DRIFT_FRACTION,
    layerThreshold: LAYER_THRESHOLD,
  };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--edited") options.edited = argv[++i];
    else if (arg === "--master") options.master = argv[++i];
    else if (arg === "--mask") options.mask = argv[++i];
    else if (arg === "--out") options.out = argv[++i];
    else if (arg === "--report") options.report = argv[++i];
    else if (arg === "--color-drift-tolerance") options.colorDriftTolerance = Number(argv[++i]);
    else if (arg === "--severe-color-drift-threshold") options.severeColorDriftThreshold = Number(argv[++i]);
    else if (arg === "--max-silhouette-mismatch-fraction")
      options.maxSilhouetteMismatchFraction = Number(argv[++i]);
    else if (arg === "--max-color-drift-fraction") options.maxColorDriftFraction = Number(argv[++i]);
    else if (arg === "--max-severe-color-drift-fraction")
      options.maxSevereColorDriftFraction = Number(argv[++i]);
    else if (arg === "--layer-threshold") options.layerThreshold = Number(argv[++i]);
  }
  return options;
}

function maskFromPng(image) {
  const mask = new Uint8Array(image.width * image.height);
  for (let i = 0; i < mask.length; i++) {
    if (image.pixels[i * 4 + 3] >= 128 && image.pixels[i * 4] >= 128) mask[i] = 1;
  }
  return mask;
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  if (!options.edited) {
    console.error("Usage: node tools/art/extract-edit-layer.mjs --edited <generated.png> [options]");
    process.exit(1);
  }

  const master = decodeRgbaPng(readFileSync(options.master));
  const edited = decodeRgbaPng(readFileSync(options.edited));
  const mask = maskFromPng(decodeRgbaPng(readFileSync(options.mask)));

  const result = extractEditLayer(master, edited, mask, options);

  const stem = basename(options.edited, extname(options.edited));
  const outPath = options.out ?? join(dirname(options.edited), `${stem}.layer.png`);
  const reportPath = options.report ?? join(dirname(options.edited), `${stem}.layer-report.json`);

  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, encodeRgbaPng(result.width, result.height, result.layerPixels));

  const report = {
    edited: options.edited,
    master: options.master,
    mask: options.mask,
    layerPixels: result.layerCount,
    silhouette: result.silhouette,
    colorDrift: result.colorDrift,
    verdict: result.passed ? "invariants_ok" : "protected_pixels_changed",
  };
  writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);

  console.log(`Layer: ${outPath} (${result.layerCount} px)`);
  console.log(`Report: ${reportPath}`);
  console.log(
    `Silhouette: ${result.silhouette.count} px (${(result.silhouette.fraction * 100).toFixed(3)}%, ` +
      `cap ${(result.silhouette.maxAllowedFraction * 100).toFixed(2)}%) - ${result.silhouette.passed ? "OK" : "FAIL"}`,
  );
  console.log(
    `Color drift: ${result.colorDrift.count} px (${(result.colorDrift.fraction * 100).toFixed(3)}%, ` +
      `cap ${(result.colorDrift.maxAllowedFraction * 100).toFixed(2)}%), severe ${result.colorDrift.severeCount} px ` +
      `(${(result.colorDrift.severeFraction * 100).toFixed(3)}%, cap ${(result.colorDrift.maxAllowedSevereFraction * 100).toFixed(2)}%) - ` +
      `${result.colorDrift.passed ? "OK" : "FAIL"}`,
  );

  if (!result.passed) {
    if (!result.silhouette.passed) {
      console.error(`SILHOUETTE VIOLATION samples: ${JSON.stringify(result.silhouette.samples.slice(0, 5))}`);
    }
    if (!result.colorDrift.passed) {
      console.error(`COLOR DRIFT VIOLATION samples: ${JSON.stringify(result.colorDrift.samples.slice(0, 5))}`);
    }
    process.exit(2);
  }
  console.log("Invariants OK.");
}

main();
