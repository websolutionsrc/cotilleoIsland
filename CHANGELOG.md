# Changelog — Cotilleo Island

Formato: entradas por fase/hito. Fechas en `YYYY-MM-DD`.

## [F5.3] - 2026-07-10

### Added
- New `SceneType`: `zone_opening`, a one-time celebration scene fired when a
  new island zone unlocks. Protagonist is the oldest resident (stable array
  insertion order). Wired into the full detect->cooldown->score->select->
  resolve pipeline; text references the zone's real name; resolving it grants
  `+10 mood` and the usual scene coin reward.
- `pendingZoneCelebrations(unlockedZoneIds, celebratedZoneIds)` in
  `src/data/zones.ts`: pure diff of unlocked-but-not-yet-celebrated zones.
- `SaveState` schema v7: adds `celebratedZoneIds: ZoneId[]`. Migration v6->v7
  seeds it retroactively from `unlockedZoneIds` so veteran saves don't fire a
  burst of celebrations for progress that predates this feature.

### Fixed
- `createEmptySaveState` now seeds `celebratedZoneIds` with the always-unlocked
  `residential` zone instead of `[]`, preventing a spurious "residential
  opened!" scene on every brand-new save.

## [F5.2] - 2026-07-10

### Added
- `SaveState` schema v6: `wallet: {coins}`, `unlockedZoneIds: ZoneId[]`,
  `pantry: PantryEntry[]`. Migration v5->v6 seeds 50 coins + 3x cheapest
  food (starter pantry, computed dynamically from `FOOD_CATALOG`) unless
  those fields already exist; `unlockedZoneIds` computed retroactively from
  the save's resident count so veteran saves don't trigger a wave of
  false "new zone" celebrations.
- `SaveSystem.buyFood(foodId, qty)`: deducts coins, adds to pantry, one
  write. Rejects non-positive qty, unknown items, insufficient funds.
- `SaveSystem.resolveScene` now awards `coinsForScene(intent)` on every
  resolution (solo and social) in the same existing write.
- `SaveSystem.applyWorldDecay` now also evaluates zone unlocks on every
  call with residents present, independent of elapsed time (zone unlocks
  depend on resident count, not the clock) - restructured to one
  persisted write covering needs decay, relationship decay, and unlocks.

### Notes
- Deliberately deferred to F5.4: gating the existing food-giving UI paths
  on actual pantry stock. F5.2 only builds the capability.
- Known gap for F5.3: `applyWorldDecay` persists newly-unlocked zones but
  doesn't yet expose them or generate a `zone_opening` celebration scene;
  the sceneLog's cap-20 rollover makes it unreliable for tracking
  "already celebrated" - F5.3 needs its own answer for this.

### Validation
- +9 tests in `tests/save-system.test.ts` (migration seeding/preservation,
  zone unlock incl. zero-elapsed-time, buyFood success/rejections, coin
  reward on solo and social resolution). Fixed 2 pre-existing fixture
  tests missing the new v6 fields. 162 tests total, green. `npm run build`
  green. Phaser coupling clean, zero control-byte artifacts.
- Live preview against real IndexedDB: migrated a raw v5 save, confirmed
  schema 6 + starter economy + retroactive unlocks; resolved an urgent
  hunger scene (50->60 coins); bought ramen (60->42 coins, pantry
  updated). Zero console errors.

## [F5.1] - 2026-07-09

### Added
- `src/data/zones.ts`: fixed 5-zone catalog + pure `evaluateZoneUnlocks`/
  `newlyUnlockedZones` (unlock gated on resident count).
- `src/events/reward.ts`: `coinsForScene` (5 base, 10 if urgent - reuses the
  existing `ignoresCooldown` concept instead of inventing a new one).
- `src/core/pantry.ts`: pure pantry helpers (`pantryQuantity`/`addToPantry`/
  `removeFromPantry`).
