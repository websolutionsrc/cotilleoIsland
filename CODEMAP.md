# CODEMAP — Cotilleo Island

Mapa de módulos previstos. Se rellena a medida que se implementan (Fase 1: sistema de residentes).

## Metodología Git por fases
- Trabajar cada fase en una rama dedicada con patrón `develop/fN-nombre-corto`
  (ej. `develop/f2-needs-food-loop`).
- Al cerrar una fase, hacer un commit de hito y crear un tag `v01.00.FN` sobre el commit
  verificado (ej. `v01.00.F1` marca el cierre de Fase 1). Reservar `v01.00` para el
  cierre completo de V1; no usar tags con slash para hitos de fase.
- Antes de empezar la siguiente fase, pasar pre-flight: `CODEMAP.md`/docs alineados,
  tests y build en verde, y dossier del vault actualizado con `[DONE]`/`[TODO]`.
- Mantener el scope de la rama centrado en la fase; no mezclar features futuras salvo
  ajustes pequeños necesarios para cerrar el hito actual.
- Al cerrar cualquier subfase, documentar el estado también en la memoria/vault
  (`40-Proyectos/CotilleoIsland/CotilleoIsland.md`): qué quedó `[DONE]`, qué sigue
  `[TODO]`, tests/build y siguiente modelo recomendado. No basta con actualizar solo
  `CODEMAP.md` o docs técnicas del repo.
- Trazabilidad de modelos en cada commit: ver "Trazabilidad de modelos en commits" en
  `AGENTS.md` (trailer `Co-Authored-By` = modelo orquestador actual; cuerpo del commit
  nombra el modelo constructor si fue un subagente distinto).
- Operational language from v01.00.F3 onward: English + ASCII-safe text for logs, handoffs,
  model traces, commit bodies, validation summaries, implementation summaries and new
  technical docs.
- New F3.1-F3.3 tests, comments and docs should be written in English. Do not mass-translate
  unrelated historical Spanish text; only update nearby text when it is already being touched.

## Módulos (arquitectura objetivo)
| Módulo | Carpeta | Responsabilidad | Estado |
|---|---|---|---|
| **Core** | `src/core/` | Tipos base: `Resident`, `Personality`, `Needs`, `Avatar`, ids tipados (`ResidentId`); proyecciones puras de personalidad (`personality-derived.ts`); lógica pura de necesidades (`needs.ts`) | **Fase 2.1: core de necesidades implementado** (sin UI ni persistencia de F2 aún) |
| **Residents** | `src/residents/` | `createResident`/`updateResident` (defaults + validación pura de nombre y personalidad) | **Fase 1: implementado** (sin inventario/nivel aún) |
| **Relationships** | `src/relationships/` | `types/key/chemistry/status/decay/apply` — core puro: par normalizado `a<b`, `chemistry` (proyección pura), máquina de estados con guardas, decaimiento, `applyRelationshipAction` (deltas+status en un punto) | **F4.1 done** (27 tests); F4.2 (persistencia)/F4.3 (escenas sociales)/F4.4 (UI) pendientes — diseño cerrado en `engine_design_f3-f5.md` §3 |
| **Events** | `src/events/` | `types/rng/detectors/cooldowns/select/resolve` — pipeline puro detect→cooldown→score→select, `SceneIntent` efímera, `sceneLog` cap 20 | **F3.1-F3.3 implemented; F3.4 UI pending** |
| **Dialogue** | `src/dialogue/` | V1: plantillas (`food-reactions.ts` ahora; `scene-texts.ts` en F3.3); V2: IA (`DialogueGenerator`) | **F3.3 scene text templates implemented** |
| **AI** (opcional) | `src/ai/` | DialogueEnhancer, DailyNarrator, MemorySummarizer, CatchphraseGenerator, EventSuggestor validado | pendiente |
| **Save** | `src/save/` | `StoragePort` (`IndexedDbStorage` / `InMemoryStorage`) + `SaveSystem` (CRUD de residentes, `SaveState` versionado, migración, decaimiento de necesidades al cargar, escenas activas F3) | **F3.2 internal scene persistence implemented** |
| **UI** | `src/ui/` | `IslandScene` (Phaser, placeholder de residente "en su casa") + `resident-panel` (overlay DOM: crear/editar nombre, personalidad, dar comida y mostrar reacción) | **Fase 2.5: vertical de hambre/comida implementado** |
| **Data** | `src/data/` | Catálogo de comidas (`foods.json`) + validación/exports (`foods.ts`), quirks (`quirks.ts`); después residentes mock, eventos y plantillas | **F3.3 quirks implemented** |
| **Visual direction** | `docs/art_library.md` + `docs/art/references/` + future `public/art/` | 2D art library: characters, outfits, environments, scene language, asset export rules and delegation guidelines so other models can produce visual work without touching the core | **F2.6 art library DONE (ADR 0006, Direction B "Storybook with volume"); pilot asset pass pending before mass batches** |

