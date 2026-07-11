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
// not "bit-identical".
//
// Violations are split into two independently-tuned categories, based on
// evidence from three real generations against this master (docs/art/pilot/
// raw/garment_v1.png, v2.png, v2.1.png - see the F0.2.2 vault Historial
// entries for the full measurements):
//   - COLOR drift (same opaque/transparent state, color changed): every
//     generation showed a mild, roughly uniform tone/exposure shift across
//     the whole protected region (avg ~9-18 per channel even on flat skin),
//     inherent to this edit pipeline re-encoding the full canvas - not a
//     sign of identity loss. Checked with a higher per-pixel tolerance
//     (COLOR_DRIFT_TOLERANCE), and pixels far beyond even that are flagged
//     separately as "severe" for human spot-checking without failing the
//     whole generation on their own.
//   - SILHOUETTE mismatch (opaque<->transparent flip): consistently ~2000px
//     (~0.13% of the canvas) scattered thinly along the ENTIRE contour
//     (hair curls, limb edges) in every generation, never concentrated in
//     one place - the antialiasing signature of re-rendering a complex
//     illustrated silhouette, not a localized shape/pose change. Checked
//     as a fraction of the canvas (MAX_SILHOUETTE_MISMATCH_FRACTION) rather
//     than a hard per-pixel tolerance, since alpha is boolean - there is no
//     "small delta" for a flipped pixel, only how many of them there are.
//
// Pure functions over decoded {width,height,pixels} objects; no file I/O
// here (the CLI wrapper does that), so node tests can use tiny synthetic
// canvases.

/** Default per-channel delta allowed on protected (outside-mask) pixels before it counts as color drift. */
export const COLOR_DRIFT_TOLERANCE = 25;
/** Per-channel delta above which a color-drift pixel is also flagged "severe" (informational, non-blocking on its own). */
export const SEVERE_COLOR_DRIFT_THRESHOLD = 60;
/** Fraction of the total canvas that may flip opaque<->transparent outside the mask before the silhouette check fails. */
export const MAX_SILHOUETTE_MISMATCH_FRACTION = 0.005;
/** Fraction of the total canvas that may exceed COLOR_DRIFT_TOLERANCE before the color-drift check fails. */
export const MAX_COLOR_DRIFT_FRACTION = 0.05;
/** Fraction of the total canvas that may exceed SEVERE_COLOR_DRIFT_THRESHOLD (small-feature high-contrast edges - eyes, pupils) before failing on its own. */
export const MAX_SEVERE_COLOR_DRIFT_FRACTION = 0.003;
/** Minimum per-channel delta for an inside-mask pixel to enter the layer. */
export const LAYER_THRESHOLD = 12;

/** @deprecated kept for backward compatibility with earlier reports; use COLOR_DRIFT_TOLERANCE. */
export const OUTSIDE_TOLERANCE = 8;
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
 *
 * Returns { layerPixels, layerCount, silhouette: {count, fraction, maxAllowedFraction, samples[]},
 * colorDrift: {count, maxDelta, severeCount, severeThreshold, samples[]}, passed }.
 * `passed` is true only if BOTH silhouette and colorDrift stay within their
 * independent thresholds - see the module header for why they're separate.
 */
export function extractEditLayer(master, editedInput, mask, options = {}) {
  const colorDriftTolerance = options.colorDriftTolerance ?? options.outsideTolerance ?? COLOR_DRIFT_TOLERANCE;
  const severeColorDriftThreshold = options.severeColorDriftThreshold ?? SEVERE_COLOR_DRIFT_THRESHOLD;
  const maxSilhouetteMismatchFraction =
    options.maxSilhouetteMismatchFraction ?? MAX_SILHOUETTE_MISMATCH_FRACTION;
  const maxColorDriftFraction = options.maxColorDriftFraction ?? MAX_COLOR_DRIFT_FRACTION;
  const maxSevereColorDriftFraction = options.maxSevereColorDriftFraction ?? MAX_SEVERE_COLOR_DRIFT_FRACTION;
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
  let silhouetteCount = 0;
  let colorDriftCount = 0;
  let colorDriftMax = 0;
  let severeCount = 0;
  const silhouetteSamples = [];
  const colorDriftSamples = [];

  for (let idx = 0; idx < width * height; idx++) {
    const p = idx * 4;
    const masterOpaque = master.pixels[p + 3] >= 128;
    const editedOpaque = edited.pixels[p + 3] >= 128;

    if (!mask[idx]) {
      // Protected pixel: silhouette (opaque/transparent state) and color
      // drift are tracked and thresholded independently - see module header.
      if (masterOpaque !== editedOpaque) {
        silhouetteCount++;
        if (silhouetteSamples.length < 20) {
          silhouetteSamples.push({ x: idx % width, y: Math.floor(idx / width) });
        }
        continue;
      }
      if (!masterOpaque) continue; // both transparent: nothing to compare

      const delta = maxChannelDelta(master.pixels, p, edited.pixels, p);
      if (delta > colorDriftTolerance) {
        colorDriftCount++;
        if (delta > colorDriftMax) colorDriftMax = delta;
        if (delta > severeColorDriftThreshold) severeCount++;
        if (colorDriftSamples.length < 20) {
          colorDriftSamples.push({ x: idx % width, y: Math.floor(idx / width), delta });
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

  const silhouetteFraction = silhouetteCount / (width * height);
  const colorDriftFraction = colorDriftCount / (width * height);
  const severeFraction = severeCount / (width * height);
  const silhouettePassed = silhouetteFraction <= maxSilhouetteMismatchFraction;
  const colorDriftPassed =
    colorDriftFraction <= maxColorDriftFraction && severeFraction <= maxSevereColorDriftFraction;

  return {
    width,
    height,
    layerPixels,
    layerCount,
    silhouette: {
      count: silhouetteCount,
      fraction: silhouetteFraction,
      maxAllowedFraction: maxSilhouetteMismatchFraction,
      passed: silhouettePassed,
      samples: silhouetteSamples,
    },
    colorDrift: {
      count: colorDriftCount,
      fraction: colorDriftFraction,
      maxAllowedFraction: maxColorDriftFraction,
      maxDelta: colorDriftMax,
      tolerance: colorDriftTolerance,
      severeCount,
      severeFraction,
      maxAllowedSevereFraction: maxSevereColorDriftFraction,
      severeThreshold: severeColorDriftThreshold,
      passed: colorDriftPassed,
      samples: colorDriftSamples,
    },
    passed: silhouettePassed && colorDriftPassed,
  };
}
