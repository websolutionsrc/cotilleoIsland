# CODEMAP — Cotilleo Island

Mapa de módulos previstos. Se rellena a medida que se implementan (Fase 1: sistema de residentes).

## Módulos (arquitectura objetivo)
| Módulo | Carpeta | Responsabilidad | Estado |
|---|---|---|---|
| **Core** | `src/core/` | Tipos base: `Resident`, `Personality`, `Needs`, `Avatar`, ids tipados (`ResidentId`) | **Fase 1: implementado** (tipos; sin tick de simulación aún) |
| **Residents** | `src/residents/` | `createResident`/`updateResident` (defaults + validación pura de nombre y personalidad) | **Fase 1: implementado** (sin inventario/nivel aún) |
| **Relationships** | `src/relationships/` | Amistad, confianza, tensión, romance, historial resumido | pendiente |
| **Events** | `src/events/` | Detecta eventos, puntúa, evita repetición, genera `SceneIntent` | pendiente |
| **Dialogue** | `src/dialogue/` | V1: plantillas (`TemplateDialogueGenerator`); V2: IA (`DialogueGenerator`) | pendiente |
| **AI** (opcional) | `src/ai/` | DialogueEnhancer, DailyNarrator, MemorySummarizer, CatchphraseGenerator, EventSuggestor validado | pendiente |
| **Save** | `src/save/` | `StoragePort` (`IndexedDbStorage` / `InMemoryStorage`) + `SaveSystem` (CRUD de residentes, `SaveState` versionado, migración) | **Fase 1: implementado** (export/import manual pendiente) |
| **UI** | `src/ui/` | `IslandScene` (Phaser, placeholder de residente "en su casa") + `resident-panel` (overlay DOM: crear/editar nombre y personalidad) | **Fase 1: implementado como placeholder** (sin isla/mapa real, un solo residente en pantalla) |
| **Data** | `src/data/` | `residents_mock.json`, `items.json`, `events.json`, `dialogue_templates.json` | pendiente |

## Fase 1 — detalle de implementación
- `src/core/{ids,personality,needs,avatar,resident}.ts`: tipos de dominio puros (sin Phaser, sin storage).
- `src/residents/{validation,factory}.ts`: `validateResidentName`, `validatePersonality`,
  `createResident`, `updateResident`. Lanzan `ResidentValidationError` (con lista de errores) ante datos inválidos.
- `src/save/storage-port.ts`: puerto `StoragePort` (`get/set/remove/keys`), implementado por
  `IndexedDbStorage` (runtime, localForage) e `InMemoryStorage` (tests). `SaveSystem` recibe el
  puerto por inyección y expone `saveResident/loadResident/listResidents/removeResident/loadState`.
  `save-state.ts` define `SaveState` (`schemaVersion`, actualmente **2**) y `migrateSaveState`,
  con pasos incrementales v0→v1 y v1→v2 (v1→v2 rellena `kindness` con su valor por defecto).
- `src/ui/{island-scene,resident-panel,avatar-palette}.ts` + `src/main.ts`: única capa que importa
  Phaser. Al arrancar carga el residente guardado (o crea uno por defecto), lo pinta en
  `IslandScene` y monta el panel de edición (nombre + 6 sliders de personalidad, incluida
  `kindness`) que persiste vía `SaveSystem` y re-renderiza la escena.

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