- `FoodItem` gained a required `price` field (validated); `foods.json` prices
  set proportional to effect, 5-18 coins.

### Validation
- +19 tests (`zones.test.ts`, `pantry.test.ts`, `reward.test.ts`, +2 in
  `foods.test.ts`). 154 tests total, green. `npm run build` green. Phaser
  coupling boundary clean, zero control-byte artifacts. Pure logic only -
  no live preview check needed (nothing observable changed yet).

## [F4.4] - 2026-07-09

### Added
- Minimal multi-resident UI: "Residentes" section in the panel with a
  switcher `<select>` and a "Crear residente" button/input. `main.ts`
  respects `SaveState.activeResidentId` on boot (was always `residents[0]`).
- Social scene resolution wired into the panel: the "Resolver" button is now
  enabled for social scenes and calls `onResolveScene(intent)` with no
  action, matching `SaveSystem.resolveScene`'s optional `action` param.

### Fixed
- With multiple residents, `computeActiveScenes()` can return a scene not
  involving the currently displayed resident (it picks up to 3 globally).
  `refreshResidentAndScene` now filters for the current resident's own
  scene before showing/allowing resolution.
- Social scene text now resolves and passes the real counterpart resident
  to `sceneTextFor`, instead of falling back to "someone".

### Validation
- `npm run build` and `npm test` (136/136) green.
- Manually driven through real DOM interaction (not just state seeding):
  created a second resident via the actual input+button, saw the switcher
  update and auto-select the new resident, saw the real "meet" scene text
  naming both residents, clicked the real "Resolver" button, and confirmed
  via `SaveSystem.loadState()` that the relationship became "acquaintances"
  (friendship=5) and both residents' mood updated (70->73). Zero console
  errors throughout.

**F4 (Relationships) is now fully closed: F4.1-F4.4 all done.**

## [F4.3] - 2026-07-08

### Added
- 7 social scene types wired into the Event Engine: meet, chat, argument,
  reconcile, flirt, confess, propose. `detectSocialSceneCandidates` (pure,
  threshold-based, no RNG); `resolve-social.ts` (relationshipActionForScene
  mapping + symmetric needs effects on both participants).
- `SaveSystem.computeActiveScenes` now also scans every unique resident pair
  for social candidates (not just per-resident). `resolveScene` resolves
  social scenes deterministically (no player sub-choice), updating both
  residents and the relationship in one write.
- `sceneTextFor` gained an optional `counterpart` parameter for social scene
  text (mentions both names; falls back to "someone" instead of failing).

### Changed
- `SceneType` split into `SoloSceneType | SocialSceneType` (explicit, not a
  computed `Exclude`) so `resolve.ts`'s exhaustive action-kind mapping stays
  scoped to solo scenes.
- Cooldown matching upgraded from "same participants[0]" to "same
  participant set" (order-independent), correctly blocking a specific pair.
- `selectScenes`: a multi-participant candidate now competes for every one
  of its participants' slots and is only chosen if it wins all of them -
  otherwise dropped entirely (a resident can't be in two scenes at once).
- `resolveScene`'s `action` parameter is now optional (ignored for social
  scenes, still required - and enforced at runtime - for solo scenes).
- Fixed a real bug found while wiring this: `save-state.ts`'s scene-log
  validator only knew the 5 old scene types, so a resolved social scene's
  log entry would have silently failed validation and vanished on next load.

### Notes
- confess/propose detection reuses the exact same threshold constants as the
  status-machine transition guard, so an offered scene is guaranteed
  resolvable.
- Social scene score weights (argument 0.85, chat/reconcile 0.65-0.7,
  confess/propose 0.6, flirt/meet 0.5) are an implementation decision not
  fully pinned by the design doc.

### Validation
- +16 tests in `tests/social-scenes.test.ts`, +3 in `tests/save-system.test.ts`,
  +3 in `tests/scene-texts.test.ts`. 136 tests total, green. `npm run build`
  green. Phaser coupling boundary clean, zero control-byte artifacts.
