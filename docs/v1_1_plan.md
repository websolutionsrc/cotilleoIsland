# Cotilleo Island v1.1 - Visual and Life Update

> Status: PLANNED
> First phase: `v01.01.F0` Visual Production Foundation.
> Release target: `v01.01`.

## 1. Release-scoped phases

`v01.01.F0` is the non-player-facing preproduction phase for v1.1. It produces visual
contracts, approved pilots, and tooling. Player-facing integration starts at
`v01.01.F1`.

```text
v01.01.F0: masters + pilots + contracts + tools
v01.01.F1-F7: player-facing implementation + content + release validation
```

The historical `v01.00.F7` distribution phase remains on STANDBY and does not block
any v1.1 phase. Detailed F0 source: `docs/art/v1_1_f0_visual_production_plan.md`.

## 2. v1.1 product outcome

The release is successful when a player can:

1. Create visually distinct modular residents.
2. See them in a readable island with houses and unlocked zones.
3. Move between island, houses, and functional shops.
4. Watch solo and social scenes with expressions and movement.
5. Buy food, clothing, and gifts; equip/use them; see persistent consequences.
6. Inspect relationships and understand romance/partner milestones.
7. Close and reload without losing appearance, inventory, relationships, or progress.

## 3. Delivery rules

Every phase is split into design, construction, and validation:

- `.D`: close the contract and UX; no speculative implementation.
- `.C`: one construction owner per file set.
- `.V`: automated checks plus a real browser playthrough.

Recommended resource pattern:

```text
Fable + Sol: architecture/high reasoning
Opus + Terra: coordination and executable task breakdown
Sonnet or Terra: construction owner
Haiku + Luna: content volume after schemas freeze
Human: taste/product acceptance
```

## 4. Versioning and branches

- F0: `develop/v1.1/f0-visual-production`; tag `v01.01.F0`.
- F1: `develop/v1.1/f1-custom-avatars`; tag `v01.01.F1`.
- F2: `develop/v1.1/f2-island-homes`; tag `v01.01.F2`.
- F3: `develop/v1.1/f3-resident-motion`; tag `v01.01.F3`.
- F4: `develop/v1.1/f4-shops-items`; tag `v01.01.F4`.
- F5: `develop/v1.1/f5-scene-presentation`; tag `v01.01.F5`.
- F6: `develop/v1.1/f6-content-polish`; tag `v01.01.F6`.
- F7: `develop/v1.1/f7-hardening`; phase tag `v01.01.F7`, then final release tag `v01.01`.

Each phase starts from the verified previous milestone. Historical `v01.00.F7` does
not need to close first.

## 5. F1 - Customizable modular residents

### Design

- Convert the F0 character contract into the persisted avatar customization model.
- Persist choices: skin, hair style/color, garments, shoes, accessories, tattoos.
- Keep expressions, poses, and presentation states derived and non-persisted.
- Define editor flow and legacy-avatar migration.

### Construction

- Add the runtime `AvatarComposite` to the live island scene and resident panel.
- Add validated asset catalogs and fallbacks.
- Add `SaveState` migration from the legacy string avatar fields.
- Add editor controls with thumbnails/swatches and a live preview.
- Replace the global Mara sprite with each resident's composition; keep Mara as a preset.
- Generate the panel portrait from the same source layers.

### Content target

- 1 adult body contract, 10 skin tones.
- 6 hairstyles with approved recolors.
- 6 initial garments plus shoes.
- 3 accessories and 2 tattoos.
- Runtime expressions required by currently implemented scenes.

### Validation

- Two residents with different choices are recognizable at 96 px.
- Every valid combination aligns and renders with a fallback.
- Appearance persists after reload.
- Old saves migrate without losing residents.
- Full tests, build, and browser editor playthrough.

### Ownership

- Design: Fable + Sol, high reasoning.
- Coordination: Opus + Terra.
- Construction: one owner, Sonnet or Terra, medium/high reasoning.
- Manifests/content: Haiku + Luna after catalogs freeze.
- Human: editor usability and visual acceptance.

### Allowed

