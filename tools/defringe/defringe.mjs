#!/usr/bin/env node
// Defringe / matte-cleanup tool for character cutout PNGs (art library pipeline,
// ADR 0007). Zero new dependencies: hand-rolled PNG decode/encode using Node's
// built-in zlib + a small CRC32 implementation.
//
// Problem it fixes: background-removal tools often leave a thin ring of fully
// opaque pixels right at the silhouette edge whose RGB color is still a blend
// with the original (usually white) background - a "fringe" or "halo". Because
// our cutouts use a hard (binary) alpha channel, there is no soft edge to
// unpremultiply/decontaminate the classic way; instead this tool detects edge
// pixels that are anomalously light and low-saturation compared to nearby
// confirmed-interior pixels, and shaves them (sets alpha to 0) rather than
// guessing a replacement color. Shaving shrinks the silhouette by a
// sub-pixel ring, which is imperceptible at the sizes this project uses
// (art_library.md section 6: 128-512 px render targets).
//
// Usage:
//   node tools/defringe/defringe.mjs <input.png> [output.png] [options]
//
// Options:
//   --in-place          Overwrite the input file instead of writing "<name>.defringed.png".
//   --threshold=N       Luminance delta vs. interior reference to flag a pixel (default 40).
//   --sat-max=N         Max color saturation (max-min channel) still considered "whitish" (default 30).
//   --alpha-cut=N       Alpha value (0-255) that separates opaque from transparent (default 128).
//   --radius=N          Search radius (px) for a safe interior reference color (default 4).
//   --passes=N          How many defringe passes to run in sequence (default 1).
//   --dry-run           Report what would change without writing any file.
//
// Only accepts 8-bit RGBA (PNG color type 6), non-interlaced - the format this
// project's art pipeline produces and consumes (art_library.md section 6).

import { readFileSync, writeFileSync } from "node:fs";
import { inflateSync, deflateSync } from "node:zlib";
import { basename, extname, dirname, join } from "node:path";

const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

function parseArgs(argv) {
  const positional = [];
  const options = {
    inPlace: false,
    threshold: 40,
    satMax: 30,
    alphaCut: 128,
    radius: 4,
    passes: 1,
    dryRun: false,
  };
  for (const arg of argv) {
    if (arg === "--in-place") options.inPlace = true;
    else if (arg === "--dry-run") options.dryRun = true;
    else if (arg.startsWith("--threshold=")) options.threshold = Number(arg.split("=")[1]);
    else if (arg.startsWith("--sat-max=")) options.satMax = Number(arg.split("=")[1]);
    else if (arg.startsWith("--alpha-cut=")) options.alphaCut = Number(arg.split("=")[1]);
    else if (arg.startsWith("--radius=")) options.radius = Number(arg.split("=")[1]);
    else if (arg.startsWith("--passes=")) options.passes = Number(arg.split("=")[1]);
    else positional.push(arg);
  }
  return { positional, options };
}

// --- PNG decode -------------------------------------------------------

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

function decodePng(buffer) {
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

  if (colorType !== 6 || bitDepth !== 8) {
    throw new Error(
      `Unsupported PNG format (colorType=${colorType}, bitDepth=${bitDepth}). ` +
        "This tool only accepts 8-bit RGBA PNGs (color type 6), matching the art " +
        "library export rules (art_library.md section 6).",
    );
  }
  if (interlace !== 0) {
    throw new Error("Interlaced PNGs are not supported. Re-export without interlacing.");
  }

  const idat = Buffer.concat(chunks.filter((chunk) => chunk.type === "IDAT").map((c) => c.data));
  const raw = inflateSync(idat);
  const pixels = unfilter(raw, width, height, 4);

  return { width, height, pixels };
}

// --- PNG encode -------------------------------------------------------

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
  // Filter type 0 ("none") per row: simplest correct encoder, larger IDAT than
  // an optimized filter search, but this is a build-time tool, not a shipped
  // asset pipeline, so correctness/simplicity wins over compression ratio.
  const raw = Buffer.alloc(height * (stride + 1));
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0;
    pixels.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride);
  }
  const idatData = deflateSync(raw, { level: 9 });

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type: RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  return Buffer.concat([
    PNG_SIGNATURE,
    makeChunk("IHDR", ihdr),
    makeChunk("IDAT", idatData),
    makeChunk("IEND", Buffer.alloc(0)),
  ]);
}