- Live preview end-to-end against the real SaveSystem/IndexedDB running the
  full pipeline: detected "meet" for two fresh strangers, resolved it,
  confirmed both residents' mood updated and the relationship transitioned
  strangers -> acquaintances. Zero console errors.

## [F4.2] - 2026-07-08

### Added
- `SaveState` schema v5: `relationships: Relationship[]`, migration v4->v5
  (seeds `[]`), `removeResident` now also drops relationships involving the
  removed id.
- `SaveSystem.getRelationshipBetween(x, y)` and
  `SaveSystem.resolveRelationshipAction(aId, bId, action, nowMs)` - decoupled
  from the scene-engine pipeline for now, F4.3 will wire it in.

### Changed
- `SaveSystem.applyNeedsDecay` renamed to `applyWorldDecay` (clean rename, no
  shim): now decays needs and relationships from the same world-tick. Updated
  `main.ts` and tests.
- `decayRelationship` signature gained a `nowMs` parameter: the grace period
  is a boolean gate on absolute time since `lastInteractionAtMs`, not a
  subtraction from the incremental tick - fixes a real idempotency bug found
  while wiring persistence (repeated small ticks would never have
  accumulated 3 days of silence otherwise).

### Validation
- `npm run build` and `npm test` (113/113) green. Phaser coupling boundary
  clean, zero control-byte artifacts. Live preview end-to-end: seeded a
  second resident through the real SaveSystem/IndexedDB, resolved a "meet"
  action, confirmed status "strangers" -> "acquaintances", friendship=5,
  schemaVersion=5. Zero console errors.

## [F4.1] - 2026-07-08

### Added
- `src/relationships/` pure core (no save/UI, no Phaser): `types.ts`
  (`Relationship`, `RelationshipStatus`), `key.ts` (ordered-pair normalization,
  `getRelationship` default-on-miss, `upsertRelationship`), `chemistry.ts`
  (pure romance-compatibility projection, never persisted), `status.ts`
  (explicit status state machine with guards, driven only by resolved
  actions), `decay.ts` (friendship/tension passive decay with grace period),
  `apply.ts` (`applyRelationshipAction`, single entry point tying deltas +
  chemistry + status transition together).
- Tests (`tests/relationships.test.ts`, 27): covers key normalization,
  chemistry direction/clamping, every status transition and guard, decay
  grace period, and end-to-end action application.

### Validation
- `npm run build` and `npm test` (111/111) green. Phaser coupling boundary
  clean, zero control-byte artifacts.

### Notes
- Tagged `v01.00.F3` (Event Engine complete) before branching
  `develop/f4-relationships` off it.
- F4.2 (persistence), F4.3 (social scenes), F4.4 (UI) remain. F4.4 raises an
  open question: the game only ever shows one resident today, so social
  scenes cannot trigger live without a second resident - see CODEMAP.

## [F3.4] - 2026-07-08

### Added
- Generic F3 scene UI: `IslandScene.showActiveScene`/`showResolutionFeedback` and
  `main.ts` wiring of `computeActiveScenes()`/`resolveScene()` to Phaser scene + DOM
  panel. Replaces the F2 ad-hoc hunger-only bubble.
- `vite.config.ts` now reads `PORT` from the environment so the local preview
  harness's autoPort assignment is actually respected by the dev server.

### Fixed
- Completed a Codex pass left mid-edit (hit its usage limit): a leftover reference
  to the removed `hungerBubbleText` field would have thrown at runtime.

### Validation
- `npm run build` and `npm test` (84/84) green; Phaser stays confined to `src/ui/`
  and `main.ts`; no control-byte artifacts in changed files.
- Live preview end-to-end: seeded hunger=95 through the real `SaveSystem`, confirmed
  the scene bubble and panel text, resolved via the real "Dar comida" button,
  confirmed needs updated (hunger 95->50, mood 70->76) and the scene cleared. Zero
  console errors.

