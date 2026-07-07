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

## Principio: las tags de escena se derivan de los sliders (no se escriben a mano)

`docs/scene_intent_spec.md` usa un campo libre `tone` (p.ej. `"dramatic"`, `"shy"`) en sus
ejemplos de `SceneIntent`. Eso es hoy una duplicidad en potencia respecto a los sliders
numéricos de `Personality`: si alguien empieza a asignar tags de personalidad sueltas por
residente (a mano, por escena), la personalidad tendría dos fuentes de verdad divergentes
(los sliders y las tags de texto).

Regla para Fase 3 (diálogo): las tags/tono de personalidad usados por escenas y plantillas
**deben derivarse siempre** de los sliders mediante una única función determinista,
`personalityToTags(personality: Personality): string[]` (o similar), nunca escribirse o
editarse sueltas por residente. Los sliders (`Personality`) son la única fuente de verdad;
`personalityToTags` es una proyección pura y determinista de esos sliders, no un dato
independiente. Esta tarea **no** implementa esa función — solo documenta el contrato para
cuando se aborde Fase 3.
