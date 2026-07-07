# ADR 0005 — Motor F3-F5: Event Engine, relaciones y progreso diseñados juntos

- **Estado:** aceptada
- **Fecha:** 2026-07-07
- **Autoría:** diseño por Fable 5 (sesión interactiva); construcción prevista por
  Sonnet/Codex por subfases. Diseño completo en `docs/engine_design_f3-f5.md`.

## Contexto
Cada fase anterior subió el esquema de guardado sobre la marcha (v1→v2→v3). Antes de
construir F3 (Event Engine) se diseñan juntas F3+F4+F5 para que el modelo de datos sea
coherente, las migraciones previsibles (v4/v5/v6) y F4/F5 no obliguen a reescribir F3.

## Decisiones clave

1. **Regla derivado-vs-persistido**: *derivado si no tiene memoria; persistido si una
   transición depende de la historia*. Generaliza el ADR 0004 y decide cada campo nuevo
   (chemistry pura; sceneLog/stats/status/wallet persistidos).
2. **`SceneIntent` efímero** — se recalcula al abrir; nunca se guarda. Sin `tone` (deriva
   de `personalityToTags`), sin `result_options` (la acción del jugador es la resolución).
3. **`participants: ResidentId[]` desde F3** aunque F3 use 1: el `sceneLog` persistido
   nace con la forma que F4 necesita (cooldowns por conjunto de participantes) y el motor
   no cambia de contrato al llegar las escenas sociales.
4. **Cooldown duro** con una única excepción (hambre urgente ≥ 90), no penalización
   blanda en el score. Score = `urgency × pesoTipo`, quirk con score fijo 35.
5. **`SaveState` v4 = `sceneLog` (cap 20) + `stats.scenesResolved`**. El contador entra
   ya porque no es reconstruible a posteriori y F5 lo usa para desbloqueos.
6. **F4**: `Relationship` persiste `{a<b, friendship, tension, romance, status,
   lastInteractionAtMs}`; `status` con transiciones SOLO por escena resuelta (histéresis);
   `chemistry` es función pura no persistida. Sin `trust`, sin historia textual.
7. **F5**: economía mínima (ganar resolviendo escenas, gastar en tienda/regalos);
   `wallet + unlockedZoneIds + pantry` en v6; zonas como catálogo fijo evaluado al abrir.

## Alternativas descartadas

| Alternativa | Por qué se descartó |
|---|---|
| Motor de reglas data-driven (JSON de condiciones) | Indirection sin beneficio con 5-12 tipos de escena; las reglas son funciones TS con nombre y tests (patrón `needs.ts`) |
| Persistir la escena activa | Estado rancio tras cambios de needs/reloj; recalcular al abrir es idempotente y ahorra una migración |
| `residentId` único en `SceneIntent`/log y migrar en F4 | Migración v4→v5 del log + refactor de firmas del motor, evitables por el coste de un array de 1 elemento |
| `trust` como eje separado de relación | Colineal con `friendship` a escala ≤12 residentes; cada campo persistido es deuda de migración |
| `status` derivado de umbrales de friendship/romance | Ser pareja es un hito con histéresis, no un bucketing: derivado oscilaría al fluctuar los valores; se persiste y solo transiciona por evento |
| Penalización blanda por repetición en el score | Inexplicable al depurar ("¿por qué salió esto?"); el cooldown duro es binario, testeable y suficiente |
| Contadores/wallet pospuestos a F5 sin `stats` en v4 | `scenesResolved` no es reconstruible; una línea en v4 compra histórico real desde F3 |

## Consecuencias
- F3 construible en días (4 subfases, ver diseño §8); F4/F5 solo añaden detectores,
  campos con default y una firma (`resolveScene` devuelve `reward` en F5).
- Nuevos guards obligatorios en F3.2: no degradar guardados con `schemaVersion` mayor a
  la actual y clamp de timestamps futuros (reloj del dispositivo cambiado).
- `docs/scene_intent_spec.md` se reescribe como contrato V1 real (la versión anterior
  era aspiracional y contradecía el ADR 0004).
