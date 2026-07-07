# Arquitectura — Cotilleo Island

## Principio rector
```
Core Simulation → decide el estado del juego (V1, determinista, por reglas)
AI Layer        → mejora cómo se expresa ese estado (V2, opcional, reemplazable)
```
El motor decide el estado; la IA embellece/resume/sugiere; la IA no manda sobre el núcleo.

## Stack
TypeScript + Vite + Phaser 3 (render 2D). Lógica de simulación **pura**, sin dependencia
de Phaser. Persistencia local en **IndexedDB** (localForage). PWA instalable en iPad.

## Módulos
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
Regla de acoplamiento: **el core no importa Phaser**; Phaser solo en `src/ui/` y `main.ts`.

## Event Engine (por reglas) — diseño cerrado en `engine_design_f3-f5.md`
Sin ticks ni timers: todo se recalcula **al abrir la isla o tras una acción** (patrón
`applyNeedsDecay`). Pipeline (funciones puras, reloj y RNG inyectados):
```
decay (F2) → detectores (needs+personality) → filtro duro de cooldown (sceneLog)
→ score = urgency × pesoTipo → 1 escena/residente (máx 3) → SceneIntent (efímera)
→ plantilla → el jugador resuelve → efectos + log + stats en UNA escritura
```
- F3: 5 `sceneType` (`hungry/tired/bored/lonely/quirk`); excepción única de cooldown:
  hambre urgente (≥ 90). F4 añade detectores sociales; F5 añade `zone_opening` y
  recompensas. El motor no se reescribe: solo crece la lista de detectores.
- La escena activa **no se persiste** (se recalcula); solo se persiste `sceneLog`
  (cap 20) + `stats`. Contrato completo: `scene_intent_spec.md`; decisiones: ADR 0005.
- Regla derivado-vs-persistido que ordena todo el motor: **derivado si no tiene memoria;
  persistido si una transición depende de la historia** (generaliza el ADR 0004; por eso
  `chemistry` es pura y `Relationship.status` se persiste).

## Interfaces (IA detrás de contratos)
```ts
export interface DialogueGenerator { generate(ctx: DialogueContext): DialogueResult; }
export interface MemorySummarizer  { summarize(event: GameEvent): MemorySummary; }
export interface EventSuggestor     { suggest(snapshot: WorldSnapshot): SceneIntent[]; }
```
- V1: `TemplateDialogueGenerator` (plantillas).
- V2/MVP: `AiDialogueGenerator` con `AiClient` + `DialogueValidator` + fallback a plantilla.
- Regla: `EventSuggestor` **propone** → `EventEngine` **valida** → `GameState` **aplica**.

## Persistencia
Guardado **local** en IndexedDB (localForage) con esquema versionado y migraciones.
Export/import manual (JSON). Sin backend en V1. Ver [`data_model.md`](data_model.md).

## Subsistema de personalidad: sliders → tags/categoría/expresión (Fase 1.2)
Los 6 sliders de `Personality` (`energy`, `sociability`, `patience`, `weirdness`,
`romanticism`, `kindness`) son la única fuente de verdad. `src/core/personality-derived.ts`
(TS puro, sin Phaser, sin dependencias de storage) expone tres proyecciones **puras y
deterministas** de esos sliders, recalculadas siempre al vuelo, nunca persistidas ni
editables por separado:
```
Personality (sliders, persistidos)
        │
        ├─ personalityToTags(p)        → hasta 3 tags de texto (p.ej. "enérgica", "impaciente")
        ├─ personalityCategory(p)      → 1 de 5 familias amplias ("Equilibrada"/"Sociable"/"Reservada"/"Cariñosa"/"Excéntrica")
        └─ personalityExpression(p)    → hint de pose/idle ("animada", "sonriente", "seria", "peculiar", "neutral")
```
Consumido hoy por `src/ui/island-scene.ts` (muestra categoría/tags y tiñe el placeholder
según la expresión); en Fase 3 lo consumirán también las plantillas de diálogo/`SceneIntent`
en vez del campo libre `tone`. Ver `docs/data_model.md` y `docs/adr/0004-personality-model.md`.

La afinidad romántica **entre dos residentes** (`chemistry`) es un cálculo distinto,
pendiente de Fase 4 (Relationships): no vive en `Personality` ni en este módulo. Ver
"Romance individual vs. `chemistry` de pareja" en `data_model.md`.

## Consideración de rendimiento (PWA en iPad)
Sprites 2D ligeros, atlas de texturas, poca lógica por frame (la simulación avanza por
tick, no por frame). Validar almacenamiento/rendimiento en Safari iPad pronto.
