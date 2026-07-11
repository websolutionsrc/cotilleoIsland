#!/usr/bin/env node
// v01.01.F0.2.2 - Generate the allowed-edit mask for the hair proof.
//
// Unlike the garment mask (color-segmented from the neutral outfit's exact
// fabric color), a new hairstyle's silhouette does not resemble the
// current curly hair - a straight bob or a ponytail extends into
// completely different territory. This mask is geometric instead: a large
// oval around and above the head (generous enough for a very different
// silhouette), minus a protected face-oval (eyes, eyebrows, nose, mouth,
// ears, cheeks - measured directly off the approved master, not guessed),
// clipped at the shoulder line so it can never overlap the already-
// approved garment mask's editable region.
//
// Landmark coordinates below come from a gridded zoom render of the
// master (see the F0.2.2 vault Historial "hair + expression masks" entry
// for the measurement process) - not estimated from the unzoomed image.
//
// Usage: node tools/art/make-hair-mask.mjs

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { decodeRgbaPng, encodeRgbaPng } from "./png-rgba.mjs";
import { buildOpenAiMask } from "./make-garment-mask.mjs";
import { unionEllipses, subtract, clipBelow } from "./geometry-mask-lib.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO = join(__dirname, "..", "..");
const MASTER = join(REPO, "docs", "art", "pilot", "mara_v5_cutout.png");
const OUT_DIR = join(REPO, "docs", "art", "pilot", "masks");

// Outer region a new hairstyle may occupy: generous oval well beyond the
// current hair's bounds (measured figureBounds x:362-899, hair top y=170),
// so a bigger or differently-shaped cut has room, but still centered on
// the head rather than covering the whole canvas.
const HAIR_OUTER = { cx: 628, cy: 380, rx: 340, ry: 310 };

// Protected face oval: covers both eyes, both eyebrows, nose, mouth, both
// ears, and cheeks, measured off a 2x zoomed gridded render of the master
// (crop origin 380,250, 50px grid). Landmarks found there: left eye
// ~x505-570 y415-465, right eye ~x640-710 y395-460, left eyebrow
// ~x495-570 y385-400, right eyebrow ~x625-735 y355-380, nose ~x595-610
// y485-510, mouth ~x590-665 y520-540, right ear ~x730-790 y415-485.
// headPivot anchor (628,465) = face_center_excluding_hair sits at the
// nose bridge, used as the ellipse center with margin past every
// landmark above.
const FACE_PROTECTED = { cx: 628, cy: 465, rx: 185, ry: 165 };

// Same shoulder line the garment mask starts at (CHIN_GUARD_Y in
// make-garment-mask.mjs) - guarantees zero overlap with the approved
// garment-editable region, so a hair edit can never touch it.
const SHOULDER_CLIP_Y = 560;

export function buildHairMask(width, height) {
  const outer = unionEllipses(width, height, [HAIR_OUTER]);
  const face = unionEllipses(width, height, [FACE_PROTECTED]);
  const withoutFace = subtract(outer, face);
  const mask = clipBelow(withoutFace, width, height, SHOULDER_CLIP_Y);
  let editable = 0;
  for (let i = 0; i < mask.length; i++) if (mask[i]) editable++;
  return { mask, editable };
}

function main() {
  const master = decodeRgbaPng(readFileSync(MASTER));
  const { width, height } = master;
  const { mask, editable } = buildHairMask(width, height);

  const maskPixels = Buffer.alloc(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    if (mask[i]) {
      maskPixels[i * 4] = 255;
      maskPixels[i * 4 + 1] = 255;
      maskPixels[i * 4 + 2] = 255;
      maskPixels[i * 4 + 3] = 255;
    }
  }

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

  const openaiPixels = buildOpenAiMask(master, mask);

  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(join(OUT_DIR, "mara_v5_hair_mask.png"), encodeRgbaPng(width, height, maskPixels));
  writeFileSync(join(OUT_DIR, "mara_v5_hair_mask_preview.png"), encodeRgbaPng(width, height, preview));
  writeFileSync(join(OUT_DIR, "mara_v5_hair_mask_openai.png"), encodeRgbaPng(width, height, openaiPixels));

  const pct = ((100 * editable) / (width * height)).toFixed(2);
  console.log(`Mask: ${editable} editable px (${pct}% of canvas)`);
  console.log(`Written to ${OUT_DIR}`);
}

const invokedDirectly = process.argv[1] && import.meta.url === new URL(`file:///${process.argv[1].replace(/\\/g, "/")}`).href;
if (invokedDirectly) main();