## [F2.6 - visual direction] - 2026-07-07

### Added (design only; no gameplay code)
- `docs/art_library.md`: full 2D art library by Fable 5 - Direction B "Storybook with
  volume" (warm outlines + cel shading + soft gradient), 2.7-heads chibi construction,
  modular 12-layer avatar stack with skin-reveal metadata and palette-swap triplets,
  10-tone realistic skin ramp (Monk-inspired), 9 expression states grammar, render
  targets/export naming, tween-based V1 animation, minimum V1 asset list, 8 scene
  icons mapped 1:1 to F3 SceneTypes, environment and bubble language for F3.4,
  image-model prompt templates, delegation map and pilot acceptance gate.
- `docs/adr/0006-art-direction-storybook-2d.md`: direction decision, alternatives
  discarded (prerender, vinyl, hybrid, 3D), explicit libraries decision (no new
  runtime dependency yet; atlas revisited with ADR past ~50 sprites).
- CODEMAP F2.6 updated to DONE (art library) with pilot gate pending.

### Process
- Direction chosen by the user from 3 Fable proposals anchored on user-provided
  reference images (stored in `docs/art/references/`).
- Expression set extended on user request: 9 -> 14 states (+1 optional `love`),
  adding angry, scared (reserved), anxious, embarrassed, vigorous, each with a
  documented runtime trigger (pure projection, never persisted).

## [Fase 3 — diseño] — 2026-07-07

### Añadido (solo documentación; sin código)
- `docs/engine_design_f3-f5.md`: arquitectura conjunta del motor (F3 Event Engine,
  F4 Relationships, F5 Isla/progreso) con modelo de datos unificado (plan de schema
  v4/v5/v6), invariantes, plan de evolución honesto, subfases F3.1–F3.4 y anti-scope.
- `docs/adr/0005-event-engine-f3-f5.md`: decisiones (participants[] desde F3, cooldown
  duro, SceneIntent efímera, status persistido vs chemistry pura, stats en v4) y
  alternativas descartadas.
- `docs/scene_intent_spec.md` reescrita como contrato V1 real (la anterior era
  aspiracional y contradecía el ADR 0004: fuera `tone`/`result_options`).
- `docs/architecture.md`/`docs/data_model.md`/`CODEMAP.md` alineados (tabla de versiones
  de guardado v2→v6; corregida la inconsistencia "versión actual: 2").
- `AGENTS.md`: regla de trazabilidad de modelos en commits (trailer = orquestador
  actual; el cuerpo nombra al constructor si fue un subagente distinto).

### Decisiones
- Diseño por Fable 5 (sesión interactiva); construcción prevista: Sonnet/Codex.
- Regla que ordena el modelo de datos: derivado si no tiene memoria; persistido si una
  transición depende de la historia.

## [Fase 1.2] — 2026-07-07

### Añadido
- **Core** (`src/core/personality-derived.ts`, nuevo, TS puro sin Phaser): implementa las
  proyecciones puras y deterministas de los 6 sliders de `Personality` que Fase 1.1 dejó
  documentadas como contrato pendiente:
  - `personalityToTags(p)`: hasta 3 tags por umbrales fijos (alto ≥ 70, bajo ≤ 30),
    ordenadas por distancia a 50 (desempate: orden fijo de `PERSONALITY_KEYS`); si ningún
    rasgo es extremo devuelve `["equilibrada"]`. `romanticism` bajo no genera tag propia.
  - `personalityCategory(p)`: clasifica en 1 de 4 familias amplias (`Sociable`,
    `Reservada`, `Cariñosa`, `Excéntrica`) por score comparable 0–200 por familia; empate
    exacto lo resuelve el orden fijo de esa lista (gana `Sociable`).
  - `personalityExpression(p)`: hint de pose/idle (`"animada"`, `"sonriente"`, `"seria"`,
    `"peculiar"`, `"neutral"`) por prioridad fija sobre el rasgo dominante.
  - Reexportado desde el barrel `src/core/index.ts`.
