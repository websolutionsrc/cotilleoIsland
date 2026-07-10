# Architecture — Cotilleo Island

## Guiding Principle
```
Core Simulation → decide el estado del juego (V1, determinista, por reglas)
AI Layer        → mejora cómo se expresa ese estado (V2, opcional, reemplazable)
```
The engine decides the state; the AI embellishes/summarizes/suggests; the AI does not command the core.

## Stack
TypeScript + Vite + Phaser 3 (render 2D). **Pure** simulation logic, without Phaser dependency. Local persistence in **IndexedDB** (localForage). PWA installable on iPad.

## Modules
```
App (PWA)
├─ Core             estado del juego · tick de simulación · tipos
├─ Residents        personalidad · necesidades · inventario · nivel
├─ Relationships    amistad · confianza · tensión · romance · historial resumido
├─ Events           detecta · puntúa · evita repetición · genera SceneIntent
├─ Dialogue         V1: plantillas · V2/MVP: generación IA controlada
├─ AI (opcional)    DialogueEnhancer · DailyNarrator · MemorySummarizer
│                   CatchphraseGenerator · EventSuggestor (validado)
├─ Reward           monedas · nivel · desbloqueos
├─ Save             IndexedDB · logs resumidos · export/import
└─ UI (Phaser)      escenas · pantallas · render
```
Coupling rule: **the core does not import Phaser**; Phaser only in `src/ui/` and `main.ts`.

## Event Engine (by rules) — closed design in `engine_design_f3-f5.md`
No ticks or timers: everything is recalculated **on opening the island or after an action** (`applyNeedsDecay` pattern). Pipeline (pure functions, injected clock and RNG):
```
decay (F2) → detectores (needs+personality) → filtro duro de cooldown (sceneLog)
→ score = urgency × pesoTipo → 1 escena/residente (máx 3) → SceneIntent (efímera)
→ plantilla → el jugador resuelve → efectos + log + stats en UNA escritura
```
- F3: 5 `sceneType` (`hungry/tired/bored/lonely/quirk`); single cooldown exception:
  urgent hunger (≥ 90). F4 adds social detectors; F5 adds `zone_opening` and
  rewards. The engine does not rewrite itself: it only grows the detector list.
- The active scene **is not persisted** (it is recalculated); only `sceneLog`
  (cap 20) + `stats` is persisted. Full contract: `scene_intent_spec.md`; decisions: ADR 0005.
- Derived-vs-persisted rule that orders the entire engine: **derived if it has no memory;
  persisted if a transition depends on history** (generalizes ADR 0004; hence
  `chemistry` is pure and `Relationship.status` is persisted).

## Interfaces (AI behind contracts)
```ts
export interface DialogueGenerator { generate(ctx: DialogueContext): DialogueResult; }
export interface MemorySummarizer  { summarize(event: GameEvent): MemorySummary; }
export interface EventSuggestor     { suggest(snapshot: WorldSnapshot): SceneIntent[]; }
```
- V1: `TemplateDialogueGenerator` (templates).
- V2/MVP: `AiDialogueGenerator` with `AiClient` + `DialogueValidator` + fallback to template.
- Rule: `EventSuggestor` **proposes** → `EventEngine` **validates** → `GameState` **applies**.

## Persistence
**Local** saving in IndexedDB (localForage) with versioned schema and migrations.
Manual export/import (JSON). No backend in V1. See [`data_model.md`](data_model.md).

## Personality Subsystem: sliders → tags/category/expression (Phase 1.2)
The 6 sliders in `Personality` (`energy`, `sociability`, `patience`, `weirdness`,
`romanticism`, `kindness`) are the single source of truth. `src/core/personality-derived.ts`
(pure TS, no Phaser, no storage dependencies) exposes three **pure and
deterministic** projections of those sliders, recalculated on the fly, never persisted or
editable separately:
```
Personality (sliders, persistidos)
        │
        ├─ personalityToTags(p)        → hasta 3 tags de texto (p.ej. "enérgica", "impaciente")
        ├─ personalityCategory(p)      → 1 de 5 familias amplias ("Equilibrada"/"Sociable"/"Reservada"/"Cariñosa"/"Excéntrica")
        └─ personalityExpression(p)    → hint de pose/idle ("animada", "sonriente", "seria", "peculiar", "neutral")
```
Consumed today by `src/ui/island-scene.ts` (displays category/tags and colors the placeholder
according to the expression); in Phase 3, the dialogue templates/`SceneIntent` will also consume it instead of the free field `tone`. See `docs/data_model.md` and `docs/adr/0004-personality-model.md`.

Romantic affinity **between two residents** (`chemistry`) is a different calculation,
pending Phase 4 (Relationships): it does not live in `Personality` nor in this module. See
"Individual romance vs. `chemistry` couple" in `data_model.md`.

## Performance Consideration (PWA on iPad)
Light 2D sprites, texture atlases, little logic per frame (simulation advances by
tick, not by frame). Validate storage/performance on Safari iPad soon.