- avatar core/data, avatar compositor/editor UI, save migration, avatar assets/tests.

### Prohibited

- island redesign, shops, relationship rule changes, AI runtime.

## 6. F2 - Island, houses, and navigation

### Design

- Define a data-driven island layout using F0 environment/building contracts.
- Define house selection, zone navigation, locked/unlocked states, and scene markers.
- Keep the island screen-based, not open world.

### Construction

- Add island map scene with residential, food shop, clothing shop, plaza, and workshop.
- Create one house representation per resident.
- Navigate map -> house/resident stage and map -> shop panel.
- Show locked, open, selected, and scene-pending states.
- Update unlock visuals immediately after world state changes.

### Validation

- Every resident house selects the correct resident.
- Locked zones cannot be entered.
- New zone unlocks appear without an application reload.
- Layout works at tablet and narrow widths without covering gameplay.
- Existing resident/scene/shop actions remain reachable.

### Ownership

- Design: Fable + Sol, high reasoning.
- Construction: Sonnet or Terra, medium reasoning.
- Environment asset batches: Codex/image generation plus Haiku/Luna metadata after F0 gate.
- Human: map density and final composition approval.

### Allowed

- island/map UI, zone presentation data, navigation shell, environment/building assets.

### Prohibited

- pathfinding, persisted coordinates, economy redesign, mass scene content.

## 7. F3 - Resident movement and ambient life

### Design

- Define presentation-only actor states: idle, walking, arriving, reacting, staged.
- Define waypoint rules and scene placement for one/two participants.
- Keep movement outside persisted simulation state.

### Construction

- Add `ResidentActor` around `AvatarComposite`.
- Add idle personality variants, walk bob, hop, shake, tilt, settle, and arrival.
- Add simple deterministic waypoints in residential/plaza scenes.
- Add cancellation/cleanup so tweens never stack across scene changes.
- Stage social participants without changing relationship/event rules.

### Validation

- Actors do not cross blocked building areas.
- Eight to ten residents remain performant on target desktop/tablet sizes.
- Social scenes stage the correct participants.
- Reloading or switching residents does not preserve stale visual positions.
- Reduced-motion behavior is defined for accessibility.

### Ownership

- Design: Fable + Sol.
- Technical coordination: Opus + Terra.
- Construction: one UI owner, Sonnet or Terra.
- Human: motion feel approval.

### Allowed

- actor/presentation UI modules, island scene integration, movement tests.

### Prohibited

- background simulation ticks, physics engine, advanced pathfinding, frame animation batches.

## 8. F4 - Shops, clothing, gifts, and objects

### Design

- Reuse the existing wallet/pantry economy.
- Define clothing inventory/equip rules and gift effects.
- Define the functional boundary of each unlocked zone.
- Keep workshop decorative unless a concrete low-cost function is approved.

### Construction

- Move food shopping into the island shop flow.
- Make clothing shop functional using F1 avatar garments.
- Add a small gift catalog and giving flow.
- Persist owned/equipped items with a versioned migration.
- Apply gifts through existing needs/relationship entry points.
- Prevent access to locked shops and unaffordable purchases.

### Content target

- Existing six foods retained and expanded only after playtest.
- Initial clothing catalog based on approved F0/F1 assets.
- Four to six gifts with clear relationship/mood effects.

### Validation

- Purchase writes once and never creates negative currency/stock.
- Equip changes the live avatar and persists.
- Gift affects the intended resident/relationship and records the scene outcome.
- Shop lock state matches unlocked zones.

### Ownership

- Design: Fable + Sol, high reasoning for economy/scope.
- Construction: Sonnet or Terra, medium reasoning.
- Content: Haiku + Luna after schemas freeze.
- Human: catalog tone and value approval.

### Allowed

- item/catalog data, shop UI, avatar inventory/equip state, save migration, tests.

### Prohibited

- dynamic markets, jobs, crafting, monetization, public shop/backend.

## 9. F5 - Scene presentation and relationship readability

### Design

