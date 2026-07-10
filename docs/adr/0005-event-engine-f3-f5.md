# ADR 0005 - F3-F5 engine: Event Engine, relationships, and progression designed together

- **Status:** accepted
- **Date:** 2026-07-07
- **Authorship:** designed by Fable 5 (interactive session); planned construction by
  Sonnet/Codex in subphases. Full design in `docs/engine_design_f3-f5.md`.

## Context
Each previous phase raised the save schema as it went (v1->v2->v3). Before building F3
(Event Engine), F3+F4+F5 were designed together so that the data model is coherent,
migrations are predictable (v4/v5/v6), and F4/F5 do not require rewriting F3.

## Key decisions

1. **Derived-versus-persisted rule**: *derived when it has no memory; persisted when a
   transition depends on history*. This generalizes ADR 0004 and determines every new
   field (`chemistry` is pure; `sceneLog`/`stats`/`status`/`wallet` are persisted).
2. **Ephemeral `SceneIntent`** - recalculated on opening; never saved. No `tone` (it is
   derived from `personalityToTags`) and no `result_options` (the player action is the
   resolution).
3. **`participants: ResidentId[]` from F3** even though F3 uses one participant: the
   persisted `sceneLog` begins with the shape F4 needs (cooldowns per participant set),
   and the engine contract does not change when social scenes arrive.
4. **Hard cooldown** with one exception (urgent hunger >= 90), not a soft score penalty.
   Score = `urgency x typeWeight`; quirk has fixed score 35.
5. **`SaveState` v4 = `sceneLog` (cap 20) + `stats.scenesResolved`**. The counter enters
   immediately because it cannot be reconstructed later and F5 uses it for unlocks.
6. **F4**: `Relationship` persists `{a<b, friendship, tension, romance, status,
   lastInteractionAtMs}`; `status` transitions ONLY through a resolved scene (hysteresis);
   `chemistry` is a non-persisted pure function. No `trust`, no textual history.
7. **F5**: minimum economy (earn by resolving scenes, spend in shop/gifts);
   `wallet + unlockedZoneIds + pantry` in v6; zones are a fixed catalog evaluated on opening.

## Alternatives discarded

| Alternative | Why it was discarded |
|---|---|
| Data-driven rule engine (JSON conditions) | Indirection with no benefit for 5-12 scene types; rules are named, tested TS functions (`needs.ts` pattern) |
| Persist the active scene | State becomes stale after changes to needs/clock; recalculating on opening is idempotent and avoids a migration |
| Single `residentId` in `SceneIntent`/log and migrate in F4 | Avoidable v4->v5 log migration and engine-signature refactor for the cost of a single-element array |
| `trust` as a separate relationship axis | Collinear with `friendship` at <=12 residents; every persisted field is migration debt |
| `status` derived from friendship/romance thresholds | Being a couple is a hysteresis milestone, not bucketing: a derived value would oscillate when values change; it is persisted and transitions only through events |
| Soft repetition penalty in the score | Hard to explain when debugging ("why did this happen?"); hard cooldown is binary, testable, and sufficient |
| Postpone counters/wallet to F5 without `stats` in v4 | `scenesResolved` cannot be reconstructed; one v4 line buys real history from F3 |

## Consequences
- F3 can be built in days (4 subphases, see design section 8); F4/F5 only add detectors,
  fields with defaults, and one signature (`resolveScene` returns `reward` in F5).
- New mandatory guards in F3.2: do not degrade saves with `schemaVersion` higher than the
  current version, and clamp future timestamps (device clock changed).
- `docs/scene_intent_spec.md` is rewritten as the real V1 contract (the previous version
  was aspirational and contradicted ADR 0004).
