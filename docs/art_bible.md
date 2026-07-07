# Art Bible - Cotilleo Island (F2.6)

> Status: v1 approved direction ("Storybook with volume", Direction B - see ADR 0006).
> Author: Fable 5 (interactive session), with the user as taste gate at every checkpoint.
> Scope: visual design only. This document changes no gameplay, no SaveSystem, no core.
> References: 4 style images provided by the user, to be stored in `docs/art/references/`
> (drop the PNGs there manually; this bible cites them as the style anchor).

## 1. Style pillars

1. **Chibi, cozy, readable**: big heads, huge glossy eyes, chunky silhouettes that read
   at 96 px. Charm over detail; detail only where the eye lands (face, hair, chest).
2. **Storybook line + volume** ("un poco 3D"): expressive outlines PLUS a soft gradient
   pass so characters feel rounded, not flat. Not a full 3D prerender; not flat vector.
3. **Original identity**: distinct proportions, eye style and palette from any Nintendo /
   Tomodachi / Mii look. No flat dot-eyes, no Mii face geometry, no derivative UI.
4. **Warm island light**: everything sits in one world - golden-warm key light,
   terracotta/green environment palette, residents always pop over backgrounds.
5. **Modular first**: every character is layers. Nothing is painted "fused" that the
   wardrobe system needs to swap.

## 2. Character construction

- **Proportions**: total height 2.7 heads. Head is ~45% of total height, slightly wider
  than tall (1.05:1). Body 1.55 heads; arms reach mid-thigh; mitten hands with thumb;
  rounded forward-facing feet.
- **Line**: variable-weight outline, warm dark brown `#402A20` (never pure black).
  Outer contour 3 px at 128 px base size; inner lines 1.5-2 px. For skin tones 8-10
  (dark), lighten line to `#5A3A2C` on skin edges to keep contrast.
- **Shading recipe** (the "volume" of Direction B):
  1. Flat base color per region.
  2. One cel shadow tone (base multiplied by warm brown `#6B4A38` at 25%), hard edge,
     light source fixed top-left ~30 degrees for ALL assets.
  3. One soft vertical gradient pass (screen, warm cream `#FFE9C7` at 12%) on head and
     torso to round the forms.
  4. Specular: small gloss on hair (1-2 shapes) and double highlight in eyes.
- **Eyes**: large ovals, dark warm iris ring, big pupil, two white highlights (large
  upper-left, small lower-right). Eye colors: brown `#5C3A26`, hazel `#8A6134`, green
  `#5E7D46`, blue `#4A6E93`, amber `#B07830`; fun tier: violet `#7B5AA6`.
- **Readability check**: every design must be identifiable by silhouette alone at 96 px
  (hair + outfit outer shape carry the identity).

## 3. Modular avatar system (layer stack)

Z-order, bottom to top:

```
1 body-base (skin tone)          6 upper garment
2 tattoo overlay                 7 outer layer (jacket/coat)
3 face expression (eyes+brows    8 shoes
   +mouth as ONE swap sprite)    9 hair-back
4 blush/freckles (optional)     10 hair-front
5 lower garment                 11 headwear
                                12 accessories (glasses, earrings, held prop)
```

- **Anchors**: head pivot (for expression/hair/headwear), two hand sockets (held props),
  chest anchor (badges). Fixed pixel coordinates on the 128 px base body; documented in
  the pilot's template file.
- **Skin-reveal metadata**: each garment declares which skin regions stay visible
  (`arms`, `neck`, `legs`). Tattoos render only on visible regions - this is what makes
  a large tattoo/wardrobe catalog possible without repainting bodies.
- **Palette-swap triplets**: garments and hair define `base / shade / highlight` colors
  so recolors are data, not new art. One garment drawing yields N color variants.
- **One body in V1**: single adult body shape (height/build variation deferred; the
  layer stack does not block adding bodies later, each new body = new anchor sheet).

## 4. Skin, hair and inclusivity

**Skin ramp - 10 realistic tones** (Monk-scale inspired; base hex, shadow/highlight
derived by the recipe in section 2 so all skins shade identically):

```
S1 #F7EDE4   S2 #F3E1D0   S3 #EACDB6   S4 #DDB08D   S5 #C68F6A
S6 #A9704F   S7 #8D5A3B   S8 #70452C   S9 #543223   S10 #3A241A
```

Rule: the skin picker always shows all 10, in ramp order, no default preselected tone.

