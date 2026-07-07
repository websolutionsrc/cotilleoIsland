# Modelo de datos — Cotilleo Island

Datos estructurados desde el principio. TypeScript + JSON. Persistencia local en
**IndexedDB** (localForage), con esquema **versionado** y migraciones. Export/import
manual en JSON. Ids estables y legibles (`resident_lina`, `guitar_01`).

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
`kindness` (amabilidad/calidez) se añadió en Fase 1.1: eje que en fases futuras (diálogo,
Event Engine) disparará escenas de conflicto/ayuda. Por ahora es solo dato, sin lógica asociada.

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

`docs/scene_intent_spec.md` usa un campo libre `tone` en sus ejemplos de
`SceneIntent`; cuando la Fase 3 (diálogo) lo conecte a datos reales, debe
alimentarse de `personalityToTags`/`personalityCategory`, no de tags escritas a
mano por residente.

## Relationship
```json
{
  "a": "resident_lina",
  "b": "resident_nico",
  "friendship": 52,
  "trust": 34,
  "tension": 12,
  "romantic_interest": 0,
  "status": "acquaintances",
  "last_interaction": "se conocieron en la plaza"
}
```
Estados V1 (`status`):
```
Desconocidos → Conocidos → Amigos → Mejores amigos
                     ↓                 ↓
               Tensión / pelea    Pareja → Convivencia / matrimonio
```
**En V1**: amistad, tensión, **romance y matrimonio/convivencia**.
**Fuera de V1**: **bebés** (y descendencia). Se retoma tras validar el core loop.

### Romance individual vs. `chemistry` de pareja (plan Fase 4)

`Personality.romanticism` es una propensión **individual**: cuánto se enamora
en general un residente, sin conocer a nadie en concreto. Es y sigue siendo un
slider normal de `Personality` (persistido, editable con el resto de rasgos).

La **afinidad entre dos residentes concretos** (a quién le gusta quién, y
cuánto) es un concepto distinto que se implementará en **Fase 4** como un valor
`chemistry` calculado a partir de: `romanticism` de ambos residentes +
compatibilidad de sus personalidades (p.ej. categorías/tags complementarias) +
el estado actual de la relación (`friendship`, `tension`, `status`, etc.).
`chemistry` **no será un campo editable** ni un dato independiente guardado
aparte de sus insumos: será, igual que las tags de personalidad, una función
pura `chemistry(a: Personality, b: Personality, relationship: Relationship):
number` (nombre/forma exactos a definir en Fase 4), recalculable en cualquier
momento a partir del `SaveState` existente. Hasta Fase 4, `romantic_interest`
en `Relationship` sigue siendo el único dato de afinidad, sin cálculo
automático.

## Item
```json
{
  "id": "guitar_01",
  "type": "special_item",
  "name": "Guitarra",
  "effects": { "unlocks_events": ["plays_song", "annoys_neighbor"], "mood": 5 }
}
```
Tipos: `food`, `clothing`, `decoration`, `special_item`, `catchphrase`, `quirk`.

## Isla y progreso
Zonas V1: residencial, tienda de comida, tienda de ropa, taller, plaza, ayuntamiento.
Progresión ejemplo:
```
1 residente  → tienda de comida
3 residentes → tienda de ropa
5 residentes → plaza
8 residentes → taller
10 residentes → expansión de casas
```

## Memoria / eventos resumidos
```json
{ "memory": "Leo y Gala tuvieron una discusión por ruido.", "tag": "tension_vecinal", "importance": 3 }
```

## Fixtures iniciales (`src/data/`)
`residents_mock.json`, `items.json`, `events.json`, `dialogue_templates.json`.

## Guardado
`SaveState` versionado (`schemaVersion`). Al cargar, aplicar migraciones si la versión
del guardado es menor. Un `save_migration_checker` en `tools/` valida compatibilidad.
Versión actual: **2** (v1 → v2: se añadió `kindness` a `Personality`; los guardados v1
se rellenan con el valor por defecto al migrar).

## Principio: las tags/categoría de personalidad se derivan de los sliders (no se escriben a mano)

Ver la sección "Personalidad: 6 sliders, única fuente de verdad" más arriba y
`docs/adr/0004-personality-model.md`. `personalityToTags`/`personalityCategory`/
`personalityExpression` (`src/core/personality-derived.ts`) ya están
implementadas desde Fase 1.2 y son la única forma permitida de obtener
tags/categoría/expresión de un residente; nunca se escriben o editan sueltas
por residente ni se persisten en `SaveState`.