// --- Defringe algorithm -------------------------------------------------

const NEIGHBOR_OFFSETS_8 = [
  [-1, -1], [0, -1], [1, -1],
  [-1, 0], [1, 0],
  [-1, 1], [0, 1], [1, 1],
];

function luminance(r, g, b) {
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

function saturation(r, g, b) {
  return Math.max(r, g, b) - Math.min(r, g, b);
}

/**
 * Runs one defringe pass over `pixels` (mutated in place). Returns the number
 * of pixels shaved (set to fully transparent).
 */
function defringePass(pixels, width, height, options) {
  const { threshold, satMax, alphaCut, radius } = options;
  const isOpaque = (x, y) => pixels[(y * width + x) * 4 + 3] >= alphaCut;
  const inBounds = (x, y) => x >= 0 && x < width && y >= 0 && y < height;

  const isEdge = new Uint8Array(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (!isOpaque(x, y)) continue;
      for (const [dx, dy] of NEIGHBOR_OFFSETS_8) {
        const nx = x + dx, ny = y + dy;
        if (!inBounds(nx, ny) || !isOpaque(nx, ny)) {
          isEdge[y * width + x] = 1;
          break;
        }
      }
    }
  }

  const toShave = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (!isOpaque(x, y) || !isEdge[y * width + x]) continue;
      const i = (y * width + x) * 4;
      const r = pixels[i], g = pixels[i + 1], b = pixels[i + 2];
      if (saturation(r, g, b) > satMax) continue; // not whitish/neutral, likely real content

      let sum = 0, count = 0;
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const nx = x + dx, ny = y + dy;
          if (!inBounds(nx, ny)) continue;
          if (!isOpaque(nx, ny) || isEdge[ny * width + nx]) continue; // only trust confirmed interior pixels
          const ni = (ny * width + nx) * 4;
          sum += luminance(pixels[ni], pixels[ni + 1], pixels[ni + 2]);
          count++;
        }
      }
      if (count === 0) continue; // no safe reference nearby (thin sliver); leave untouched

      const interiorLuminance = sum / count;
      const edgeLuminance = luminance(r, g, b);
      if (edgeLuminance - interiorLuminance > threshold) {
        toShave.push(i);
      }
    }
  }

  for (const i of toShave) {
    pixels[i + 3] = 0;
  }
  return toShave.length;
}

// --- CLI ------------------------------------------------------------------

function main() {
  const { positional, options } = parseArgs(process.argv.slice(2));
  const [inputPath, explicitOutputPath] = positional;
  if (!inputPath) {
    console.error("Usage: node tools/defringe/defringe.mjs <input.png> [output.png] [options]");
    process.exit(1);
  }

  const buffer = readFileSync(inputPath);
  const { width, height, pixels } = decodePng(buffer);

  let totalShaved = 0;
  for (let pass = 1; pass <= options.passes; pass++) {
    const shaved = defringePass(pixels, width, height, options);
    totalShaved += shaved;
    console.log(`Pass ${pass}/${options.passes}: shaved ${shaved} fringe pixel(s).`);
    if (shaved === 0) break;
  }

  const totalPixels = width * height;
  console.log(
    `Total: ${totalShaved} pixel(s) shaved out of ${totalPixels} ` +
      `(${((100 * totalShaved) / totalPixels).toFixed(3)}%).`,
  );

  if (options.dryRun) {
    console.log("Dry run: no file written.");
    return;
  }

  const outputPath =
    explicitOutputPath ??
    (options.inPlace
      ? inputPath
      : join(dirname(inputPath), `${basename(inputPath, extname(inputPath))}.defringed.png`));

  const encoded = encodePng(width, height, pixels);
  writeFileSync(outputPath, encoded);
  console.log(`Written: ${outputPath}`);
}

main();
