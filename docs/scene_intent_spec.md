# SceneIntent — especificación (contrato V1 real)

> Reescrita en el diseño F3-F5 (`engine_design_f3-f5.md`, ADR 0005). La versión anterior
> de este doc era aspiracional (campos `tone`, `result_options`, `suggested_item`) y
> contradecía el ADR 0004; esta es la que implementa el código.

El juego **no guarda diálogos ni escenas: guarda hechos** (needs, sliders, log,
relaciones). Una `SceneIntent` es la **propuesta efímera** que el Event Engine recalcula
al abrir la isla o tras una acción: qué pasa, a quién, por qué y con qué urgencia. El
render (plantilla en V1, IA en V2) la convierte en texto; la acción del jugador la
resuelve y ahí sí se persiste el resultado (needs, log, stats).

## Contrato (F3)
```ts
type SceneType = "hungry" | "tired" | "bored" | "lonely" | "quirk";
// F4 amplía: "meet" | "chat" | "argument" | "reconcile" | "flirt" | "confess" | "propose"
// F5 amplía: "zone_opening"

interface SceneIntent {
  sceneType: SceneType;
  participants: ResidentId[];   // [0] = protagonista; F3 usa 1; F4 usará 2
  cause:
    | { kind: "need"; need: keyof Needs; value: number }
    | { kind: "quirk"; quirkId: string };
  urgency: number;              // 0-100 normalizada (para energy: 100 - value)
  createdAtMs: number;
}
```

## Qué NO lleva (deliberado)
- **`tone`**: el registro emocional se deriva en render con `personalityToTags`/`mood`
  (ADR 0004: los sliders son la única fuente de verdad; nada de tags escritas a mano).
- **`result_options`**: en V1 la acción del jugador ES la resolución (dar comida, dejar
  descansar, charlar…); no hay máquina de estados de escena.
- **`location` / `suggested_item`**: sin aporte en F3 (una sola casa; el "antojo" es
  flavor de plantilla, no contrato).

## Ciclo de vida
```
abrir isla → decay (F2) → detectores (needs+personality, RNG inyectado)
→ filtro de cooldown (sceneLog persistido) → score → 1 escena/residente (máx 3)
→ render por plantilla (scene-texts) → jugador resuelve
→ efectos + sceneLog + stats en UNA escritura de SaveState
```
La intent **nunca se persiste** — solo el `SceneLogEntry` (`{sceneType, participants,
atMs}`, cap 20) que alimenta los cooldowns entre sesiones.

## Evolución
```
V1 (F3):  SceneIntent → plantilla         (este contrato)
F4:       + escenas de 2 participantes    (misma forma; crece la unión y los detectores)
V2 (F6):  SceneIntent minimizado → IA → texto validado → fallback a plantilla
V3:       SceneIntent → voz / animación
```
Regla de oro sin cambios: la escena se decide **por reglas**; la IA (si existe) solo
convierte la intent minimizada en texto validado. Nunca se envía el estado completo del
juego. Ver `ai_usage_policy.md`.
