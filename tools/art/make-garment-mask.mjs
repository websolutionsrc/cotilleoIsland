#!/usr/bin/env node
// v01.01.F0.2.2 - Generate the allowed-edit mask for the garment proof.
//
// The mask marks which pixels of the registration master an edit-on-template
// garment generation MAY change (white = editable, transparent = protected).
// Everything outside it - face, hair, skin, tattoo, hands, feet, canvas -
// is protected by contract (editInvariants: unmasked_pixels).
//
// Method: segment the neutral outfit (the warm-grey tank + shorts baked into
// the approved master) as low-saturation, mid-luminance pixels inside the
// figure alpha, guarded to below the chin so eye highlights can't match;
// then dilate so a replacement garment may sit slightly looser than the
// skin-tight neutral outfit and cover its own outline. The dilation also
// absorbs the outfit's dark outline pixels excluded by the luminance band.
//
// Pixel-exact tuning lives here on purpose: the mask is regenerated from the
// master, never hand-painted, so a master replacement regenerates the mask.
//
// Usage:
//   node tools/art/make-garment-mask.mjs [--out <mask.png>] [--preview <preview.png>]
//
// Defaults write docs/art/pilot/masks/mara_v5_garment_mask.png and its
// review overlay next to it.

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { decodeRgbaPng, encodeRgbaPng } from "./png-rgba.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO = join(__dirname, "..", "..");
const MASTER = join(REPO, "docs", "art", "pilot", "mara_v5_cutout.png");
const DEFAULT_OUT = join(REPO, "docs", "art", "pilot", "masks", "mara_v5_garment_mask.png");
const DEFAULT_PREVIEW = join(REPO, "docs", "art", "pilot", "masks", "mara_v5_garment_mask_preview.png");

// Segmentation band for the neutral outfit's warm grey, tuned against the
// approved master (see docs/art/contracts/mara-v5-registration-measurements.json
// for the frozen figure geometry these depend on).
const SATURATION_MAX = 55;
const LUMINANCE_MIN = 70;
const LUMINANCE_MAX = 230;
const CHIN_GUARD_Y = 560; // outfit starts at the shoulders (~590); nothing above the chin is editable
const HEM_GUARD_Y = 900; // shorts hem ends ~860; feet begin ~940 and stay protected
const INTERIOR_PX = 3; // seeds must sit this far inside the silhouette: antialiased skin<->background edge blends are desaturated and would false-seed legs/feet otherwise
const DILATE_PX = 16;
const ALPHA_HALO_PX = 8; // a garment may extend this far past the current silhouette

function parseArgs(argv) {
  const options = { out: DEFAULT_OUT, preview: DEFAULT_PREVIEW };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--out") options.out = argv[++i];
    else if (argv[i] === "--preview") options.preview = argv[++i];
  }
  return options;
}

function luminance(r, g, b) {
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

function saturation(r, g, b) {
  return Math.max(r, g, b) - Math.min(r, g, b);
}

/** Chebyshev-distance dilation of a binary Uint8Array grid. */
function dilate(grid, width, height, radius) {
  const out = new Uint8Array(grid);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (!grid[y * width + x]) continue;
      for (let dy = -radius; dy <= radius; dy++) {
        const ny = y + dy;
        if (ny < 0 || ny >= height) continue;
        for (let dx = -radius; dx <= radius; dx++) {
          const nx = x + dx;
          if (nx < 0 || nx >= width) continue;
          out[ny * width + nx] = 1;
        }
      }
    }
  }
  return out;
}

export function buildGarmentMask(master) {
  const { width, height, pixels } = master;
  const opaque = new Uint8Array(width * height);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (pixels[(y * width + x) * 4 + 3] >= 128) opaque[y * width + x] = 1;
    }
  }

  const isInterior = (x, y) => {
    for (let dy = -INTERIOR_PX; dy <= INTERIOR_PX; dy++) {
      for (let dx = -INTERIOR_PX; dx <= INTERIOR_PX; dx++) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= width || ny >= height) return false;
        if (!opaque[ny * width + nx]) return false;
      }
    }
    return true;
  };

  const seed = new Uint8Array(width * height);
  for (let y = CHIN_GUARD_Y; y <= Math.min(HEM_GUARD_Y, height - 1); y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      if (pixels[i + 3] < 128 || !isInterior(x, y)) continue;
      const r = pixels[i], g = pixels[i + 1], b = pixels[i + 2];
      const lum = luminance(r, g, b);
      if (saturation(r, g, b) <= SATURATION_MAX && lum >= LUMINANCE_MIN && lum <= LUMINANCE_MAX) {
        seed[y * width + x] = 1;
      }
    }
  }

  const grown = dilate(seed, width, height, DILATE_PX);
  const halo = dilate(opaque, width, height, ALPHA_HALO_PX);
  const mask = new Uint8Array(width * height);
  let editable = 0;
  for (let i = 0; i < mask.length; i++) {
    if (grown[i] && halo[i]) {
      mask[i] = 1;
      editable++;
    }
  }
  return { mask, editable, width, height };
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const master = decodeRgbaPng(readFileSync(MASTER));
  const { mask, editable, width, height } = buildGarmentMask(master);

  const maskPixels = Buffer.alloc(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    if (mask[i]) {
      maskPixels[i * 4] = 255;
      maskPixels[i * 4 + 1] = 255;
      maskPixels[i * 4 + 2] = 255;
      maskPixels[i * 4 + 3] = 255;
    }
  }

  // Review overlay: master over stage brown, editable region tinted green.
  const preview = Buffer.alloc(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    const a = master.pixels[i * 4 + 3] / 255;
    let r = Math.round(master.pixels[i * 4] * a + 0x9b * (1 - a));
    let g = Math.round(master.pixels[i * 4 + 1] * a + 0x65 * (1 - a));
    let b = Math.round(master.pixels[i * 4 + 2] * a + 0x42 * (1 - a));
    if (mask[i]) {
      r = Math.round(r * 0.45);
      g = Math.round(Math.min(255, g * 0.45 + 140));
      b = Math.round(b * 0.45);
    }
    preview[i * 4] = r;
    preview[i * 4 + 1] = g;
    preview[i * 4 + 2] = b;
    preview[i * 4 + 3] = 255;
  }

  mkdirSync(dirname(options.out), { recursive: true });
  writeFileSync(options.out, encodeRgbaPng(width, height, maskPixels));
  writeFileSync(options.preview, encodeRgbaPng(width, height, preview));
  const pct = ((100 * editable) / (width * height)).toFixed(2);
  console.log(`Mask: ${options.out} (${editable} editable px, ${pct}% of canvas)`);
  console.log(`Preview: ${options.preview}`);
}

const invokedDirectly = process.argv[1] && import.meta.url === new URL(`file:///${process.argv[1].replace(/\\/g, "/")}`).href;
if (invokedDirectly) main();
