// v01.01.F0.2.2 - Shared ellipse-region helpers for geometric (not
// color-segmented) edit masks. Hair and expression masks can't use the
// garment mask's "match the existing fabric color" approach - a new
// hairstyle's silhouette doesn't resemble the old one, and expression
// features (eyes/brows/mouth) aren't a solid color block. These build
// masks from measured landmark ellipses instead.

/** True if (x,y) falls inside an ellipse centered at (cx,cy) with semi-axes (rx,ry). */
export function insideEllipse(x, y, cx, cy, rx, ry) {
  const dx = (x - cx) / rx;
  const dy = (y - cy) / ry;
  return dx * dx + dy * dy <= 1;
}

/** Union of several ellipses into a Uint8Array mask (1 = inside any ellipse). */
export function unionEllipses(width, height, ellipses) {
  const mask = new Uint8Array(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      for (const e of ellipses) {
        if (insideEllipse(x, y, e.cx, e.cy, e.rx, e.ry)) {
          mask[y * width + x] = 1;
          break;
        }
      }
    }
  }
  return mask;
}

/** mask AND NOT other, in place semantics returning a new array. */
export function subtract(mask, other) {
  const out = new Uint8Array(mask.length);
  for (let i = 0; i < mask.length; i++) out[i] = mask[i] && !other[i] ? 1 : 0;
  return out;
}

/** mask AND (y <= maxY), clipping a region to stay above a horizontal line. */
export function clipBelow(mask, width, height, maxY) {
  const out = new Uint8Array(mask.length);
  for (let y = 0; y <= Math.min(maxY, height - 1); y++) {
    for (let x = 0; x < width; x++) out[y * width + x] = mask[y * width + x];
  }
  return out;
}
