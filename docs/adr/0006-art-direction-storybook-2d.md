# ADR 0006 - Art direction: "Storybook with volume" 2D (Direction B)

- **Status:** accepted
- **Date:** 2026-07-07
- **Authorship:** designed by Fable 5 (interactive session); direction chosen by the
  user from 3 proposals anchored on 4 user-provided reference images.

## Context
F2.6 (CODEMAP) requires a visual direction before building F3.4 (scene UI) and F5.
Product decision already fixed: V1 stays on 2D Phaser, no 3D migration. The user wants
chibi characters close to the provided references, "un poco 3D" (volume feel), and a
large future wardrobe: clothes, accessories, tattoos, hairstyles, realistic skin tones.

## Decision
Adopt **Direction B - "Storybook with volume"**: expressive warm-brown variable-weight
outlines + two-tone cel shading + one soft gradient pass for volume, fixed top-left
key light, big glossy double-highlight eyes, 2.7-heads chibi proportions. Full spec in
`docs/art_bible.md` (layer stack, 10-tone realistic skin ramp, 9 expression states,
export rules, tween-based V1 animation, prompt templates, delegation map).

**Libraries decision (explicit F2.6 requirement):** no new runtime library yet. Phaser
loads plain PNGs now; atlas packing reconsidered (with its own ADR) past ~50 sprites.

## Alternatives discarded
| Alternative | Why discarded |
|---|---|
| A - "Cozy Prerender" (outline-less soft-3D look) | Most elaborate in mockups, but fragile in production: modular layers and AI-generated batches drift without an outline to hide seams; strict global lighting hard to keep consistent |
| C - "Vinyl diorama" (matte clay materials) | Strongest own identity, but tattoos/prints read poorly on matte-clay skin, conflicting with the wardrobe/tattoo ambition |
| Hybrid B sprites + A portraits | Two rulesets to maintain in the bible and in every batch; rejected for now, can be revisited after the pilot |
| 3D or 2.5D engine change | Already excluded by product decision in CODEMAP F2.6 (2D Phaser stays) |

## Consequences
- F3.4 scene UI consumes the bible's bubble/icon/pose language (8 scene icons map 1:1
  to F3 SceneTypes; ad-hoc F2 hunger bubble gets replaced).
- Expression rendering will be a pure projection (SceneIntent + needs + personality ->
  avatarExpression), extending ADR 0004; never persisted.
- Wardrobe scale is enabled by data, not art: skin-reveal metadata + palette-swap
  triplets; one garment drawing yields N recolors.
- Pilot gate (bible section 13) must pass user approval before any mass asset batch.
