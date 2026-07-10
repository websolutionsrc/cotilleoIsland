# Icon generator (PWA placeholder icons)

Small, dependency-free Node script that draws the PWA/home-screen icons
(`public/icons/icon-{180,192,512}.png`) as flat colored circles. Built for
F7 (distribution): the manifest referenced these files but they never
existed, so "Add to Home Screen" on iPad would have shown a broken or
auto-generated icon.

## Why a script instead of a real asset

There is no app-icon direction yet - `docs/art_library.md` only covers
in-game character/scene art, not the PWA home-screen icon, and the pilot
character (Mara) is still being iterated on in parallel. Rather than block
F7 on that, or hand-author a throwaway PNG, this script draws a simple
"island" glyph reusing colors already established in the running game
(`src/ui/island-scene.ts`'s house/hill fills, and the manifest's
`theme_color`) so it looks intentional rather than arbitrary. **Explicitly a
placeholder** - replace with a real icon once the art pilot closes and an
app-icon direction exists.

## Usage

```bash
node tools/icon-gen/generate-icon.mjs
```

Writes `public/icons/icon-180.png` (apple-touch-icon), `icon-192.png` and
`icon-512.png` (manifest icons), overwriting whatever is there. No flags -
the glyph and sizes are fixed; re-run after changing the script if you want
different output.

## Notes

- Reuses the same hand-rolled PNG encoder pattern as `tools/defringe/defringe.mjs`
  (Node's built-in `zlib` + a small CRC32 implementation) instead of adding a
  canvas/image dependency for two flat-color circles (AGENTS.md: no new
  dependency without justification).
- Not covered by the Vitest suite, same as `defringe.mjs` - it is a build-time
  asset tool, not runtime/core logic. Verified visually after generation.
