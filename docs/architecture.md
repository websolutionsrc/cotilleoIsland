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

## Event Engine (por reglas)
Cada tick de simulación (o al entrar en pantalla):
```
revisar residentes → detectar necesidades y relaciones relevantes
→ crear eventos candidatos → puntuar → filtrar repetidos
→ elegir 1-3 eventos activos → generar SceneIntent
```
Scoring simple:
```
score = necesidad*peso + rareza_controlada + novedad + relevancia_relacional
      - penalización_por_repetición
```
Reglas ejemplo: `hunger > 70` → "pide comida"; `social_need > 60 y pocos amigos` →
"quiere conocer a alguien"; `friendship > 70 y tension < 20` → "quiere pasar tiempo";
`romantic_interest > 60` → "acercamiento romántico"; `tension > 60` → "discusión".

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

## Consideración de rendimiento (PWA en iPad)
Sprites 2D ligeros, atlas de texturas, poca lógica por frame (la simulación avanza por
tick, no por frame). Validar almacenamiento/rendimiento en Safari iPad pronto.
