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
| **Relationships** | `src/relationships/` | `Relationship` persistida (par `a<b`, friendship/tension/romance/`status`), `chemistry` pura, detectores sociales | **pendiente F4 — diseño cerrado** (`engine_design_f3-f5.md` §3) |
| **Events** | `src/events/` | `types/rng/detectors/cooldowns/select/resolve` — pipeline puro detect→cooldown→score→select, `SceneIntent` efímera, `sceneLog` cap 20 | **F3.1-F3.3 implemented; F3.4 UI pending** |
| **Dialogue** | `src/dialogue/` | V1: plantillas (`food-reactions.ts` ahora; `scene-texts.ts` en F3.3); V2: IA (`DialogueGenerator`) | **F3.3 scene text templates implemented** |
| **AI** (opcional) | `src/ai/` | DialogueEnhancer, DailyNarrator, MemorySummarizer, CatchphraseGenerator, EventSuggestor validado | pendiente |
| **Save** | `src/save/` | `StoragePort` (`IndexedDbStorage` / `InMemoryStorage`) + `SaveSystem` (CRUD de residentes, `SaveState` versionado, migración, decaimiento de necesidades al cargar, escenas activas F3) | **F3.2 internal scene persistence implemented** |
| **UI** | `src/ui/` | `IslandScene` (Phaser, placeholder de residente "en su casa") + `resident-panel` (overlay DOM: crear/editar nombre, personalidad, dar comida y mostrar reacción) | **Fase 2.5: vertical de hambre/comida implementado** |
| **Data** | `src/data/` | Catálogo de comidas (`foods.json`) + validación/exports (`foods.ts`), quirks (`quirks.ts`); después residentes mock, eventos y plantillas | **F3.3 quirks implemented** |
| **Visual direction** | `docs/art_bible.md` + `docs/art/references/` + future `public/art/` | 2D art bible: characters, outfits, environments, scene language, asset export rules and delegation guidelines so other models can produce visual work without touching the core | **F2.6 art bible DONE (ADR 0006, Direction B "Storybook with volume"); pilot asset pass pending before mass batches** |

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

## F2.6 — 2D Visual Direction for Fable (art bible DONE; pilot pending)

**Status 2026-07-07**: `docs/art_bible.md` written by Fable 5 (Direction B "Storybook
with volume", chosen by the user from 3 proposals over the reference images; ADR 0006).
Expression set extended on user request from the 9-face minimum to 14 (+1 optional
`love`): adds angry, scared (reserved), anxious, embarrassed, vigorous - each with a
reachability trigger documented in the bible (no dead art).
Libraries decision: no new runtime library yet (plain PNGs; atlas + ADR past ~50
sprites). Next gate: pilot asset pass (bible section 13) with user approval, then mass
batches (image model + Haiku/mini metadata + Codex integration). Reference images must
be dropped manually into `docs/art/references/`. Original brief below.
This subphase is **visual design only** and must be done by Fable before building F3.4
or F5. The current product decision is to keep V1 in **2D Phaser**, not migrate to 3D,
and raise the visual quality through a strong direction for characters, outfits,
environments and scene composition.

Fable owns the hard design work: define an actionable art bible, decide asset libraries
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
  variants after the art bible is closed.

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
