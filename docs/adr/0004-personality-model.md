# ADR 0004 - Personality model: sliders as the single source of truth

- **Status:** accepted
- **Date:** 2026-07-07

## Context
A proposal compared Cotilleo Island's personality system (continuous sliders) with
Tomodachi Life's system (16 closed types grouped into 4 families, derived from 4
sliders). The key finding was that the documentation already used loose text tags
(`"traits": ["dramatic", "impatient"]`) in `SceneIntent` examples
(`scene_intent_spec.md`) without a function that derived them from `Personality`'s
numeric sliders - two potentially divergent sources of truth. It also lacked a
kindness/temperament trait, and `romanticism` mixed an individual propensity for romance
with affinity between two specific residents in a single slider.

## Decision
1. The **6 `Personality` sliders** (`energy`, `sociability`, `patience`, `weirdness`,
   `romanticism`, `kindness` - `kindness` had already been added in Phase 1.1) are **the
   single source of truth** for a resident's personality. They are stored in `SaveState`
   and directly edited in the edit panel; nothing else is persisted.
2. **Tags, category, and expression are pure deterministic projections** of those
   sliders, implemented in `src/core/personality-derived.ts` (pure TS, no Phaser):
   - `personalityToTags(p)`: up to 3 tags using fixed thresholds (high >= 70, low <= 30),
     ordered by distance from 50, with ties resolved by the fixed `PERSONALITY_KEYS` order.
   - `personalityCategory(p)`: 1 of 5 broad families (`Balanced`, `Sociable`,
     `Reserved`, `Affectionate`, `Eccentric`) that provide quick visual identity (a color
     accent) without reducing the system to Tomodachi's 16 fixed types. A profile without
     extreme traits (all approximately 50) is `Balanced`; otherwise, the family with the
     highest comparable 0-200 score wins.
   - `personalityExpression(p)`: a minimal pose/idle hint for rendering.
   None of these three is persisted or edited separately; they are always recalculated
   from the saved sliders.
3. **Romance remains split into two distinct concepts**: `romanticism` (individual,
   a normal persisted `Personality` slider) and `chemistry` **per couple** (affinity
   between two specific residents plus relationship state). `chemistry` will be
   implemented in **Phase 4** (Relationships) as a pure function over both personalities
   and the relationship, never as an editable field or independent datum.

## Reasons
- Prevents two divergent sources of truth (numeric sliders versus text tags manually
  written for each scene), the specific problem that triggered this review.
- Retains continuous sliders as the basis (more expressive and easier to tune than 16
  closed types), with a lightweight category layer only for quick visual identity.
- Deterministic and testable: the same sliders always produce the same
  tags/category/expression; no hidden state or Phaser dependency.
- Adds no save-surface area: zero new migrations and zero new editable fields.

## Consequences
- `src/core/personality-derived.ts` is the only permitted way to obtain
  tags/category/expression; loose text tags must not reappear elsewhere (Phase 3 dialogue
  templates, UI, and so on).
- `docs/scene_intent_spec.md` (the `tone` field) must be fed by these functions when
  Phase 3 connects `SceneIntent` to real data, not by handwritten text.
- `chemistry` (Phase 4) is out of scope for this task; it is documented as a plan in
  `docs/data_model.md` (Relationship section) and remains pending in `CODEMAP.md`.
- At the time of this ADR, `SaveState`'s `CURRENT_SCHEMA_VERSION` did not change (it
  remained at 2): this ADR added and removed no persisted fields. F2.3 later raises the
  schema to v3 because needs become persisted.