## Fase 4 - Relationships (F4.1 done; F4.2-F4.4 pending)
Design in `docs/engine_design_f3-f5.md` section 3. Branch `develop/f4-relationships`
(from `v01.00.F3`). Subfases (mirroring F3's pattern):

| Subfase | Content | Status |
|---|---|---|
| F4.1 | Pure core: types, key normalization, chemistry, status machine, decay, applyRelationshipAction | **DONE** |
| F4.2 | SaveState v5 (`relationships[]`) + migration v4->v5 + SaveSystem wiring | **DONE** |
| F4.3 | Social scene types (meet/chat/argument/reconcile/flirt/confess/propose) + detectors + scene texts + resolution effects on both participants | **DONE** |
| F4.4 | UI - scope open, see note below | pending |

- `src/relationships/types.ts`: `Relationship` (persisted fields: a/b ordered pair,
  friendship/tension/romance, status, lastInteractionAtMs), `RelationshipStatus` union.
- `src/relationships/key.ts`: `orderedPair`, `makeDefaultRelationship` (strangers,
  never persisted until a real interaction happens), `findRelationship`/
  `getRelationship` (default-on-miss), `upsertRelationship` (pure).
- `src/relationships/chemistry.ts`: `chemistry(a, b, relationship)` - pure projection
  (romanticism average + weirdness/sociability compatibility + kindness average, minus
  a tension penalty), never persisted, per engine_design_f3-f5.md section 0/3.3.
- `src/relationships/status.ts`: `nextRelationshipStatus` - explicit state machine,
  status only changes via a resolved action (meet/chat/argument/reconcile/confess/
  propose; flirt never changes status, only nudges romance). Implementation decision
  not fully pinned by the design doc: `reconcile` always lands on friends/besties by
  current friendship, regardless of whether the fight came from a friend or a couple
  (romance/friendship values are preserved, so a quick re-confess is possible).
- `src/relationships/decay.ts`: `decayRelationship` - friendship decays 1/day after a
  3-day grace period; tension decays 2/day with no grace; romance/status never decay
  passively (only change via resolved actions).
- `src/relationships/apply.ts`: `applyRelationshipAction` - single entry point used by
  F4.3's scene resolver: applies the fixed delta table, recomputes chemistry with the
  post-delta values, and resolves the status transition guards against those values.
- Tests (`tests/relationships.test.ts`, 27): key normalization, chemistry formula
  behavior (romance/compatibility/tension direction and clamping), every status
  transition and its guards, decay grace period and clamping, and
  `applyRelationshipAction` end-to-end (including a confess crossing its guard exactly
  at the threshold, and an argument on a couple that does not erase romance).

## Fase 4.2 - persistence
- `SaveState` schema bumped to **5**: adds `relationships: Relationship[]`. Migration
  v4->v5 seeds `[]` for old saves (a missing relationship already means "strangers" -
  nothing real to reconstruct for pairs that never interacted). `removeResident` now
  also drops any relationship involving the removed id (same pattern as `sceneLog`).
- `SaveSystem.applyNeedsDecay` **renamed to `applyWorldDecay`** (clean rename, no
  back-compat shim - all call sites are internal): now decays both needs AND
  relationships from the same shared world-tick (`needsUpdatedAtMs`). Updated
  `main.ts` and `tests/save-system.test.ts` accordingly.
- `SaveSystem.getRelationshipBetween(x, y)`: read-only, default-on-miss.
- `SaveSystem.resolveRelationshipAction(aId, bId, action, nowMs)`: single entry point
  that loads both residents, calls `applyRelationshipAction`, and persists in one
  write. Decoupled from the `SceneIntent`/`resolveScene` pipeline for now - F4.3 will
  wire it in once social `sceneType`s exist; usable standalone in the meantime (used
  by tests and by manual/preview validation).
- Design refinement during implementation (not fully pinned by the original doc):
  `decayRelationship`'s grace period had to become a **boolean gate on absolute time
  since `lastInteractionAtMs`** (via a `nowMs` parameter), not a subtraction of grace
  days from the incremental `elapsedMs` tick - otherwise repeated small decay ticks
  (the realistic calling pattern, once per app open) would never accumulate the
  "3 days of silence" the design intended. Tick-boundary approximation documented in
  `src/relationships/decay.ts` (same coarseness `decayNeeds` already accepts).
- Tests: 1 new in `tests/relationships.test.ts` (idempotent successive ticks) + 1 new
  in `tests/save-system.test.ts` (`applyWorldDecay` decays a seeded relationship).
  113 tests total, project-wide.
- Validated end-to-end in the browser preview against the real `SaveSystem`
  (IndexedDB): default relationship is "strangers", `resolveRelationshipAction(...,
  "meet", ...)` promotes to "acquaintances" with friendship=5 and a real
  `lastInteractionAtMs`, `schemaVersion` reads back as 5. Zero console errors.

## Fase 4.3 - social scenes
Wired the 7 social sceneTypes into the generic Event Engine. The pipeline
(detect->cooldown->score->select->resolve) is reused unchanged; only the taxonomy and
a few functions grew.

- `src/events/types.ts`: `SceneType` split into `SoloSceneType | SocialSceneType`
  (explicit union, not a computed `Exclude`) so `resolve.ts`'s exhaustive
  `Record<..., ActionKind>` doesn't silently need every new social type. New
  `SceneCause` variant `{ kind: "social" }`. `isSocialSceneType` type guard exported
  as the single source of truth other modules narrow against.
- `src/events/detectors.ts`: new `detectSocialSceneCandidates(a, b, relationship,
  nowMs)` - pure, no RNG (unlike quirks, all social triggers are threshold-based).
  Detection thresholds are implementation decisions (design doc only fixed
  argument>=60 and flirt>=60): `chat` avg social_need>=55, `reconcile` avg
  kindness>=50, `meet`/`reconcile`/`confess`/`propose` use fixed urgency. **confess/
  propose reuse the exact same threshold constants as the status-machine transition
  guard** (`status.ts`) - if a scene is offered, resolving it is guaranteed to cross
  the guard, since `applyRelationshipAction`'s deltas only add before re-checking.
- `src/events/cooldowns.ts`: cooldown matching upgraded from "same participants[0]"
  to "same participant SET" (order-independent) so a 2-participant cooldown entry
  correctly blocks re-triggering that specific pair.
- `src/events/select.ts`: `selectScenes` rewritten so a multi-participant candidate
  competes for EVERY one of its participants' slots and is only selected if it wins
  ALL of them - otherwise dropped entirely (a resident can't "meet" someone while
  busy with a more urgent personal need). New score weights for social types
  (implementation decision, undocumented in the design doc beyond the two fixed
  thresholds): argument 0.85 (surfaces like a real conflict), chat/reconcile
  0.65-0.7, confess/propose 0.6, flirt/meet 0.5 (flavor, never outranks a real need).
- `src/events/resolve-social.ts` (new): `relationshipActionForScene` (explicit 1:1
  map, not a cast, so TS catches drift) and `resolveSocialSceneNeeds` (symmetric
  needs delta on BOTH participants, separate from the relationship-side effect).
- `src/dialogue/scene-texts.ts`: `sceneTextFor` gained an optional `counterpart`
  parameter; social scenes use `(name, name) -> string` generators instead of the
  static per-type table solo scenes use (two dynamic names don't fit a plain
  string constant). Falls back to "someone" if the counterpart is missing rather
  than throwing (invariant #9: text render is always total).
- `src/save/save-state.ts`: the `sceneLog` entry validator's known-scene-types list
  now includes the 7 social types (was a real bug risk: without this, a resolved
  social scene's log entry would silently fail validation and vanish on the very
  next load).
- `src/save/save-system.ts`: `computeActiveScenes` now also generates candidates for
  every unique resident PAIR (not just per-resident), looking up each pair's
  relationship (default "strangers" if absent). `resolveScene`'s `action` parameter
  became optional: social scenes ignore it (they resolve deterministically via the
  sceneType->RelationshipAction mapping, no player sub-choice) and update both
  residents + the relationship in the same single write (invariant #5); solo scenes
  now throw a clear error if resolved without an action (previously implicitly
  required by the type system, now enforced at runtime too since the type is optional).
- UI minimal type-safety fixes (not real F4.4 work): `island-scene.ts`'s
  `SCENE_ICONS` and `resident-panel.ts`'s action switch needed entries/a default
  case for the new `SceneType` members to keep compiling; social scenes currently
  render a placeholder label and a disabled resolve button in the generic panel -
  F4.4 will give them a real flow.
- Tests: `tests/social-scenes.test.ts` (new, 16 tests: every detector trigger/guard,
  the relationshipAction mapping, symmetric needs effect, cooldown set-matching, and
  the select.ts multi-participant consistency filter - including the critical case
  where a social scene must be dropped entirely because one participant has a
  better personal scene). +3 in `tests/save-system.test.ts` (pairwise
  `computeActiveScenes`, full social `resolveScene` end-to-end, error paths). +3 in
  `tests/scene-texts.test.ts` (social text mentions both names, generic fallback,
  distinct text per social type). **136 tests total, project-wide.**
- Validated end-to-end in the browser preview against the real SaveSystem/IndexedDB
  running the FULL pipeline (not just `resolveRelationshipAction` directly, as in
  F4.2's check): `computeActiveScenes` correctly detected "meet" for two fresh
  strangers, `resolveScene` updated both residents' mood (70->73) and the
  relationship (strangers->acquaintances, friendship=5) in one write. Zero console
  errors.

### F4.4 scope decision (resolved 2026-07-08)
The game currently only ever shows/edits a single resident (`main.ts` uses
`residents[0]`). Decision: F4.4 adds a **minimal** create-resident + select-resident
UI (a button + a simple switcher), not a full resident-management screen. This is the
smallest addition that lets F4's social scenes actually trigger and be observed live
in the preview, rather than only through seeded `SaveSystem` calls.

## Fase 1.2 — personalidad: sliders → tags/categoría/expresión
- `src/core/personality-derived.ts`: proyecciones puras y deterministas de los 6 sliders
  de `Personality` (única fuente de verdad; nada de esto se persiste ni se edita aparte):
  `personalityToTags` (hasta 3 tags por umbrales fijos: alto ≥ 70, bajo ≤ 30, ordenadas por
  extremidad), `personalityCategory` (1 de 5 familias: `Equilibrada`/`Sociable`/
  `Reservada`/`Cariñosa`/`Excéntrica`; perfiles sin rasgos extremos caen en `Equilibrada`,
  y el resto por score comparable 0–200) y `personalityExpression` (hint de pose/idle).
  Reexportado desde el barrel `src/core/index.ts`.
- `src/ui/island-scene.ts` consume las tres: muestra categoría + tags junto al resumen de
  personalidad y tiñe el nombre/el trazo de la "casa" placeholder según expresión/categoría
  (recalculado en cada `renderResident`, nunca leído de un dato guardado aparte).
- `docs/adr/0004-personality-model.md`: ADR que fija el modelo. La personalidad derivada
  no cambió el esquema de guardado; el schema actual sube a v3 en F2.3 por necesidades.
- `chemistry` (afinidad romántica por pareja) documentado como plan en `data_model.md`,
  pendiente de **Fase 4** (`src/relationships/`); no implementado en esta fase.

## Fase 3 — Event Engine (F3.1-F3.3 implemented; F3.4 pending)
Diseño completo en `docs/engine_design_f3-f5.md` (F3+F4+F5 diseñadas juntas para
estabilizar el modelo de datos; plan de schema v4/v5/v6). Subfases previstas:
- **[DONE] F3.1** `src/events/{types,rng,detectors,cooldowns,select}.ts` — pure core,
  no save/UI.
- **[DONE] F3.2** Internal `SaveState` schema 4 (`sceneLog` + `stats`) + migration +
  no-downgrade guard + future timestamp clamp + `computeActiveScenes`/`resolveScene`.
- **[DONE] F3.3** `src/data/quirks.ts` + `src/dialogue/scene-texts.ts` + pure
  resolution effects.
- **[TODO] F3.4** UI: burbuja genérica de escena (sustituye la ad-hoc de hambre de F2.4), panel
  con acción de resolución, pipeline en `main.ts`. Tag `v01.00.F3` al cerrar en verde.

## F2.6 — 2D Visual Direction for Fable (art library DONE; pilot pending)

**Status 2026-07-07**: `docs/art_library.md` written by Fable 5 (Direction B "Storybook
with volume", chosen by the user from 3 proposals over the reference images; ADR 0006).
Expression set extended on user request from the 9-face minimum to 14 (+1 optional
`love`): adds angry, scared (reserved), anxious, embarrassed, vigorous - each with a
reachability trigger documented in the art library (no dead art).
Libraries decision: no new runtime library yet (plain PNGs; atlas + ADR past ~50
sprites). Next gate: pilot asset pass (art library section 13, kit in
`docs/art/pilot_character.md`) with user approval, then mass batches (image model +
Haiku/mini metadata + Codex integration). Reference images live in
`docs/art/references/`. Original brief below.
This subphase is **visual design only** and must be done by Fable before building F3.4
or F5. The current product decision is to keep V1 in **2D Phaser**, not migrate to 3D,
and raise the visual quality through a strong direction for characters, outfits,
environments and scene composition.

Fable owns the hard design work: define an actionable art library, decide asset libraries
or formats if needed, and write precise instructions so other models can produce sprites,
placeholders, image prompts, simple animations or integration tasks. Fable must not
implement gameplay or touch `SaveSystem`, EventEngine, IndexedDB or pure simulation logic.

Minimum scope for F2.6:
- **Characters**: 2D chibi/cozy style, large heads, expressive eyes, readable silhouettes
  at small sizes, original identity, no derivative IP look. Define proportions, line
  weight, shadows, palette, export sizes and personality-based variants.
- **Modular avatar system**: hair, skin, face, outfit, accessories, expression and
  reaction states. Prefer a small coherent set over an advanced face editor.
- **Facial expressions**: define a minimum face set for emotion/state rendering:
  `neutral`, `happy`, `hungry`, `sad`, `tired`, `bored`, `lonely`, `surprised`,
  `quirky`. Fable should define the visual grammar; implementation should later map
  `SceneIntent + needs + personality -> avatarExpression` as a pure projection, with
  no persisted derived expression state.
- **Outfits**: visual readability rules, rarity levels, accessories and how outfits relate
  to personality/category without persisting unnecessary derived state.
- **Environments**: island, houses, interiors and future zones composed clearly for iPad,
  PWA and Phaser 2D. Avoid heavy assets or backgrounds that make residents hard to read.
- **Scenes**: visual language for `SceneIntent`: bubbles, poses, expressions, icons,
  reactions and micro-scene composition; prepare the replacement of the ad-hoc F2 hunger
  bubble with the generic F3.4 scene UI.
- **Libraries/production pipeline**: propose spritesheets, texture atlases,
  Aseprite/TexturePacker, image generation or a manual pipeline. Any new dependency needs
  an ADR before entering the repo.
- **Delegation**: separate what Fable designs, what can be delegated to image/asset models,
  and what Sonnet/Codex should later integrate technically.

F2.6 acceptance criteria:
- Visual design document in `docs/` and summary in the vault.
- Explicit decision on libraries/formats, or confirmation that no new library is needed yet.
- Minimum V1 asset list: idle, basic walk, positive reaction, negative reaction,
  hunger/need state, panel portrait, island avatar and emotion/icons.
- Clear impact on F3.4 and F5: what changes in UI, scene presentation and island/progress.
- Clear limits: no 3D, no babies, no advanced face editor, no open world, no public shop
  and no free-form conversational AI.
- Recommended model: **Fable**, reasoning **high**, no subagents except for isolated visual
  variants after the art library is closed.

## Fase 2.1 — necesidades: core puro
- `src/core/needs.ts`: mantiene `Needs` y `DEFAULT_NEEDS` y añade helpers puros para
  normalizar/clamp 0-100, evolucionar necesidades por tiempo (`decayNeeds`), aplicar
  efectos de comida (`applyFoodEffect`) y derivar estado (`needsToStatus`) sin persistirlo.
- `FoodEffect` es un contrato de core para F2.2 (datos de comida), pero F2.1 no añade
  `src/data/*.json` ni catálogo de comidas.
- No toca `SaveSystem`, IndexedDB, UI Phaser ni EventEngine; esas piezas quedan para
  F2.3/F2.4/F3.

## Fase 2.2 — datos de comida
- `src/data/foods.json`: catálogo inicial de 6 comidas/bebidas con `id`, `name`,
  `category` y `needsDelta` compatible con `applyFoodEffect`.
- `src/data/foods.ts`: tipos `FoodItem`/`FoodCategory`, validación pura del catálogo y
  export `FOOD_CATALOG`. El módulo falla pronto si el JSON deja de ser válido.
- No toca `SaveSystem`, IndexedDB, UI Phaser ni EventEngine; el catálogo se conectará a
  persistencia/UI en F2.3/F2.4.

## Fase 2.3 — persistencia de necesidades
- `SaveState` sube a schema v3 y añade `needsUpdatedAtMs` para saber desde cuándo aplicar
  decaimiento temporal de necesidades.
- La migración v2→v3 normaliza `resident.needs` con defaults y deja `needsUpdatedAtMs:
  null` hasta que el sistema siembre la primera marca temporal.
- `SaveSystem.applyNeedsDecay(nowMs?)` carga, decae necesidades con `decayNeeds`, persiste
  el resultado y actualiza `needsUpdatedAtMs`. Queda listo para que F2.4 lo llame al abrir
  la isla, sin tocar UI todavía.

## Fase 2.4 — UI mínima de hambre/comida
- `src/main.ts` aplica `SaveSystem.applyNeedsDecay()` al abrir antes de renderizar.
- `src/ui/island-scene.ts` muestra resumen de necesidades y burbuja de hambre si
  `needsToStatus` detecta hambre alta/urgente.
- `src/ui/resident-panel.ts` permite elegir una comida de `FOOD_CATALOG`, aplicar su
  `FoodEffect`, guardar el residente y re-renderizar la escena. La reacción textual queda
  para F2.5.

## Fase 2.5 — reacción por plantilla
- `src/dialogue/food-reactions.ts`: función pura `foodReactionFor` que genera una frase
  breve al dar comida según cambio de hambre/ánimo, sin IA ni EventEngine.
- `src/ui/resident-panel.ts` muestra la reacción tras dar comida y la pasa a `main.ts`.
- `src/ui/island-scene.ts` muestra la reacción como burbuja textual simple del residente.
- Con esto Fase 2 queda cerrada: abrir isla → decaen necesidades → residente puede tener
  hambre → jugador da comida → se guarda → residente reacciona.

## Fase 1 — detalle de implementación
- `src/core/{ids,personality,needs,avatar,resident}.ts`: tipos de dominio puros (sin Phaser, sin storage).
- `src/residents/{validation,factory}.ts`: `validateResidentName`, `validatePersonality`,
  `createResident`, `updateResident`. Lanzan `ResidentValidationError` (con lista de errores) ante datos inválidos.
- `src/save/storage-port.ts`: puerto `StoragePort` (`get/set/remove/keys`), implementado por
  `IndexedDbStorage` (runtime, localForage) e `InMemoryStorage` (tests). `SaveSystem` recibe el
  puerto por inyección y expone `saveResident/loadResident/listResidents/removeResident/loadState`.
  `save-state.ts` define `SaveState` (`schemaVersion`, actualmente **4**) y `migrateSaveState`,
  con pasos incrementales v0→v1, v1→v2 (rellena `kindness`) y v2→v3 (normaliza
  necesidades y añade `needsUpdatedAtMs`).
- `src/ui/{island-scene,resident-panel,avatar-palette}.ts` + `src/main.ts`: única capa que importa
  Phaser. Al arrancar carga el residente guardado (o crea uno por defecto), lo pinta en
  `IslandScene` y monta el panel de edición (nombre + 6 sliders de personalidad, incluida
  `kindness`) que persiste vía `SaveSystem` y re-renderiza la escena. El panel solo edita
  los 6 sliders + nombre; categoría/tags/expresión (ver Fase 1.2 más abajo) se muestran en
  `IslandScene` pero no son editables.

## Flujo de datos
```
Reglas → SceneIntent → (IA opcional) → texto validado → escena
EventSuggestor propone → EventEngine valida → GameState aplica
```

## Estructura de carpetas
```
index.html
package.json · tsconfig.json · vite.config.ts
public/            manifest.webmanifest · iconos PWA
src/
  main.ts          bootstrap del juego (Phaser)
  core/ residents/ relationships/ events/ dialogue/ ai/ save/ ui/ data/
tests/             Vitest (lógica pura)
```

## Regla de acoplamiento
La **lógica de simulación no depende de Phaser**. Phaser vive solo en `src/ui/` y
`src/main.ts`. Así el core es testeable y portable (y la IA reemplazable por plantillas).

## Pilot Runtime Prep - Mara
- **[DONE] 2026-07-08** Mara pilot style anchor copied from
  `docs/art/pilot/mara_pilot_v4.png` to runtime asset
  `public/art/pilot/mara_pilot_v4.png`.
- `src/ui/island-scene.ts` preloads the pilot sprite and renders it in the island scene
  with the previous colored-circle avatar kept as a fallback if the texture is missing.
- Scope is intentionally narrow: this is a visual scale/readability preview, not the
  final modular paper-doll system, not F3.4 generic scene UI, and not mass production.
- Next recommended task: **F3.4**, model **Codex/Sonnet**, reasoning **medium**, no
  subagents unless screenshot review or asset QA becomes independent.

## F3.4 Visual Experience Prep
- **[DONE] 2026-07-08** Strong visual/UX rethink before F3.4 implementation.
- Spec: `docs/ux_f3_4_visual_experience.md`.
- Runtime shell changed from overlapping canvas + fixed panel to a two-column app shell:
  Phaser play surface on the left, resident inspector/actions panel on the right, stacked
  on narrow screens.
- `IslandScene` now uses a wider 960x600 play surface, a warmer temporary resident
  stage, shorter in-scene state text, and a first idle tween for Mara.
- What remains for F3.4: generic scene bubble, `computeActiveScenes()` UI wiring,
  `resolveScene()` UI wiring, and resolution tweens per scene type.

## F3.4 - Generic Scene UI (DONE)
- **[DONE] 2026-07-08**: closed the remaining F3.4 items above. Continued from a
  partial Codex pass that hit its usage limit mid-edit; picked up, completed, and
  validated end-to-end.
- Fixed a leftover reference to the old `hungerBubbleText` field (renamed to
  `sceneBubbleText` during the UX rework) that would have failed at runtime.
- `IslandScene.showActiveScene(intent, text)`: shows/hides the generic scene bubble
  above the resident, replacing the F2 hunger-only bubble. Text comes from
  `sceneTextFor` over the real `SceneIntent`; label comes from the existing
  `SCENE_ICONS` map (one label per `SceneType`).
- `IslandScene.showResolutionFeedback(sceneType)`: one-shot tween per resolution
  (hop for hungry/bored/lonely, slow settle for tired, playful tilt for quirk),
  pausing/resuming the idle tween so they do not fight over the same properties.
- `main.ts` wires `SaveSystem.computeActiveScenes()` / `resolveScene()` to both the
  Phaser scene and the DOM panel (`resident-panel.ts`, already had `activeScene` /
  `onResolveScene` support from the interrupted pass).
- `vite.config.ts`: added `server.port` reading `process.env.PORT` so the preview
  harness's autoPort assignment is actually honored (dev server was silently
  defaulting to 5173 and ignoring the assigned port).
- Validation: `npm run build` (tsc + vite) green, `npm test` 84/84 green, Phaser
  coupling boundary clean, zero control-byte checks clean. Live preview: seeded a
  resident to hunger=95 via the real `SaveSystem` (no test/mock shortcuts), reloaded,
  confirmed the bubble showed "I could really use something to eat.", clicked the
  real resolve button, confirmed hunger 95->50 and mood 70->76 via `applyFoodEffect`,
  scene cleared afterward, zero console errors throughout.
- Model used: Sonnet (mechanical completion + wiring of an already-designed system,
  matches the project's own model-selection rubric in AGENTS.md).