**Hair - natural set**: black `#241B18`, dark brown `#3E2A1E`, brown `#5C3D26`,
chestnut `#7B4B2A`, blonde `#C89B5A`, platinum `#E4D3AC`, red `#A8432A`, auburn
`#7E3524`, gray `#9A938C`, white `#E8E4DC`. **Fun set**: pastel pink `#E8A7B8`,
lavender `#B79CD8` (ref image 4), mint `#9CCFB4`, sky `#8FB8D8`. Hairstyles are
line-consistent with section 2; every style needs back+front layers.

## 5. Facial expressions (14 states + 1 optional)

Expression = ONE sprite swap (eyes + brows + mouth together). All faces are generated
in a single sheet per character template (marginal cost of extra faces is near zero);
runtime wiring is progressive - each face activates when its trigger exists. Grammar:

| state | eyes | brows | mouth | extra |
|---|---|---|---|---|
| neutral | open, relaxed | flat | small closed smile | - |
| happy | arched-closed or sparkling | raised | open smile | blush up |
| hungry | fixed on nothing | inner-up | wavy half-open | tiny drool drop |
| sad | glossy, lower-lid water | inner-up strong | downturned | - |
| tired | half-closed lids | flat low | flat small | faint eye bags |
| bored | lidded, looking aside | one raised | slight frown | small sigh puff |
| lonely | big, looking down | soft inner-up | tiny closed | cooler blush tone |
| surprised | round, wide | high | small "o" | - |
| quirky | asymmetric (one wide, one squint) | asymmetric | tilted grin | sparkle near head |
| angry | narrowed, flat top lid | steep inner-down | gritted frown | small vein mark / steam puff |
| scared | wide, shrunk pupils | high inner-up | open wavy | sweat drop, cool tint on forehead |
| anxious | side-glancing, small pupils | asymmetric inner-up | tight wavy | sweat drop + tick lines |
| embarrassed | pressed closed or averted down | soft inner-up | small wobbly | heavy blush stripes, steam puff |
| vigorous | sparkling, star highlight | determined down-out | big open grin | spark burst near head |
| love (optional) | heart-shaped highlights | raised soft | soft smile | floating heart particle |

**Reachability map** (every face must have a real trigger; no dead art). Runtime
mapping is a pure projection `SceneIntent + needs + personality + resolution outcome
-> avatarExpression` (extends `personalityExpression`, ADR 0004; never persisted):

- `angry`: F4 `argument` participants; negative food/resolution reactions when
  patience is low or kindness is very low.
- `anxious`: any need in the URGENT band (>= 90) - replaces the need's own face
  (pairs with the F3 urgent-hunger cooldown exception).
- `embarrassed`: F4 `flirt`/`confess`; compliments received by reserved personalities.
- `vigorous`: idle when energy >= 80 and mood >= 70; positive resolutions for
  energetic personalities.
- `scared`: RESERVED - generated in the sheet now, wired when frightening events
  exist (F5+ weather/pranks).
- `love` (optional in batch): F4 `dating`/`partners` idle and romance resolutions.
- Remaining 9: as in F3 design (need scenes, quirk, reactions, defaults).

## 6. Render targets and export rules

| target | size (base) | notes |
|---|---|---|
| world sprite | 128 px tall (export @2x = 256) | full body, layer-composited |
| panel portrait | 512 px (bust crop) | same line rules, richer gradient allowed |
| emotion/scene icons | 64 px (export @2x = 128) | thick line, single concept each |

- Format: PNG with transparency. Naming: `body_s{1-10}.png`,
  `face_{state}.png`, `hair_{id}_{back|front}_{color}.png`, `garment_{slot}_{id}.png`,
  `tattoo_{id}.png`, `icon_{name}.png`.
- **V1 animation is tween-based, not frame-based**: idle breathe (scale y 2%), walk bob
  (y offset + slight tilt), reaction hop / shake via Phaser tweens on static composites.
  Frame animation (real walk cycles) is deferred - this keeps the V1 asset bill small.

## 7. Minimum V1 asset list (CODEMAP F2.6 requirement)

1 body template (10 skin recolors) - 14 expression sprites (+1 optional `love`) -
6 hairstyles (back+front,
natural colors via triplets) - 6 garments (2 tops, 2 bottoms, 1 dress, 1 jacket) with
skin-reveal metadata - 3 accessories (glasses ref image 3, earrings, held drink) -
2 tattoos (forearm, neck) - panel portrait template - 8 scene icons:
`heart` (positive), `storm` (negative), `drumstick` (hungry), `zzz` (tired),
`swirl` (bored), `chat-dots` (lonely), `sparkle` (quirk), `question` (generic).
Poses: idle, positive reaction, negative reaction, need-state slump (all static + tween).