- **UI** (`src/ui/island-scene.ts`): muestra la categoría y las tags derivadas junto al
  resumen de personalidad, y usa `personalityExpression`/`personalityCategory` para variar
  el color del nombre y del trazo de la "casa" placeholder (recalculado en cada
  `renderResident`, sigue siendo placeholder sin sprites). El panel de edición
  (`resident-panel.ts`) no cambia: sigue editando solo los 6 sliders + nombre.
- Tests (Vitest, `tests/personality-derived.test.ts`): casos extremos, equilibrados y de
  desempate para las tres funciones.
- `docs/adr/0004-personality-model.md` (nuevo ADR): fija el modelo — sliders como única
  fuente de verdad, tags/categoría/expresión como proyecciones puras no persistidas, y el
  romance dividido en `romanticism` (individual) + `chemistry` de pareja (plan Fase 4).
- `docs/data_model.md`: nueva sección "Personalidad: 6 sliders, única fuente de verdad" y
  sección "Romance individual vs. `chemistry` de pareja (plan Fase 4)" en `Relationship`.
- `docs/architecture.md`: subsistema de personalidad (sliders → tags/categoría/expresión).

### Decisiones
- **Ningún cambio de esquema de guardado**: `CURRENT_SCHEMA_VERSION` sigue en **2**, sin
  migración nueva. Tags/categoría/expresión nunca se guardan en `SaveState`; se recalculan
  siempre desde los sliders persistidos.
- `chemistry` (afinidad romántica por pareja) **no se implementa** en esta fase: queda como
  plan documentado para Fase 4 (`src/relationships/`, hoy inexistente).

## [Fase 1.1] — 2026-07-07

### Añadido
- **Core** (`src/core/personality.ts`): nuevo rasgo `kindness` (amabilidad/calidez,
  0–100) en `Personality` y `PERSONALITY_KEYS`; default `50` en `DEFAULT_PERSONALITY`.
  Cubierto automáticamente por `validatePersonality` (itera `PERSONALITY_KEYS`).
- **UI**: nuevo slider "Amabilidad" en el panel de edición (`resident-panel.ts`) y en el
  resumen de personalidad de `IslandScene` (`island-scene.ts`).
- **Save**: `CURRENT_SCHEMA_VERSION` sube a **2**. Nuevo paso de migración incremental
  v1 → v2 en `migrateSaveState` (`save-state.ts`) que rellena `kindness` con el valor por
  defecto en cualquier residente guardado que no lo tenga (guardados v1). El paso v0 → v1
  se mantiene sin cambios; las migraciones siguen siendo incrementales (nunca se salta de
  v0 a v2 directamente). Test añadido en `tests/save-system.test.ts`.
- Documentado en `docs/data_model.md` (y una línea en `docs/architecture.md`) el principio
  para Fase 3: las tags/tono de personalidad de una escena (p.ej. "dramática", "impaciente",
  el campo `tone` de `scene_intent_spec.md`) deben derivarse siempre de los sliders de
  `Personality` mediante una única función determinista `personalityToTags(personality)`
  (a implementar en Fase 3); no se autoescriben tags de texto sueltas por residente. Los
  sliders son la única fuente de verdad. No se implementa la función en esta tarea.

## [Fase 1] — 2026-07-07

### Añadido
- **Core** (`src/core/`): tipos de dominio puros `Resident`, `Personality` (energy,
  sociability, patience, weirdness, romanticism), `Needs` (hunger, mood, energy,
  social_need, boredom), `Avatar` e ids tipados (`ResidentId`, `createResidentId`).
- **Residents** (`src/residents/`): `createResident`/`updateResident` (defaults sensatos,
  puro, sin efectos secundarios) y validación (`validateResidentName`, `sanitizeResidentName`,
  `validatePersonality`); lanzan `ResidentValidationError` con la lista de errores.
