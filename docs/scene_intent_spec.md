# SceneIntent — especificación

El juego **no guarda diálogos, guarda intenciones de escena**. Una `SceneIntent`
representa: qué ocurre, quién participa, dónde, por qué, qué opciones tiene el jugador,
qué consecuencia puede tener y qué tono. Es el contrato entre el motor de reglas y el
renderizado (plantilla en V1, IA en V2).

## Evolución
```
V1: SceneIntent → plantilla
V2: SceneIntent → IA → diálogo personalizado
V3: SceneIntent → voz / animación
```

## Ejemplos

Residente con hambre:
```json
{
  "scene_type": "resident_hungry",
  "main_character": "resident_lina",
  "location": "home",
  "need": "hunger",
  "suggested_item": "sushi",
  "tone": "dramatic",
  "result_options": ["liked_food", "disliked_food", "neutral_food"]
}
```

Quiere amistad:
```json
{
  "scene_type": "wants_friendship",
  "main_character": "resident_lina",
  "target_character": "resident_nico",
  "reason": "both_are_social",
  "tone": "shy",
  "result": "relationship_candidate"
}
```

## Campos
- `scene_type` (string): tipo de escena (dispara la plantilla/prompt).
- `main_character`, `target_character` (resident id).
- `location`, `need`, `suggested_item`, `reason`: contexto mínimo.
- `tone`: registro emocional (dramatic, shy, comedia ligera...).
- `result_options` / `result`: consecuencias posibles que el sistema aplicará.

## Regla de oro
La escena se decide **por reglas**. La IA (si existe) solo convierte la `SceneIntent`
minimizada en texto, validado y con fallback a plantilla. Nunca se envía el estado
completo del juego. Ver [`ai_usage_policy.md`](ai_usage_policy.md).