Icons map 1:1 to F3 `SceneType` - the bubble language the reference images already show.

## 8. Environments

- Ground/plaza: terracotta `#C4714B` range with cobble pattern (ref image 1); grass
  `#7FA65A` range. Background elements: -20% saturation, +10% lightness, thinner lines
  (1.5 px) so residents always pop in front.
- Depth in 3 values: background (lightest, desaturated), midground, foreground props.
- Houses/props: rounded storybook shapes, same line language, no straight hard corners.
- Never place high-contrast pattern behind a resident's head zone.

## 9. Scene language (direct input for F3.4)

- **Bubble**: white fill, `#402A20` outline 3 px, rounded, short tail to speaker's head,
  one icon or short text inside. Replaces the ad-hoc F2 hunger bubble.
- Scene presentation: resident plays its need pose + expression, bubble shows the scene
  icon; tapping opens the resolution panel (existing food flow for `hungry`, single
  action button otherwise, per `engine_design_f3-f5.md` 2.5).
- Panel portrait reacts with expression swap on resolution (positive -> happy, etc).

## 10. Production pipeline and libraries decision

- **No new runtime library is needed yet** (explicit F2.6 decision): Phaser 3 already
  loads individual PNGs and native texture atlases. The pilot uses individual PNGs;
  when the catalog exceeds ~50 sprites, pack atlases with a free packer and revisit -
  any repo dependency at that point requires an ADR first.
- Generation flow per asset batch:
  1. Prompt an image model with the templates below (+ the reference sheet).
  2. Human taste gate (the user approves/rejects per batch).
  3. Cleanup/normalize (external tool, e.g. Aseprite/Krita - not repo dependencies).
  4. Export per section 6 naming -> `public/art/...` -> integration task for
     Sonnet/Codex.
- **Consistency rule**: every character batch includes the SAME template body sheet as
  image reference; garments are generated ON the template body, then cut to layers.

### Prompt templates (image models)

Base character sheet:
```
cute chibi islander character sheet, 2.7 heads tall, big glossy eyes with double
highlight, storybook style, warm dark-brown variable-weight outlines, two-tone cel
shading plus soft gradient volume, warm golden light from top-left, [skin tone hex],
[hair style/color], neutral expression, front view, arms slightly apart, transparent
background, no text
```
Garment on template:
```
same character template, wearing [garment description], colors [base/shade/highlight],
storybook outline and cel shading identical to reference sheet, front view, transparent
background
```
Expression sheet:
```
same character face close-up, 15 expressions grid: neutral, happy, hungry with drool
drop, sad, tired half-lidded, bored looking aside, lonely looking down, surprised,
quirky asymmetric, angry gritted with steam puff, scared wide-eyed with sweat drop,
anxious side-glancing with tick lines, embarrassed heavy blush with steam, vigorous
sparkling determined grin, in-love heart-eyes, consistent line and shading with
reference
```

## 11. Delegation map (who does what)

| work | owner |
|---|---|
| this bible, direction reviews, new visual systems | Fable (design only) |
| sprite/portrait/icon generation per templates | image model (user-driven), user = taste gate |
| catalog metadata JSON (names, rarity, tags, skin-reveal flags) | Haiku / GPT mini |
| layer compositing code, loading, tweens, F3.4 scene UI | Sonnet / Codex |
| batch approval at every checkpoint | user (always in the loop) |

## 12. Hard limits (unchanged product rules)

No 3D engine or migration - no advanced face editor (face identity in V1 = skin tone +
eye color + hairstyle + expressions; face-shape sliders deferred) - no babies - no open
world - no public shop - no free-form conversational AI - keep clear IP distance from
Nintendo/Mii aesthetics (proportions, eyes and UI are original per this bible).

## 13. Pilot acceptance (checkpoint 3, before mass production)

One resident fully assembled from layers: 10-skin body template, 6 hairstyles x 1
color each, 14 expressions (+1 optional `love`), 2 garments + 1 accessory + 1 tattoo,
panel portrait, the 8
scene icons - composited in the real island scene (Phaser) next to the reference
images without visible style break, readable at 96 px, approved by the user. Only then
mass production batches start (wardrobe, tattoos, hairstyles, colors).
