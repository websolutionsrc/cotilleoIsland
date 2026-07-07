# ADR 0003 — IA como capa de expresión, no como motor

- **Estado:** aceptada
- **Fecha:** 2026-07-07

## Contexto
La tentación es "hacer Tomodachi Life con IA". El riesgo es que la IA se vuelva el motor,
con coste, latencia, imprevisibilidad y difícil testeo.

## Decisión
El **motor de reglas decide el estado**; la IA solo **expresa** ese estado (diálogos,
narrador, resúmenes, muletillas), **siempre detrás de interfaces** y con **fallback** sin IA.
```
Reglas → SceneIntent → IA opcional → texto validado → escena
```

## Motivos
- Determinismo y testeabilidad del core.
- La IA debe ser reemplazable por plantillas.
- Control de coste/latencia y privacidad.

## Consecuencias
- Todo consumo de IA usa `SceneIntent` minimizado, salida JSON validada, caché,
  presupuesto por sesión y rate limit (ver `ai_usage_policy.md`).
- `IEventSuggestor` propone, `EventEngine` valida, `GameState` aplica.
- Sin agentes autónomos dentro del juego en V1/MVP.
