#!/usr/bin/env node
// Generates the real PWA icon from the Mara pilot art (F7 distribution),
// replacing the flat-color placeholder from generate-icon.mjs. Zero new
// dependencies: reuses the hand-rolled PNG decode/encode pattern from
// tools/defringe/defringe.mjs.
//
// Source: docs/art/pilot/mara_v5.png - a 1254x1254 opaque RGB PNG (color
// type 2, no alpha channel) with an off-white/grainy background, not an
// actual transparent cutout. This script crops a bust/head region, swaps
// the off-white background for the game's brand teal (matching the PWA
// manifest's theme_color), and downsamples (box filter) to the icon sizes.
//
// Usage: node tools/icon-gen/icon-from-mara.mjs

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { inflateSync, deflateSync } from "node:zlib";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SOURCE_PATH = join(__dirname, "..", "..", "docs", "art", "pilot", "mara_v5.png");
const OUT_DIR = join(__dirname, "..", "..", "public", "icons");

const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

// --- PNG decode (RGB, color type 2 - the source's actual format) ----------

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
  if (!buffer.subarray(0, 8).equals(PNG_SIGNATURE)) {
    throw new Error("Not a PNG file (bad signature).");
  }
  const chunks = readChunks(buffer);
  const ihdr = chunks.find((chunk) => chunk.type === "IHDR");
  if (!ihdr) throw new Error("Missing IHDR chunk.");

  const width = ihdr.data.readUInt32BE(0);
  const height = ihdr.data.readUInt32BE(4);
  const bitDepth = ihdr.data[8];
  const colorType = ihdr.data[9];
  const interlace = ihdr.data[12];

  if (colorType !== 2 || bitDepth !== 8) {
    throw new Error(`Expected 8-bit RGB (color type 2), got colorType=${colorType} bitDepth=${bitDepth}.`);
  }
  if (interlace !== 0) throw new Error("Interlaced PNGs are not supported.");

  const idat = Buffer.concat(chunks.filter((chunk) => chunk.type === "IDAT").map((c) => c.data));
  const raw = inflateSync(idat);
  const pixels = unfilter(raw, width, height, 3);
  return { width, height, pixels };
}

// --- PNG encode (RGBA, color type 6 - matches generate-icon.mjs's output) -

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

// --- Processing -------------------------------------------------------

const TEAL_BG = [0x1f, 0x6f, 0x5c]; // matches manifest theme_color / island-scene.ts

// Hand-tuned against mara_v5.png's actual bounding box (character occupies
// x:361-900, y:169-1007 out of a 1254x1254 canvas - see the F7 art-icon log
// entry in the vault Historial). Centers a square bust/head crop with some
// padding above the hair and down through the shoulders/tank top.
const CROP = { x0: 280, y0: 129, size: 700 };

function isBackground(r, g, b) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  return max >= 235 && max - min <= 12; // off-white/gray, low saturation
}

function cropAndRecolor(source) {
  const { size } = CROP;
  const out = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const sx = CROP.x0 + x;
      const sy = CROP.y0 + y;
      let r, g, b;
      if (sx < 0 || sy < 0 || sx >= source.width || sy >= source.height) {
        [r, g, b] = TEAL_BG;
      } else {
        const si = (sy * source.width + sx) * 3;
        r = source.pixels[si];
        g = source.pixels[si + 1];
        b = source.pixels[si + 2];
        if (isBackground(r, g, b)) [r, g, b] = TEAL_BG;
      }
      const di = (y * size + x) * 4;
      out[di] = r;
      out[di + 1] = g;
      out[di + 2] = b;
      out[di + 3] = 255;
    }
  }
  return out;
}

/** Box-filter downsample (average NxN source pixels per destination pixel). */
function downsample(pixels, sourceSize, targetSize) {
  const out = Buffer.alloc(targetSize * targetSize * 4);
  const scale = sourceSize / targetSize;
  for (let ty = 0; ty < targetSize; ty++) {
    const sy0 = Math.floor(ty * scale);
    const sy1 = Math.min(sourceSize, Math.floor((ty + 1) * scale));
    for (let tx = 0; tx < targetSize; tx++) {
      const sx0 = Math.floor(tx * scale);
      const sx1 = Math.min(sourceSize, Math.floor((tx + 1) * scale));
      let r = 0, g = 0, b = 0, count = 0;
      for (let sy = sy0; sy < sy1; sy++) {
        for (let sx = sx0; sx < sx1; sx++) {
          const si = (sy * sourceSize + sx) * 4;
          r += pixels[si];
          g += pixels[si + 1];
          b += pixels[si + 2];
          count++;
        }
      }
      const di = (ty * targetSize + tx) * 4;
      out[di] = Math.round(r / count);
      out[di + 1] = Math.round(g / count);
      out[di + 2] = Math.round(b / count);
      out[di + 3] = 255;
    }
  }
  return out;
}

function main() {
  const buffer = readFileSync(SOURCE_PATH);
  const source = decodePngRgb(buffer);
  console.log(`Source: ${SOURCE_PATH} (${source.width}x${source.height})`);

  const cropped = cropAndRecolor(source);
  mkdirSync(OUT_DIR, { recursive: true });

  for (const size of [180, 192, 512]) {
    const resized = size === CROP.size ? cropped : downsample(cropped, CROP.size, size);
    const png = encodePngRgba(size, size, resized);
    const outPath = join(OUT_DIR, `icon-${size}.png`);
    writeFileSync(outPath, png);
    console.log(`Written: ${outPath} (${size}x${size})`);
  }
}

main();
