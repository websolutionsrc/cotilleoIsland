# Modelo de datos — Cotilleo Island

Datos estructurados desde el principio. TypeScript + JSON. Persistencia local en
**IndexedDB** (localForage), con esquema **versionado** y migraciones. Export/import
manual en JSON. Ids estables y legibles (`resident_lina`, `guitar_01`).
La versión actual del `SaveState` es **7** (ver tabla de migraciones al final de este doc).

## Resident
```json
{
  "id": "resident_lina",
  "name": "Lina",
  "avatar": { "face": "round_01", "hair": "short_03", "eyes": "happy_02", "mouth": "small_01", "color": "warm_02" },
  "personality": { "energy": 70, "sociability": 80, "patience": 35, "weirdness": 60, "romanticism": 40, "kindness": 55 }
}
```
Necesidades V1 (0–100): `hunger`, `mood`, `energy`, `social_need`, `boredom`.
En Fase 2.3, el `SaveState` guarda `needsUpdatedAtMs` (timestamp Unix en ms, o
`null` si aún no hay referencia temporal) para poder aplicar decaimiento al abrir
la isla sin depender de UI ni de Phaser.
`kindness` (amabilidad/calidez) se añadió en Fase 1.1. Desde F4 tiene lógica real: el
detector de la escena social `reconcile` (`src/events/detectors.ts`) exige que el
promedio de `kindness` de ambos residentes supere un umbral para que una relación
`fighting` pueda reconciliarse.

### Personalidad: 6 sliders, única fuente de verdad

`Personality` tiene 6 rasgos enteros 0–100: `energy`, `sociability`, `patience`,
`weirdness`, `romanticism`, `kindness`. Son la **única fuente de verdad** sobre la
personalidad de un residente. Todo lo demás —tags de texto, categoría amplia,
hint de expresión/pose— es una **proyección pura y determinista** de esos 6
sliders, calculada en el momento en que hace falta (render, plantillas de
escena, etc.). Estas proyecciones **no se persisten** en `SaveState` y **no se
editan** por separado del slider que las genera: nunca hay que migrar un
guardado antiguo porque cambie el bucketing, solo cuando cambian los propios
sliders (como pasó en v1→v2 con `kindness`).

Implementado en `src/core/personality-derived.ts` (TS puro, sin Phaser):
- `personalityToTags(p): string[]` — hasta 3 etiquetas (p.ej. `"enérgica"`,
  `"impaciente"`) para los rasgos en banda extrema (alto ≥ 70, bajo ≤ 30),
  ordenadas por distancia a 50 (desempate: orden fijo de `PERSONALITY_KEYS`).
  Si ningún rasgo es extremo, devuelve `["equilibrada"]`. `romanticism` bajo no
  genera tag propia (no hay opuesto natural a "romántica").
- `personalityCategory(p): PersonalityCategory` — una de 5 familias amplias
  (`"Equilibrada"`, `"Sociable"`, `"Reservada"`, `"Cariñosa"`, `"Excéntrica"`).
  Si ningún rasgo está en banda extrema, devuelve `"Equilibrada"`; si hay al
  menos uno extremo, calcula scores 0–200 a partir de los sliders relevantes y
  en empate exacto gana la familia que aparece antes en esa lista fija. Solo
  para identidad visual rápida (acento de color en la UI), nunca dato editable.
- `personalityExpression(p): string` — hint mínimo de pose/idle
  (`"animada"`, `"sonriente"`, `"seria"`, `"peculiar"`, `"neutral"`) por
  prioridad fija sobre el rasgo dominante.

Implementado: `SceneIntent` (`src/events/types.ts`) no lleva un campo `tone`
suelto - el texto de escena (`sceneTextFor`, `src/dialogue/scene-texts.ts`)
consulta `personalityToTags` directamente sobre el residente en el momento de
renderizar, no un valor guardado en la escena.

## Relationship
Implementado en `src/relationships/` (F4). Par siempre normalizado `a < b`
(orden lexicográfico de ids, ver `orderedPair`) para que una relación tenga una
única clave sin importar quién la consulta primero. **No tiene `trust`**: el
diseño de F4 lo descartó (deliberado, no un olvido) a favor de solo
`friendship`/`tension`/`romance` + `status` como máquina de estados explícita.

```json
{
  "a": "resident_lina",
  "b": "resident_nico",
  "friendship": 52,
  "tension": 12,
  "romance": 0,
  "status": "acquaintances",
  "lastInteractionAtMs": 1783000000000
}
```
Estados V1 (`RelationshipStatus`, `src/relationships/status.ts`):
```
strangers → acquaintances → friends → besties
                  ↓                      ↓
              fighting              dating → partners
```
`status` solo cambia por una acción resuelta (`applyRelationshipAction`),
nunca por cruce pasivo de umbral. Una relación inexistente en `SaveState`
equivale a `strangers` por defecto (`getRelationship`) - no hay que
inicializar entradas para cada par de residentes.

**En V1**: amistad, tensión, **romance y matrimonio/convivencia** (`dating`/`partners`).
**Fuera de V1**: **bebés** (y descendencia). Se retoma tras validar el core loop.

### Romance individual vs. `chemistry` de pareja (implementado en F4)

`Personality.romanticism` es una propensión **individual**: cuánto se enamora
en general un residente, sin conocer a nadie en concreto. Es y sigue siendo un
slider normal de `Personality` (persistido, editable con el resto de rasgos).

