#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { inflateSync } from "node:zlib";

const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

function chunks(buffer) {
  const result = [];
  let offset = PNG_SIGNATURE.length;
  while (offset < buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.toString("ascii", offset + 4, offset + 8);
    result.push({ type, data: buffer.subarray(offset + 8, offset + 8 + length) });
    offset += length + 12;
    if (type === "IEND") break;
  }
  return result;
}

function paeth(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
}

function unfilter(raw, width, height, bytesPerPixel) {
  const stride = width * bytesPerPixel;
  const output = Buffer.alloc(stride * height);
  let source = 0;
  for (let y = 0; y < height; y++) {
    const filter = raw[source++];
    for (let x = 0; x < stride; x++) {
      const value = raw[source++];
      const left = x >= bytesPerPixel ? output[y * stride + x - bytesPerPixel] : 0;
      const above = y > 0 ? output[(y - 1) * stride + x] : 0;
      const upperLeft = x >= bytesPerPixel && y > 0 ? output[(y - 1) * stride + x - bytesPerPixel] : 0;
      const restored = filter === 0 ? value : filter === 1 ? value + left : filter === 2 ? value + above : filter === 3 ? value + ((left + above) >> 1) : filter === 4 ? value + paeth(left, above, upperLeft) : NaN;
      if (Number.isNaN(restored)) throw new Error(`Unsupported PNG filter ${filter} at row ${y}.`);
      output[y * stride + x] = restored & 0xff;
    }
  }
  return output;
}

export function measureRgbaPng(buffer, alphaThreshold = 128) {
  if (!buffer.subarray(0, 8).equals(PNG_SIGNATURE)) throw new Error("Not a PNG file.");
  const pngChunks = chunks(buffer);
  const ihdr = pngChunks.find((chunk) => chunk.type === "IHDR")?.data;
  if (!ihdr) throw new Error("Missing IHDR chunk.");
  const width = ihdr.readUInt32BE(0);
  const height = ihdr.readUInt32BE(4);
  if (ihdr[8] !== 8 || ihdr[9] !== 6 || ihdr[12] !== 0) throw new Error("Expected a non-interlaced 8-bit RGBA PNG.");
  const idat = Buffer.concat(pngChunks.filter((chunk) => chunk.type === "IDAT").map((chunk) => chunk.data));
  const pixels = unfilter(inflateSync(idat), width, height, 4);

  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  let opaquePixels = 0;
  const rowPixelCounts = [];
  for (let y = 0; y < height; y++) {
    let rowCount = 0;
    for (let x = 0; x < width; x++) {
      if (pixels[(y * width + x) * 4 + 3] < alphaThreshold) continue;
      opaquePixels++;
      rowCount++;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
    rowPixelCounts.push(rowCount);
  }
  if (maxX < 0) throw new Error("No opaque pixels meet the alpha threshold.");
  return {
    width,
    height,
    alphaThreshold,
    opaquePixels,
    opaqueBounds: { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1, maxX, maxY },
    feetBaselineY: maxY,
    widestOpaqueRow: rowPixelCounts.indexOf(Math.max(...rowPixelCounts)),
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const inputPath = process.argv[2];
  if (!inputPath) {
    console.error("Usage: node tools/art/measure-registration-master.mjs <rgba.png>");
    process.exitCode = 1;
  } else {
    console.log(JSON.stringify(measureRgbaPng(readFileSync(inputPath)), null, 2));
  }
}
