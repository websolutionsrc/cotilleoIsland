# Defringe (cutout matte cleanup)

Small, dependency-free Node script that removes the thin white/light "fringe"
that background-removal tools often leave at the silhouette edge of a
character cutout. See `docs/adr/0007-modular-paperdoll-production.md`: cutout
and cleanup are explicitly external-tool steps in the paper-doll pipeline, not
runtime code - this is the small `tools/` helper that ADR allows for.

## Why this exists

Our cutouts use a hard (binary) alpha channel, not a soft antialiased edge, so
classic alpha-decontamination doesn't apply directly. What actually happens is
that some pixels right at the boundary keep a color blended with the original
(usually white) background from before the cutout tool thresholded the alpha.
This tool detects those pixels - opaque, right next to a transparent pixel,
close to white/neutral (low saturation), and noticeably brighter than a
confirmed-interior reference nearby - and shaves them (sets alpha to 0)
instead of guessing a replacement color. Shaving shrinks the silhouette by a
sub-pixel ring, invisible at the render sizes this project uses.

## Usage

```bash
node tools/defringe/defringe.mjs <input.png> [output.png] [options]
# or, once added to package.json:
npm run defringe -- <input.png> [output.png] [options]
```

Only accepts 8-bit RGBA PNGs (color type 6), non-interlaced - the format
`art_library.md` section 6 already requires for every exported asset.

Without an explicit output path, writes `<name>.defringed.png` next to the
input (never overwrites in place unless you pass `--in-place`).

### Options

| Flag | Default | Meaning |
|---|---|---|
| `--in-place` | off | Overwrite the input file instead of writing a `.defringed.png` sibling. |
| `--threshold=N` | 40 | Luminance delta vs. the interior reference needed to flag a pixel. |
| `--sat-max=N` | 30 | Max color saturation (max-min channel) still considered "whitish". Real colored edges are left alone. |
| `--alpha-cut=N` | 128 | Alpha value that separates opaque from transparent. |
| `--radius=N` | 4 | Search radius (px) for a safe interior reference color. |
| `--passes=N` | 1 | Run multiple passes; each pass can expose a thinner residual ring underneath. `2`-`3` clears most real-world fringe. |
| `--dry-run` | off | Report what would change without writing any file. |

### Example

```bash
node tools/defringe/defringe.mjs docs/art/pilot/raw/task1_v2.png --passes=2
```

## Notes

- Only touches pixels that are both edge-adjacent AND whitish/low-saturation:
  a genuine light-colored garment or highlight in the interior of the
  character is not affected, since it won't be sitting right next to a
  transparent pixel.
- If a thin detail (e.g. a single hair strand) has no confirmed-interior
  neighbor within `--radius`, it is left untouched rather than risking
  deleting real content.
- Run with `--dry-run` first on new asset batches to sanity-check the pixel
  count before committing to a change.
