#!/usr/bin/env node
// v01.01.F0.2.2 - CLI wrapper for edit-layer extraction and validation.
//
// Usage:
//   node tools/art/extract-edit-layer.mjs --edited <generated.png> \
//     [--master docs/art/pilot/mara_v5_cutout.png] \
//     [--mask docs/art/pilot/masks/mara_v5_garment_mask.png] \
//     [--out <layer.png>] [--report <report.json>] \
//     [--outside-tolerance 8] [--layer-threshold 12]
//
// Exits nonzero if any protected (outside-mask) pixel changed beyond
// tolerance, so a bad generation fails loudly before anyone composites it.

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { basename, dirname, extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { decodeRgbaPng, encodeRgbaPng } from "./png-rgba.mjs";
import { extractEditLayer, OUTSIDE_TOLERANCE, LAYER_THRESHOLD } from "./extract-layer-lib.mjs";

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
    outsideTolerance: OUTSIDE_TOLERANCE,
    layerThreshold: LAYER_THRESHOLD,
  };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--edited") options.edited = argv[++i];
    else if (arg === "--master") options.master = argv[++i];
    else if (arg === "--mask") options.mask = argv[++i];
    else if (arg === "--out") options.out = argv[++i];
    else if (arg === "--report") options.report = argv[++i];
    else if (arg === "--outside-tolerance") options.outsideTolerance = Number(argv[++i]);
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

  const result = extractEditLayer(master, edited, mask, {
    outsideTolerance: options.outsideTolerance,
    layerThreshold: options.layerThreshold,
  });

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
    outsideTolerance: options.outsideTolerance,
    layerThreshold: options.layerThreshold,
    violations: result.violations,
    verdict: result.violations.count === 0 ? "invariants_ok" : "protected_pixels_changed",
  };
  writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);

  console.log(`Layer: ${outPath} (${result.layerCount} px)`);
  console.log(`Report: ${reportPath}`);
  if (result.violations.count > 0) {
    console.error(
      `VIOLATION: ${result.violations.count} protected pixel(s) changed ` +
        `(max delta ${result.violations.maxDelta}). First samples: ` +
        JSON.stringify(result.violations.samples.slice(0, 5)),
    );
    process.exit(2);
  }
  console.log("Invariants OK: no protected pixels changed beyond tolerance.");
}

main();
