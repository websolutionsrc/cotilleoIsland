# ADR 0007 - Modular paper-doll: how the art library is actually produced

- **Status:** accepted
- **Date:** 2026-07-07
- **Authorship:** art direction by Fable 5 (ADR 0006); this production method by
  Opus 4.8 (interactive session) after the user chose full modular paper-doll scope.

## Context
The user chose **full modular paper-doll** for V1 characters: separate layers (skin,
face, hair, garments, accessories, tattoos) composited at runtime, freely mixable,
recolored by code tint. The hard problem is NOT the number of images (tint + layering
keep it to ~50-70 generated *shapes*, not thousands of combinations) but getting
AI-generated layers that are (a) truly transparent and (b) pixel-aligned so they stack
without seams. Observed reality: GPT image outputs (`task1_v1`, `task1_v2`) are RGB
without an alpha channel - the "transparent" background is painted into the pixels.

## Decision
Produce layers with the **edit-on-template + mask** method, not fresh generation:

1. **Registration template**: one clean, background-free base body (from the approved
   anchor) on a FIXED canvas (size + body baseline + head-center + hand/chest anchors).
   Every asset is authored against this exact frame.
2. **Generate by EDIT, not from scratch**: to add a garment/hair, feed the image tool
   the template and ask it to add ONLY that item, changing nothing else. The output is
   the same body wearing the item, already aligned to the frame.
3. **Cut out** (mandatory step): remove background AND body with an external tool
   (rembg / Photopea / remove.bg) to leave only the layer on true alpha, still aligned.
4. **Tint for color**: garments/hair/skin are authored in one neutral color; runtime
   code recolors via tint (palette-swap triplets, art library sec. 3). Color is never
   generated per-variant.
5. **Compose at runtime**: Phaser stacks layers by z-order at the shared anchors.

**Prove-one-layer gate**: before generating any volume, validate the whole pipeline on
ONE garment end-to-end (template -> edit -> cut -> composite in the real scene). Only
if it aligns cleanly do mass batches start. Same "validate before volume" discipline as
the rest of the project.

## Tooling
- Cutout/transparency: external tool (rembg CLI, Photopea, or remove.bg). NOT the image
  generator, NOT a runtime dependency. A small `tools/` cutout helper is allowed later.
- Runtime: still no new runtime library (plain PNGs + Phaser tint). Atlas packing
  revisited with its own ADR past ~50 sprites (per ADR 0006).

## Consequences
- A dedicated **layer-compositor + preview tool** (Codex/Sonnet) is the first code task:
  it makes combinations visible and catches alignment errors immediately. Build it
  before, or alongside, the first garment - not after 50 assets exist.
- There is real per-asset cleanup work (masking). Accepted as the cost of paper-doll;
  minimized by editing on the shared template so alignment is free.
- Manifest JSON per asset (slot, anchor, tint-allowed, skin-reveal regions) is cheap
  repetitive work -> Haiku/GPT-mini.
- Exact pixel anchors are finalized once the first clean cut template exists (the raw
  GPT outputs cannot be measured reliably because their background is baked in).

## Alternatives discarded
| Alternative | Why discarded |
|---|---|
| Generate every skin x hair x outfit x color combination | Combinatorial explosion (thousands+), impossible to keep consistent - the user's own objection |
| Full-outfit character swaps (no layer mixing) | Not paper-doll; loses the free-mixing the user chose |
| Trust the generator for transparency | Empirically false: outputs are RGB, fake transparency; a cutout step is non-negotiable |
| Fresh generation per garment (not edit-on-template) | Alignment drifts every time; editing the fixed template is what makes layers stack |
