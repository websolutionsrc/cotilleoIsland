// Shared dependency-free PNG codec for the art pipeline tools (v01.01.F0).
// Decodes 8-bit RGB (color type 2) and RGBA (color type 6) non-interlaced
// PNGs into flat RGBA buffers, and encodes RGBA back. Extracted from the
// pattern first written in tools/defringe/defringe.mjs and repeated in
// tools/icon-gen and tools/cutout; new art tools import this instead of
// copying the codec a fifth time. Existing tools keep their local copies
// deliberately (they are frozen, working utilities - not worth churn).

import { inflateSync, deflateSync } from "node:zlib";

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

/**
 * Decode an 8-bit RGB or RGBA non-interlaced PNG. Always returns flat RGBA
 * pixels (RGB sources get alpha 255) plus the source color type so callers
 * can tell whether real alpha was present.
 */
export function decodeRgbaPng(buffer) {
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

  if (bitDepth !== 8 || (colorType !== 2 && colorType !== 6)) {
    throw new Error(
      `Unsupported PNG format (colorType=${colorType}, bitDepth=${bitDepth}); ` +
        "only 8-bit RGB (2) and RGBA (6) are used in this pipeline.",
    );
  }
  if (interlace !== 0) {
    throw new Error("Interlaced PNGs are not supported. Re-export without interlacing.");
  }

  const idat = Buffer.concat(chunks.filter((chunk) => chunk.type === "IDAT").map((c) => c.data));
  const raw = inflateSync(idat);

  if (colorType === 6) {
    return { width, height, pixels: unfilter(raw, width, height, 4), sourceColorType: 6 };
  }
  const rgb = unfilter(raw, width, height, 3);
  const pixels = Buffer.alloc(width * height * 4);
  for (let i = 0, p = 0; i < rgb.length; i += 3, p += 4) {
    pixels[p] = rgb[i];
    pixels[p + 1] = rgb[i + 1];
    pixels[p + 2] = rgb[i + 2];
    pixels[p + 3] = 255;
  }
  return { width, height, pixels, sourceColorType: 2 };
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

/** Encode flat RGBA pixels as an 8-bit RGBA PNG (filter 0 rows). */
export function encodeRgbaPng(width, height, pixels) {
  const stride = width * 4;
  const raw = Buffer.alloc(height * (stride + 1));
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0;
    pixels.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  return Buffer.concat([
    PNG_SIGNATURE,
    makeChunk("IHDR", ihdr),
    makeChunk("IDAT", deflateSync(raw, { level: 9 })),
    makeChunk("IEND", Buffer.alloc(0)),
  ]);
}
