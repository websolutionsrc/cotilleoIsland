# AGENTS.md — Cotilleo Island

Reglas para cualquier agente de IA que trabaje en este repo (Claude Code, Codex, etc.).

## Principios de producto
- Juego **local-first**. No añadir backend, cuentas ni red sin issue explícito.
- **Sin IA en el core de simulación.** El motor de reglas decide el estado; la IA solo
  expresa o sugiere, siempre detrás de una interfaz y con *fallback* sin IA.
- Cada feature debe funcionar **sin IA**.
- V1 no incluye: multijugador, red social, editor facial avanzado, IA conversacional
  libre, backend, voces generadas, mundo abierto, 100 residentes, tienda pública.
- Priorizar claridad sobre abstracción. Validar antes de automatizar; optimizar al final.

## Reglas de código
- C# claro y modular. Separar **datos / lógica / UI**.
- Evitar singletons y estado global oculto salvo justificación.
- No hardcodear escenas si pueden ser ScriptableObjects o JSON.
- Validar inputs de usuario (nombres, muletillas, imports): longitud, caracteres, sanitización.
- Añadir tests para lógica pura. Cada cambio debe compilar. Cada sistema con datos de ejemplo.
- No introducir paquetes sin justificación. No cambiar arquitectura sin ADR (`docs/adr/`).

## Restricciones de IA (cuando exista la capa)
- Nunca enviar el estado completo del juego: solo `SceneIntent` **minimizado**
  (`scene_type` + personajes implicados + relación resumida + tono + límite de salida).
- Salida **estructurada (JSON)** si afecta al sistema; **validar esquema y longitud**.
- Validar que la IA no inventa personajes ni cambia estado crítico.
- *Fallback* a plantilla si falla. Rate limit por sesión/día. Timeout corto.
- Registrar coste y modelo usado; caché de diálogos.

## Ownership de agentes
- **Sonnet 5 / Claude Code** — core del repo, integración, coherencia global.
- **GPT-5.3-Codex** — módulos aislados, tests, fixtures, herramientas, review. (Core solo en rama aparte con review.)
- **Haiku / GPT-5.4 mini / nano** — contenido, JSON, clasificación. No deciden arquitectura.
- **Opus 4.8** — problemas técnicos difíciles, refactors críticos (EventEngine, SaveSystem, RelationshipGraph).
- **Fable 5 / GPT-5.5 Pro** — decisiones de alto impacto, no código rutinario.

## Cómo pedir tareas
- Buenas: "Implementa `ResidentState` + un test unitario. No toques UI ni SaveSystem."
- Malas: "Hazme el juego entero", "Mete IA a los personajes", "Refactoriza todo".
- Una tarea = una rama = un agente. Contexto mínimo: objetivo, archivos permitidos,
  archivos prohibidos, contrato entrada/salida, tests esperados, criterio de aceptación.
