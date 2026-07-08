# Pilot character kit - "Mara" (F2.6 pilot gate)

> Purpose: generate ONE complete character with the art library rules to validate the
> style before any mass batch. Designed by Fable 5; the user generates the images with
> an external image model and acts as taste gate; Sonnet/Codex integrate afterwards.
> Style spec: `docs/art_library.md`. Direction: B "Storybook with volume" (ADR 0006).

## Why this exact character
Mara exercises every hard case at once: medium-dark skin (shading recipe on S6),
curly hair in two layers (back+front), short sleeves (skin-reveal -> tattoo visible),
a jacket (outer-layer stacking), glasses (accessory layer) and the full expression set.
If Mara works, the system works.

## Character sheet (fixed values)
- Skin: **S6 `#A9704F`** (shadow/highlight per library recipe)
- Hair: **curly bob**, auburn `#7E3524` (back layer + front layer)
- Eyes: **amber `#B07830`**, double highlight
- Outfit A: mustard short-sleeve tee `#D9A441` + teal shorts `#3F7D74`
- Outfit B: olive utility jacket `#6B7A4C` worn OVER outfit A tee
- Accessory: round glasses, thin warm-brown frame (like reference image 3)
- Tattoo: small botanical sprig, left forearm, ink `#3E4A3A`
- Vibe: sociable + energetic (default face leans happy, blush on)

## Workflow
1. Run the 6 generation tasks below IN ORDER in your image tool (GPT/Midjourney/etc).
2. Always attach as image references: the 4 style refs from `docs/art/references/`
   AND (from task 2 onward) the approved output of Task 1. Same tool, same session/
   seed where possible.
3. Generate square 1024x1024, PNG, transparent background when the tool allows it.
4. Drop raw outputs in `docs/art/pilot/raw/` named `task{N}_v{attempt}.png`.
5. I (Fable) review each drop against the QA checklist and pass/fail with notes.
6. Approved set -> cleanup/cut to layers -> `public/art/pilot/` -> Codex/Sonnet
   integration task (compositing + tweens in the real island scene).

## Task 1 - Base body template (THE anchor; everything else references it)
```
cute chibi islander character sheet, front view, young woman, 2.7 heads tall with the
head about 45 percent of total height, medium-dark warm skin tone hex A9704F, auburn
curly bob hair hex 7E3524, big glossy amber eyes hex B07830 with two white highlights,
storybook style with warm dark-brown variable-weight outlines hex 402A20, two-tone cel
shading plus one soft gradient pass for volume, key light from top-left, neutral happy
expression, plain gray tank top and shorts as base clothing, arms slightly apart, legs
straight, transparent background, no text, no watermark
```

## Task 2 - Expression sheet (15 faces)
```
same character as reference sheet, face close-up grid of 15 expressions: neutral,
happy open smile, hungry with wavy mouth and tiny drool drop, sad glossy eyes,
tired half-lidded with faint eye bags, bored looking aside with slight frown,
lonely looking down with small closed mouth, surprised round eyes small o mouth,
quirky asymmetric one eye wide one squint tilted grin, angry gritted frown with
small steam puff, scared wide eyes shrunk pupils with sweat drop, anxious
side-glancing tight wavy mouth with sweat drop, embarrassed heavy blush stripes
pressed eyes with steam puff, vigorous sparkling determined eyes with big open grin,
in-love heart-shaped eye highlights soft smile, identical line weight and cel
shading as the reference, transparent background, no text
```

## Task 3 - Outfit A (tattoo visible)
```
same character as reference sheet, front view, wearing a mustard short-sleeve t-shirt
hex D9A441 and teal shorts hex 3F7D74, small botanical sprig tattoo in dark green-gray
hex 3E4A3A on the left forearm, bare arms visible, same storybook outlines and cel
shading as reference, happy expression, transparent background, no text
```

## Task 4 - Outfit B (outer layer) + glasses
```
same character as reference sheet, front view, wearing an open olive utility jacket
hex 6B7A4C over the mustard t-shirt, teal shorts, round thin-frame glasses in warm
brown, same storybook outlines and cel shading as reference, neutral expression,
transparent background, no text
```

## Task 5 - Poses sheet (outfit A)
```
same character as reference sheet, 4 full-body poses in a row: relaxed idle standing,
joyful reaction with arms up and happy face, upset reaction with arms crossed and
angry face, low-energy slump with drooping shoulders and tired face, consistent
proportions and shading with reference, transparent background, no text
```

## Task 6 - Panel portrait + scene icons
Portrait:
```
same character as reference sheet, bust portrait crop head and shoulders, slightly
richer soft gradient volume, same outlines, gentle smile, looking at viewer,
transparent background, no text
```
Icons (one image, 8 icons in a grid):
```
set of 8 cozy game icons, storybook style with warm dark-brown thick outlines hex
402A20 and two-tone cel shading: red heart, small gray storm cloud, roasted drumstick,
blue zzz sleep symbol, gray boredom swirl, white chat bubble with three dots, golden
sparkle star, warm question mark, flat warm palette, transparent background, no text
```

## QA checklist (I review every drop against this)
- [ ] Outline is warm dark brown 402A20-ish, variable weight - never pure black
- [ ] Light comes from top-left in EVERY asset (shadows bottom-right)
- [ ] Proportions hold: ~2.7 heads, head ~45%, silhouette readable when downscaled to 96 px
- [ ] Skin reads as S6 A9704F family; shading = one cel shadow + soft gradient, no heavy render
- [ ] Face identity consistent across all tasks (same eyes, brows, hair)
- [ ] Transparent background, no text/watermark fragments
- [ ] Tattoo visible and readable on forearm in Task 3; hidden by jacket sleeve logic in Task 4 is OK
- [ ] Icons: single concept each, readable at 64 px

## Review log
- `task1_v1.png` (2026-07-07, generated with GPT 5.5): **rejected**. Style PASS; failed
  on (1) fake transparency (RGB, no alpha), (2) proportions ~3.5-3.8 heads vs 2.7 spec.
- `task1_v2.png` (2026-07-07, GPT 5.5): style/compactness improved, BUT still RGB
  without alpha (fake transparency). Confirms the general rule: GPT image outputs do not
  carry a real alpha channel - a cutout step is mandatory (ADR 0007), not a prompt fix.

## Production method (paper-doll) - ADR 0007
Scope chosen: full modular paper-doll. Layers are produced by **edit-on-template + mask**,
recolored by code tint. Next steps before any volume:
1. **Clean cut** `task1_v2` (or a re-picked base) with an external tool (rembg / Photopea /
   remove.bg) -> `docs/art/pilot/base_body_clean.png` with TRUE alpha. This becomes the
   registration template; its pixel anchors (feet baseline, head center, hand/chest
   sockets) are then measured and written here.
2. **Prove one layer**: edit the template to add ONE simple garment (e.g. a tee), cut it,
   and composite it over the body in a tiny Phaser preview tool (Codex/Sonnet). If it
   aligns with no seam -> method validated.
3. Only then start slot batches (hair, garments, accessories, tattoos) + tint recolors +
   Haiku/mini manifests + Codex integration.

## Acceptance (closes the pilot gate)
All 6 tasks approved -> layered cut (cleanup) -> composited over the real island scene
next to the reference images with no visible style break -> user gives final OK.
Only then wardrobe/hair/tattoo mass batches start (delegation map, art library sec. 11).
