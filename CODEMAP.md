# CODEMAP — Cotilleo Island

Mapa de módulos previstos. Se rellena a medida que se implementan (Fase 1: sistema de residentes).

## Metodología Git por fases
- Trabajar cada fase en una rama dedicada con patrón `develop/fN-nombre-corto`
  (ej. `develop/f2-needs-food-loop`).
- Al cerrar una fase, hacer un commit de hito y crear un tag `V1.FN` sobre el commit
  verificado (ej. `V1.F1` marca el cierre de Fase 1).
- Antes de empezar la siguiente fase, pasar pre-flight: `CODEMAP.md`/docs alineados,
  tests y build en verde, y dossier del vault actualizado con `[DONE]`/`[TODO]`.
- Mantener el scope de la rama centrado en la fase; no mezclar features futuras salvo
  ajustes pequeños necesarios para cerrar el hito actual.
- Al cerrar cualquier subfase, documentar el estado también en la memoria/vault
  (`40-Proyectos/CotilleoIsland/CotilleoIsland.md`): qué quedó `[DONE]`, qué sigue
  `[TODO]`, tests/build y siguiente modelo recomendado. No basta con actualizar solo
  `CODEMAP.md` o docs técnicas del repo.

## Módulos (arquitectura objetivo)
| Módulo | Carpeta | Responsabilidad | Estado |
|---|---|---|---|
| **Core** | `src/core/` | Tipos base: `Resident`, `Personality`, `Needs`, `Avatar`, ids tipados (`ResidentId`); proyecciones puras de personalidad (`personality-derived.ts`); lógica pura de necesidades (`needs.ts`) | **Fase 2.1: core de necesidades implementado** (sin UI ni persistencia de F2 aún) |
| **Residents** | `src/residents/` | `createResident`/`updateResident` (defaults + validación pura de nombre y personalidad) | **Fase 1: implementado** (sin inventario/nivel aún) |
| **Relationships** | `src/relationships/` | Amistad, confianza, tensión, romance, historial resumido, `chemistry` de pareja (F4) | **pendiente F4** |
| **Events** | `src/events/` | Detecta eventos, puntúa, evita repetición, genera `SceneIntent` | pendiente |
| **Dialogue** | `src/dialogue/` | V1: plantillas (`TemplateDialogueGenerator`); V2: IA (`DialogueGenerator`) | pendiente |
| **AI** (opcional) | `src/ai/` | DialogueEnhancer, DailyNarrator, MemorySummarizer, CatchphraseGenerator, EventSuggestor validado | pendiente |
| **Save** | `src/save/` | `StoragePort` (`IndexedDbStorage` / `InMemoryStorage`) + `SaveSystem` (CRUD de residentes, `SaveState` versionado, migración, decaimiento de necesidades al cargar) | **Fase 2.3: persistencia de necesidades implementada** (export/import manual pendiente) |
| **UI** | `src/ui/` | `IslandScene` (Phaser, placeholder de residente "en su casa") + `resident-panel` (overlay DOM: crear/editar nombre y personalidad) | **Fase 1: implementado como placeholder** (sin isla/mapa real, un solo residente en pantalla) |
| **Data** | `src/data/` | Catálogo de comidas (`foods.json`) + validación/exports (`foods.ts`) ahora; después residentes mock, eventos y plantillas | **Fase 2.2: comidas implementadas** |

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

## Fase 1 — detalle de implementación
- `src/core/{ids,personality,needs,avatar,resident}.ts`: tipos de dominio puros (sin Phaser, sin storage).
- `src/residents/{validation,factory}.ts`: `validateResidentName`, `validatePersonality`,
  `createResident`, `updateResident`. Lanzan `ResidentValidationError` (con lista de errores) ante datos inválidos.
- `src/save/storage-port.ts`: puerto `StoragePort` (`get/set/remove/keys`), implementado por
  `IndexedDbStorage` (runtime, localForage) e `InMemoryStorage` (tests). `SaveSystem` recibe el
  puerto por inyección y expone `saveResident/loadResident/listResidents/removeResident/loadState`.
  `save-state.ts` define `SaveState` (`schemaVersion`, actualmente **3**) y `migrateSaveState`,
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
