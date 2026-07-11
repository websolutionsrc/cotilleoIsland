#!/usr/bin/env node
// v01.01.F0.2.2 - Generate the allowed-edit mask for the expression proof.
//
// Geometric, same reasoning as make-hair-mask.mjs: expression features
// (eyes, eyebrows, mouth) aren't a solid color block a color-segmentation
// approach could find. Landmarks measured off the same gridded zoom render
// of the master used for the hair mask (crop origin 380,250, 50px grid) -
// see the F0.2.2 vault Historial "hair + expression masks" entry.
//
// Deliberately does NOT cover the skin/cheek/face-outline area: per the
// contract's zOrder, "face_expression" is a distinct layer from
// "skin_detail" - only the features that actually change between
// expressions (eye shape, eyebrow angle, mouth curve) are editable here.
// Skin tone, face outline, nose, and everything else stay locked.
//
// Usage: node tools/art/make-expression-mask.mjs

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { decodeRgbaPng, encodeRgbaPng } from "./png-rgba.mjs";
import { buildOpenAiMask } from "./make-garment-mask.mjs";
import { unionEllipses } from "./geometry-mask-lib.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO = join(__dirname, "..", "..");
const MASTER = join(REPO, "docs", "art", "pilot", "mara_v5_cutout.png");
const OUT_DIR = join(REPO, "docs", "art", "pilot", "masks");

// Each feature gets generous padding past its measured bounds so a
// reaction expression (wider eyes, raised brows, open mouth) has room
// without the mask itself needing to change per-expression.
const FEATURES = [
  { name: "left-eye+brow", cx: 532, cy: 425, rx: 65, ry: 65 },
  { name: "right-eye+brow", cx: 675, cy: 405, rx: 75, ry: 75 },
  { name: "mouth", cx: 627, cy: 528, rx: 55, ry: 40 },
];

export function buildExpressionMask(width, height) {
  const mask = unionEllipses(width, height, FEATURES);
  let editable = 0;
  for (let i = 0; i < mask.length; i++) if (mask[i]) editable++;
  return { mask, editable };
}

function main() {
  const master = decodeRgbaPng(readFileSync(MASTER));
  const { width, height } = master;
  const { mask, editable } = buildExpressionMask(width, height);

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
  writeFileSync(join(OUT_DIR, "mara_v5_expression_mask.png"), encodeRgbaPng(width, height, maskPixels));
  writeFileSync(join(OUT_DIR, "mara_v5_expression_mask_preview.png"), encodeRgbaPng(width, height, preview));
  writeFileSync(join(OUT_DIR, "mara_v5_expression_mask_openai.png"), encodeRgbaPng(width, height, openaiPixels));

  const pct = ((100 * editable) / (width * height)).toFixed(2);
  console.log(`Mask: ${editable} editable px (${pct}% of canvas)`);
  console.log(`Written to ${OUT_DIR}`);
}

const invokedDirectly = process.argv[1] && import.meta.url === new URL(`file:///${process.argv[1].replace(/\\/g, "/")}`).href;
if (invokedDirectly) main();
