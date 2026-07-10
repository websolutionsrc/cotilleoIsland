# Icon generator (PWA icons)

Two dependency-free Node scripts that produce the PWA/home-screen icons
(`public/icons/icon-{180,192,512}.png`). Built for F7 (distribution): the
manifest referenced these files but they never existed, so "Add to Home
Screen" on iPad would have shown a broken or auto-generated icon.

## `icon-from-mara.mjs` (active - run this one)

Generates the real icon from the art pilot: crops a bust/head region out of
`docs/art/pilot/mara_v5.png` (a 1254x1254 opaque RGB PNG, off-white/grainy
background, no alpha channel), recolors the background to the game's brand
teal (matching the manifest's `theme_color`), and box-filter downsamples to
180 (apple-touch-icon), 192, and 512 px.

```bash
node tools/icon-gen/icon-from-mara.mjs
```

The crop rectangle (`CROP` constant in the script) is hand-tuned against
`mara_v5.png`'s actual character bounding box - if the source art changes
(new pose, different framing), re-check the crop and adjust the constant
rather than assuming it still lines up. Background removal is a simple
"near-white, low-saturation -> brand teal" heuristic (same family as
`tools/defringe/defringe.mjs`'s edge detection, applied globally instead of
just at edges) - safe here because the character's actual colors (skin,
hair, clothing) are all saturated/dark enough not to collide with it, but
re-verify visually if the source art's palette changes.

Still provisional in the sense that the Mara pilot itself is still being
iterated on by the user - re-run this script whenever the source art
updates, rather than hand-editing the generated PNGs.

## `generate-icon.mjs` (fallback - flat placeholder)

Draws a simple "island" glyph (flat colored circles, no source art needed)
reusing colors already established in the running game. Kept around as a
zero-dependency fallback if `mara_v5.png` is ever missing/replaced and a
quick non-broken icon is needed again before new art is ready.

```bash
node tools/icon-gen/generate-icon.mjs
```

Both scripts write to the same three output paths and overwrite whatever is
there - running one after the other simply replaces the icon.

## Notes

- Both reuse the same hand-rolled PNG decode/encode pattern as
  `tools/defringe/defringe.mjs` (Node's built-in `zlib` + a small CRC32
  implementation) instead of adding a canvas/image dependency
  (AGENTS.md: no new dependency without justification).
- Not covered by the Vitest suite, same as `defringe.mjs` - these are
  build-time asset tools, not runtime/core logic. Verified visually (and,
  for `icon-from-mara.mjs`, by fetching the served files in the browser)
  after generation, not by an automated test.
