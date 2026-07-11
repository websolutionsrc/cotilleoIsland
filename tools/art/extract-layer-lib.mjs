// v01.01.F0.2.2 - Edit-layer extraction and invariant validation (pure lib).
//
// Given the registration master, an edit-on-template generation result, and
// the allowed-edit mask, this splits the result into:
//   - violations: pixels OUTSIDE the mask that differ beyond tolerance
//     (the generator touched protected pixels - identity/pose/lighting);
//   - the extracted layer: pixels INSIDE the mask that genuinely changed,
//     as an RGBA layer aligned to the same source canvas, so that
//     master + layer reproduces the edited image ("composites without seams").
//
// Tolerances exist because real image generators re-encode the whole image:
// protected pixels come back with small noise even in edit mode. The
// contract's unmasked_pixels invariant is enforced as "no visible change",
// not "bit-identical" - OUTSIDE_TOLERANCE is per-channel on opaque pixels.
//
// Pure functions over decoded {width,height,pixels} objects; no file I/O
// here (the CLI wrapper does that), so node tests can use tiny synthetic
// canvases.

/** Default per-channel delta allowed on protected (outside-mask) pixels. */
export const OUTSIDE_TOLERANCE = 8;
/** Minimum per-channel delta for an inside-mask pixel to enter the layer. */
export const LAYER_THRESHOLD = 12;
/** Background-removal heuristic for opaque generator output (same family as tools/cutout). */
export function isNearWhiteBackground(r, g, b) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  return max >= 235 && max - min <= 12;
}

function maxChannelDelta(pixels, i, other, j) {
  return Math.max(
    Math.abs(pixels[i] - other[j]),
    Math.abs(pixels[i + 1] - other[j + 1]),
    Math.abs(pixels[i + 2] - other[j + 2]),
  );
}

/**
 * Normalize a generator result to true alpha. RGBA input passes through;
 * RGB input (sourceColorType 2) gets the near-white background removed the
 * same way the master's own cutout was produced.
 */
export function normalizeEditedAlpha(edited) {
  if (edited.sourceColorType !== 2) return edited;
  const { width, height } = edited;
  const pixels = Buffer.from(edited.pixels);
  for (let i = 0; i < width * height; i++) {
    const p = i * 4;
    if (isNearWhiteBackground(pixels[p], pixels[p + 1], pixels[p + 2])) {
      pixels[p + 3] = 0;
    }
  }
  return { width, height, pixels, sourceColorType: 6 };
}

/**
 * Validate invariants and extract the edit layer.
 * `mask` is a Uint8Array (1 = editable) of width*height.
 * Returns { layerPixels, layerCount, violations: {count, maxDelta, samples[]} }.
 */
export function extractEditLayer(master, editedInput, mask, options = {}) {
  const outsideTolerance = options.outsideTolerance ?? OUTSIDE_TOLERANCE;
  const layerThreshold = options.layerThreshold ?? LAYER_THRESHOLD;

  if (master.width !== editedInput.width || master.height !== editedInput.height) {
    throw new Error(
      `Canvas mismatch: master ${master.width}x${master.height} vs edited ${editedInput.width}x${editedInput.height}. ` +
        "Edit-on-template must keep the exact source canvas (editInvariants: canvas).",
    );
  }
  const { width, height } = master;
  if (mask.length !== width * height) {
    throw new Error("Mask dimensions do not match the canvas.");
  }

  const edited = normalizeEditedAlpha(editedInput);
  const layerPixels = Buffer.alloc(width * height * 4);
  let layerCount = 0;
  let violationCount = 0;
  let violationMax = 0;
  const samples = [];

  for (let idx = 0; idx < width * height; idx++) {
    const p = idx * 4;
    const masterOpaque = master.pixels[p + 3] >= 128;
    const editedOpaque = edited.pixels[p + 3] >= 128;

    if (!mask[idx]) {
      // Protected pixel: must match the master (within tolerance).
      let delta = 0;
      if (masterOpaque !== editedOpaque) {
        delta = 255; // silhouette changed outside the mask
      } else if (masterOpaque) {
        delta = maxChannelDelta(master.pixels, p, edited.pixels, p);
      }
      if (delta > outsideTolerance) {
        violationCount++;
        if (delta > violationMax) violationMax = delta;
        if (samples.length < 20) {
          samples.push({ x: idx % width, y: Math.floor(idx / width), delta });
        }
      }
      continue;
    }

    // Editable pixel: enters the layer if it visibly differs from the master.
    const changed =
      masterOpaque !== editedOpaque ||
      (editedOpaque && maxChannelDelta(master.pixels, p, edited.pixels, p) >= layerThreshold);
    if (changed && editedOpaque) {
      layerPixels[p] = edited.pixels[p];
      layerPixels[p + 1] = edited.pixels[p + 1];
      layerPixels[p + 2] = edited.pixels[p + 2];
      layerPixels[p + 3] = 255;
      layerCount++;
    }
    // Editable pixel that became transparent (silhouette shrank inside the
    // mask, e.g. a sleeveless garment exposing skin the master already has):
    // nothing to store - the master shows through.
  }

  return {
    width,
    height,
    layerPixels,
    layerCount,
    violations: { count: violationCount, maxDelta: violationMax, samples },
  };
}