La **afinidad entre dos residentes concretos** es un valor `chemistry`
distinto, calculado a partir de: `romanticism` de ambos residentes +
compatibilidad de sus personalidades + el estado actual de la relación
(`friendship`, `tension`, `status`, etc.). `chemistry` **no es un campo
editable** ni un dato guardado aparte de sus insumos: es, igual que las tags
de personalidad, una función pura `chemistry(a: Personality, b: Personality,
relationship: Relationship): number` (`src/relationships/chemistry.ts`),
recalculable en cualquier momento a partir del `SaveState` existente - nunca
se persiste.

## Item (no implementado - fuera de F1-F5)
Plan para un futuro sistema de objetos/inventario; `src/data/foods.ts` (F1-F5) ya
cubre el caso `food` de forma concreta (ver "Isla y progreso" más abajo). El resto
de tipos siguen siendo diseño, no código:
```json
{
  "id": "guitar_01",
  "type": "special_item",
  "name": "Guitarra",
  "effects": { "unlocks_events": ["plays_song", "annoys_neighbor"], "mood": 5 }
}
```
Tipos: `food`, `clothing`, `decoration`, `special_item`, `catchphrase`, `quirk`.

## Isla y progreso (implementado en F5)
Catálogo fijo de 5 zonas (`src/data/zones.ts`, `ZONE_CATALOG`), desbloqueadas por
número de residentes (no hay más zonas planeadas para V1 - añadir una nueva es
editar el catálogo, no rediseñar el sistema):
```
0 residentes → residential (siempre desbloqueada)
1 residente  → food_shop
3 residentes → clothes_shop
5 residentes → plaza
8 residentes → workshop
```
Cada zona recién desbloqueada dispara **una vez** una escena `zone_opening`
(protagonizada por el residente más antiguo) cuando el jugador la resuelve;
`celebratedZoneIds` (separado de `unlockedZoneIds`) evita repetirla.

### Economía
`wallet: { coins: number }` - se ganan monedas al resolver cualquier escena
(`coinsForScene`: 10 si la escena era urgente, 5 si no) y se gastan comprando
comida. La comida ya no es gratis: cada `FoodItem` tiene `price` (`src/data/foods.json`)
y solo puede darse a un residente si hay stock en `pantry: PantryEntry[]`
(`{ itemId, qty }[]`) - comprar (`SaveSystem.buyFood`) añade stock; dar comida
(`SaveSystem.giveFoodFromPantry` o resolver una escena `hungry`) lo consume.

## Memoria / eventos resumidos (no implementado - plan F6, capa de IA)
```json
{ "memory": "Leo y Gala tuvieron una discusión por ruido.", "tag": "tension_vecinal", "importance": 3 }
```
Encaja con el `MemorySummarizer` opcional de F6; hasta entonces `sceneLog` (cap 20,
sin resumir) es la única memoria de eventos pasados.

## Fixtures reales (`src/data/`)
`foods.json` + `foods.ts` (F1-F5), `quirks.ts` (F3), `zones.ts` (F5). Los nombres
`residents_mock.json`/`items.json`/`events.json`/`dialogue_templates.json` del plan
original no se llegaron a crear con esos nombres; el contenido equivalente vive en
los archivos de arriba.

## Guardado
`SaveState` versionado (`schemaVersion`). Al cargar, aplicar migraciones incrementales si
la versión del guardado es menor; si es **mayor** que la actual, no degradar (guard de
F3.2). Un `save_migration_checker` en `tools/` valida compatibilidad.

Historial y plan de versiones (diseño completo en `engine_design_f3-f5.md` §1):
| v | Fase | Añade |
|---|---|---|
| 2 | F1.1 | `kindness` en `Personality` (backfill con default) |
| 3 | F2.3 | needs normalizadas + `needsUpdatedAtMs` |
| 4 | F3 | `sceneLog` (cap 20, entradas `{sceneType, participants[], atMs}`) + `stats.scenesResolved` |
| 5 | F4 | `relationships: Relationship[]` (par normalizado `a<b`; `status` persistido; sin `trust`) |
| 6 | F5.2 | `wallet.coins` + `unlockedZoneIds` + `pantry` (semilla: 50 coins + despensa inicial; `unlockedZoneIds` calculado retroactivamente según residentes ya existentes) |
| **7** | **F5.3** | `celebratedZoneIds` (semilla retroactiva = `unlockedZoneIds`, para no disparar celebraciones por progreso previo a la feature) |

Regla que decide qué se persiste: **derivado si no tiene memoria; persistido si una
transición depende de la historia**. Por eso `chemistry`/tags/escenas activas nunca se
guardan, y `sceneLog`/`stats`/`status`/`wallet` sí.

## Principio: las tags/categoría de personalidad se derivan de los sliders (no se escriben a mano)

Ver la sección "Personalidad: 6 sliders, única fuente de verdad" más arriba y
`docs/adr/0004-personality-model.md`. `personalityToTags`/`personalityCategory`/
`personalityExpression` (`src/core/personality-derived.ts`) ya están
implementadas desde Fase 1.2 y son la única forma permitida de obtener
tags/categoría/expresión de un residente; nunca se escriben o editan sueltas
por residente ni se persisten en `SaveState`.
