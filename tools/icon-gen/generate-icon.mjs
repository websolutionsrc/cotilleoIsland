#!/usr/bin/env node
// Placeholder PWA icon generator (F7 distribution). Zero new dependencies:
// reuses the hand-rolled PNG encoder pattern from tools/defringe/defringe.mjs
// (Node's built-in zlib + a small CRC32 implementation) instead of adding a
// canvas/image library just to draw two flat-color shapes.
//
// Draws a simple "island" glyph reusing colors already established in the
// running game (src/ui/island-scene.ts): teal background matching the PWA
// manifest's theme_color, a tan island body, a green hill cap. Explicitly a
// placeholder - swap for a real icon once the art pilot (Mara) closes and a
// proper app-icon direction exists (see CotilleoIsland vault note).
//
// Usage: node tools/icon-gen/generate-icon.mjs
// Writes public/icons/icon-192.png and public/icons/icon-512.png.

import { writeFileSync, mkdirSync } from "node:fs";
import { deflateSync } from "node:zlib";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, "..", "..", "public", "icons");

const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buffer) {
  let crc = 0xffffffff;
  for (let i = 0; i < buffer.length; i++) {
    crc = CRC_TABLE[(crc ^ buffer[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function makeChunk(type, data) {
  const typeBuf = Buffer.from(type, "ascii");
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const crcInput = Buffer.concat([typeBuf, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(crcInput), 0);
  return Buffer.concat([length, typeBuf, data, crc]);
}

function encodePng(width, height, pixels) {
  const bytesPerPixel = 4;
  const stride = width * bytesPerPixel;
  const raw = Buffer.alloc(height * (stride + 1));
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0; // filter type 0 ("none")
    pixels.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride);
  }
  const idatData = deflateSync(raw, { level: 9 });

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type: RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  return Buffer.concat([
    PNG_SIGNATURE,
    makeChunk("IHDR", ihdr),
    makeChunk("IDAT", idatData),
    makeChunk("IEND", Buffer.alloc(0)),
  ]);
}

// Colors reused from src/ui/island-scene.ts / vite.config.ts, not invented here.
const TEAL_BG = [0x1f, 0x6f, 0x5c];
const TAN_ISLAND = [0xc9, 0x8a, 0x55];
const GREEN_HILL = [0x7a, 0xa8, 0x5d];

function setPixel(pixels, size, x, y, [r, g, b]) {
  const i = (y * size + x) * 4;
  pixels[i] = r;
  pixels[i + 1] = g;
  pixels[i + 2] = b;
  pixels[i + 3] = 255;
}

function drawIcon(size) {
  const pixels = Buffer.alloc(size * size * 4);
  const cx = size / 2;
  const cy = size / 2;
  const islandRadius = size * 0.34;
  const hillCenterY = cy - islandRadius * 0.45;
  const hillRadius = islandRadius * 0.62;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dxIsland = x - cx;
      const dyIsland = y - cy;
      const dxHill = x - cx;
      const dyHill = y - hillCenterY;

      if (dxHill * dxHill + dyHill * dyHill <= hillRadius * hillRadius) {
        setPixel(pixels, size, x, y, GREEN_HILL);
      } else if (dxIsland * dxIsland + dyIsland * dyIsland <= islandRadius * islandRadius) {
        setPixel(pixels, size, x, y, TAN_ISLAND);
      } else {
        setPixel(pixels, size, x, y, TEAL_BG);
      }
    }
  }
  return pixels;
}

function main() {
  mkdirSync(OUT_DIR, { recursive: true });
  // 180: apple-touch-icon (iOS home screen - Safari does not read manifest
  // icons for this, it needs a dedicated <link rel="apple-touch-icon">).
  for (const size of [180, 192, 512]) {
    const pixels = drawIcon(size);
    const png = encodePng(size, size, pixels);
    const outPath = join(OUT_DIR, `icon-${size}.png`);
    writeFileSync(outPath, png);
    console.log(`Written: ${outPath} (${size}x${size})`);
  }
}

main();
