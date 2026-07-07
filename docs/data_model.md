# Modelo de datos — Cotilleo Island

Datos estructurados desde el principio. JSON local en V1 (SQLite al crecer). Ids
estables y legibles (`resident_lina`, `guitar_01`).

## Resident
```json
{
  "id": "resident_lina",
  "name": "Lina",
  "avatar": { "face": "round_01", "hair": "short_03", "eyes": "happy_02", "mouth": "small_01", "color": "warm_02" },
  "personality": { "energy": 70, "sociability": 80, "patience": 35, "weirdness": 60, "romanticism": 40 }
}
```
Necesidades V1 (0–100): `hunger`, `mood`, `energy`, `social_need`, `boredom`.

## Relationship
```json
{
  "a": "resident_lina",
  "b": "resident_nico",
  "friendship": 52,
  "trust": 34,
  "tension": 12,
  "romantic_interest": 0,
  "last_interaction": "se conocieron en la plaza"
}
```
Estados V1: `Desconocidos → Conocidos → Amigos → Mejores amigos`, con rama
`Tensión / pelea`. Romance, convivencia, matrimonio y bebés quedan fuera de la primera
V1 salvo que el prototipo base ya sea divertido.

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

## Fixtures iniciales sugeridos
`Assets/Data/`: `residents_mock.json`, `items.json`, `events.json`, `dialogue_templates.json`.
