#!/usr/bin/env node
// Ad-hoc full-body cutout for docs/art/pilot/mara_v5.png (informal, outside
// the F8 visual production pipeline - see the 2026-07-10 vault Historial
// entry "Mara v5 wired into the runtime character, outside F8" for why).
//
// mara_v5.png is an opaque 1254x1254 RGB PNG (color type 2, no alpha
// channel) with an off-white/grainy background - not a real transparent
// cutout. This script does a naive but effective background removal (same
// near-white/low-saturation heuristic as tools/icon-gen/icon-from-mara.mjs,
// applied to the whole 1254x1254 canvas instead of a cropped bust) to
// produce a real RGBA PNG, matching the format the runtime already expects
// (public/art/pilot/mara_pilot_v4.png is 1254x1254, color type 6).
//
// Does NOT overwrite docs/art/pilot/mara_v5.png (the raw generation output
// stays untouched) - writes docs/art/pilot/mara_v5_cutout.png instead. Run
// tools/defringe/defringe.mjs on that output afterward, same as was done
// for v4, before copying to public/art/pilot/.
//
// Usage: node tools/cutout/cutout-mara-v5.mjs

import { readFileSync, writeFileSync } from "node:fs";
import { inflateSync, deflateSync } from "node:zlib";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SOURCE_PATH = join(__dirname, "..", "..", "docs", "art", "pilot", "mara_v5.png");
const OUT_PATH = join(__dirname, "..", "..", "docs", "art", "pilot", "mara_v5_cutout.png");

const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

function readChunks(buffer) {
  const chunks = [];
  let offset = PNG_SIGNATURE.length;
  while (offset < buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.toString("ascii", offset + 4, offset + 8);
    const data = buffer.subarray(offset + 8, offset + 8 + length);
    chunks.push({ type, data });
    offset += 12 + length;
    if (type === "IEND") break;
  }
  return chunks;
}

function paethPredictor(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  if (pb <= pc) return b;
  return c;
}

function unfilter(raw, width, height, bytesPerPixel) {
  const stride = width * bytesPerPixel;
  const out = Buffer.alloc(height * stride);
  let pos = 0;
  for (let y = 0; y < height; y++) {
    const filterType = raw[pos++];
    for (let x = 0; x < stride; x++) {
      const rawByte = raw[pos++];
      const a = x >= bytesPerPixel ? out[y * stride + x - bytesPerPixel] : 0;
      const b = y > 0 ? out[(y - 1) * stride + x] : 0;
      const c = x >= bytesPerPixel && y > 0 ? out[(y - 1) * stride + x - bytesPerPixel] : 0;
      let value;
      switch (filterType) {
        case 0: value = rawByte; break;
        case 1: value = rawByte + a; break;
        case 2: value = rawByte + b; break;
        case 3: value = rawByte + ((a + b) >> 1); break;
        case 4: value = rawByte + paethPredictor(a, b, c); break;
        default: throw new Error(`Unsupported PNG filter type ${filterType} at row ${y}`);
      }
      out[y * stride + x] = value & 0xff;
    }
  }
  return out;
}

function decodePngRgb(buffer) {
  if (!buffer.subarray(0, 8).equals(PNG_SIGNATURE)) throw new Error("Not a PNG file.");
  const chunks = readChunks(buffer);
  const ihdr = chunks.find((chunk) => chunk.type === "IHDR");
  const width = ihdr.data.readUInt32BE(0);
  const height = ihdr.data.readUInt32BE(4);
  const bitDepth = ihdr.data[8];
  const colorType = ihdr.data[9];
  if (colorType !== 2 || bitDepth !== 8) {
    throw new Error(`Expected 8-bit RGB (color type 2), got colorType=${colorType} bitDepth=${bitDepth}.`);
  }
  const idat = Buffer.concat(chunks.filter((chunk) => chunk.type === "IDAT").map((c) => c.data));
  const pixels = unfilter(inflateSync(idat), width, height, 3);
  return { width, height, pixels };
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buffer) {
  let crc = 0xffffffff;
  for (let i = 0; i < buffer.length; i++) crc = CRC_TABLE[(crc ^ buffer[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function makeChunk(type, data) {
  const typeBuf = Buffer.from(type, "ascii");
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([length, typeBuf, data, crc]);
}

function encodePngRgba(width, height, pixels) {
  const stride = width * 4;
  const raw = Buffer.alloc(height * (stride + 1));
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0;
    pixels.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride);
  }
  const idatData = deflateSync(raw, { level: 9 });
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  return Buffer.concat([
    PNG_SIGNATURE,
    makeChunk("IHDR", ihdr),
    makeChunk("IDAT", idatData),
    makeChunk("IEND", Buffer.alloc(0)),
  ]);
}

function isBackground(r, g, b) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  return max >= 235 && max - min <= 12;
}

function main() {
  const buffer = readFileSync(SOURCE_PATH);
  const { width, height, pixels } = decodePngRgb(buffer);
  console.log(`Source: ${SOURCE_PATH} (${width}x${height})`);

  const out = Buffer.alloc(width * height * 4);
  let transparent = 0;
  for (let i = 0, p = 0; i < pixels.length; i += 3, p += 4) {
    const r = pixels[i], g = pixels[i + 1], b = pixels[i + 2];
    const bg = isBackground(r, g, b);
    out[p] = r;
    out[p + 1] = g;
    out[p + 2] = b;
    out[p + 3] = bg ? 0 : 255;
    if (bg) transparent++;
  }
  console.log(
    `Marked ${transparent} of ${width * height} pixels transparent ` +
      `(${((100 * transparent) / (width * height)).toFixed(1)}%).`,
  );

  writeFileSync(OUT_PATH, encodePngRgba(width, height, out));
  console.log(`Written: ${OUT_PATH}`);
}

main();