- **Save** (`src/save/`): puerto `StoragePort` con dos implementaciones —
  `IndexedDbStorage` (localForage, runtime) e `InMemoryStorage` (tests, sin DOM) — inyectadas
  en `SaveSystem` (guardar/cargar/listar/eliminar residentes). `SaveState` versionado
  (`schemaVersion`) con stub de migración (`migrateSaveState`) para guardados antiguos.
- **UI** (`src/ui/` + `src/main.ts`): `IslandScene` (Phaser) muestra un residente placeholder
  "en su casa" (casa + avatar teñido por color + nombre + resumen de personalidad); panel de
  edición en overlay DOM (nombre + 5 sliders de personalidad) que guarda vía `SaveSystem` y
  re-renderiza la escena. Al arrancar carga el residente guardado o crea uno por defecto.
- Tests (Vitest): creación/validación de residentes (casos válidos e inválidos) y round-trip
  de `SaveSystem` con `InMemoryStorage`, incluida la migración de un guardado sin `schemaVersion`.
- `.claude/launch.json` para levantar el servidor de dev (`npm run dev`) desde el preview.

### Decisiones
- Tipos de dominio (`Resident`, `Personality`, `Needs`, `Avatar`) viven en `src/core/`; la
  lógica de creación/validación en `src/residents/` (separación datos vs. lógica).
- `SaveState` guarda todos los residentes en un único blob versionado bajo una clave
  (`cotilleo:save-state`), no una entrada por residente: simplifica migración y consistencia
  a costa de reescribir todo el estado en cada guardado (aceptable al volumen de V1).
- Avatar en Fase 1 es solo un conjunto de claves de string (`face/hair/eyes/mouth/color`);
  el render usa una paleta local en `src/ui/avatar-palette.ts` para teñir un círculo — no hay
  sprites/atlas todavía.

### Fuera de alcance (a propósito)
- Tick de necesidades, Event Engine, relaciones/romance, diálogo, IA, tiendas, isla/mapa real.
- Export/import manual de `SaveState` (mencionado en docs, no requerido en Fase 1).
- Múltiples residentes en pantalla a la vez (el `SaveSystem` ya soporta varios; la UI de
  Fase 1 solo muestra y edita el residente activo).

## [Fase 0] — 2026-07-07

### Decisiones
- **Engine: web/PWA** (TypeScript + Vite + Phaser 3) en lugar de Unity — llega al iPad
  sin Mac ni build cloud de pago (ADR 0001, sustituye a la propuesta Unity).
- **Modo de trabajo**: humano + Claude Code como único constructor; comité multi-modelo
  en reserva hasta validar el core loop.
- **Alcance V1**: romance y matrimonio/convivencia **dentro**; **bebés fuera**.
- **Fuente de verdad técnica**: este repo (`docs/`); la bóveda Obsidian queda como puntero.

### Añadido
- Repositorio inicializado (git) y `.gitignore` (Node/web).
- Documentación base: `README.md`, `AGENTS.md`, `CODEMAP.md`.
- `docs/`: product_brief, architecture, scene_intent_spec, data_model, ai_usage_policy, distribution_strategy.
- `docs/adr/`: 0001 (web/PWA), 0002 (local-first), 0003 (IA como capa de expresión).
- Scaffold web: `package.json`, `tsconfig.json`, `vite.config.ts` (PWA), `index.html`,
  `src/main.ts` (placeholder) y estructura de módulos `src/{core,residents,relationships,events,dialogue,ai,save,ui,data}`.
- `tools/` y `public/icons/`.

### Cambiado
- Sustituido el scaffold Unity (`UnityProject/`, ADR Unity) por el stack web.

### Pendiente
- `npm install` y primer `npm run dev`.
- Iconos PWA (192/512) en `public/icons/`.
- Fase 1: sistema de residentes.