- Apply F0 scene staging to every existing `SceneType`.
- Define Spanish copy matrix by scene, mood, personality, and relationship status.
- Define relationship summary UI and visible romance/partner milestones.
- Define a local, rule-based "while you were away" summary.

### Construction

- Stage one/two actors with correct expressions, icons, bubbles, and movement.
- Add visible consequence/reward feedback.
- Add relationship panel: friendship, tension, romance, status, counterpart.
- Translate remaining player-facing English copy to Spanish.
- Add bounded template variants and fallback coverage.
- Add recent/return summary without runtime AI.

### Validation

- Every current scene type has a complete presentation and fallback.
- Social scenes always display the correct participants.
- Relationship transitions become visible immediately.
- No empty or mixed-language player copy.
- Cooldowns, scoring, and deterministic core behavior remain unchanged.

### Ownership

- Visual/content design: Fable + Sol.
- Coordination: Opus + Terra.
- UI construction: Sonnet or Terra.
- Copy volume: Haiku + Luna.
- Human: tone, humor, romance, and scene quality approval.

### Allowed

- scene/dialogue presentation, relationship read-only UI, icons/expressions, template data.

### Prohibited

- free-form AI, new relationship axes, autonomous state changes, babies.

## 10. F6 - Content production and polish

### Design

- Freeze the v1.1 asset and content target against the approved F0 contracts.
- Define batch sizes and sampling rules before generating volume.

### Construction

- Produce approved character, environment, building, prop, icon, dialogue, clothing,
  food, and gift batches through the F0 pipeline.
- Populate manifests and catalogs through frozen schemas.
- Add bounded Spanish copy variants and remove duplicates/dead content.
- Add only the sound/effect polish already approved by the phase contract.

### Validation

- Every batch passes automated QA, contact-sheet review, runtime preview, and human
  sampling before becoming production content.
- No content item requires a one-off core rule.
- Target resident/asset counts stay within the measured performance budget.

### Ownership

- Volume: Haiku + Luna through frozen schemas.
- Batch tooling/integration: Terra or Sonnet by isolated file set.
- Visual review: Fable; coordination: Opus + Terra.
- Human: sample approval, not mechanical review of every manifest row.

### Prohibited

- New system families, schema redesign, or unapproved mass generation.

## 11. F7 - Save safety, performance, and v1.1 release

### Design

- Freeze the release acceptance scenario.
- Stop feature work before hardening starts.

### Construction

- Add export/import with schema validation.
- Request persistent browser storage where supported.
- Complete migration fixtures through the current schema.
- Pack atlases only if measured sprite count/performance justifies an ADR.
- Update current documentation, CODEMAP, and vault; do not rewrite history.

### Validation

- Full tests and production build.
- Clean-save and migrated-save playthroughs.
- Create -> customize -> move -> scene -> reward -> shop -> equip/gift -> reload.
- Performance test with target resident and asset counts.
- Offline production-preview check where available; `v01.00.F7` iPad deployment remains optional.
- Sol/Opus milestone audit and human acceptance.

### Ownership

- Coordination: Opus + Terra.
- Construction/fixes: Sonnet or Terra by isolated task.
- Volume: Haiku + Luna through frozen schemas.
- Audit: Sol plus the non-owner construction line.
- Human: final v1.1 acceptance.

### Prohibited

- New feature families after hardening begins.

## 12. Explicitly outside v1.1

- Runtime conversational AI or autonomous agents.
- Babies/descendants.
- Multiplayer, accounts, backend, or public sharing.
- Open-world navigation and advanced pathfinding.
- Advanced face-shape/body editor.
- Dynamic economy, jobs, or crafting.
- Generated voices.
- Native App Store wrapper.
- Mandatory Netlify/iPad deployment (`v01.00.F7` remains STANDBY).

## 13. v1.1 final acceptance

`v01.01` may be tagged only when:

- F0 pilots/contracts/tools are complete and frozen;
- F1-F6 player-facing/content milestones are complete;
- F7 validation is green;
- the human accepts the visual identity and core playthrough;
- no deferred `v01.00.F7` action is incorrectly treated as a blocker.
