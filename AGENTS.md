# AGENTS.md — Cotilleo Island

Reglas para cualquier agente de IA que trabaje en este repo (Claude Code, etc.).

## Modo de trabajo actual
Constructor único: **Claude Code**, coordinado por el humano. El comité multi-modelo
(Fable/Opus/Sonnet/Haiku + GPT) está **en reserva** hasta validar el core loop y tener
volumen de contenido. No montar comités ni pipelines de varios modelos todavía.

## Principios de producto
- Juego **local-first**. No añadir backend, cuentas ni red sin issue explícito.
- **Sin IA en el core de simulación.** El motor de reglas decide el estado; la IA solo
  expresa o sugiere, siempre detrás de una interfaz y con *fallback* sin IA.
- Cada feature debe funcionar **sin IA**.
- **V1 incluye**: creación de residentes, isla + casas, necesidades, objetos/regalos,
  relaciones (amistad, tensión, **romance y matrimonio/convivencia**), eventos por
  reglas, diálogo por plantillas, niveles/desbloqueos, guardado local.
- **V1 NO incluye**: **bebés**, multijugador, red social, editor facial avanzado, IA
  conversacional libre, backend, voces generadas, mundo abierto, 100 residentes, tienda pública.
- Priorizar claridad sobre abstracción. Validar antes de automatizar; optimizar al final.

## Stack y reglas de código
- **TypeScript** estricto (`strict: true`). Vite + Phaser 3. Guardado en IndexedDB (localForage).
- Separar **datos / lógica / render (UI)**. Lógica de simulación **pura y testeable**,
  independiente de Phaser (Phaser solo en la capa de render/escenas).
- Evitar estado global mutable oculto. Preferir objetos de datos explícitos.
- No hardcodear escenas/contenido si pueden ser datos (`src/data/*.json`).
- Validar inputs de usuario (nombres, muletillas, imports): longitud, caracteres, sanitización.
- Tests (Vitest) para lógica pura. Cada cambio debe compilar (`tsc`/`vite build`). Datos de ejemplo por sistema.
- No introducir dependencias sin justificación. No cambiar arquitectura sin ADR (`docs/adr/`).

## Restricciones de IA (cuando exista la capa)
- Nunca enviar el estado completo del juego: solo `SceneIntent` **minimizado**
  (`scene_type` + personajes implicados + relación resumida + tono + límite de salida).
- Salida **estructurada (JSON)** si afecta al sistema; **validar esquema y longitud**.
- Validar que la IA no inventa personajes ni cambia estado crítico.
- *Fallback* a plantilla si falla. Rate limit por sesión/día. Timeout corto.
- Registrar coste y modelo usado; caché de diálogos.

## Fuente de verdad
Las **specs técnicas viven en este repo** (`docs/`). La bóveda Obsidian
(`40-Proyectos/CotilleoIsland/`) guarda objetivo, estado y roadmap, y apunta aquí.

## Cómo pedir tareas
- Buenas: "Implementa `ResidentState` + un test unitario. No toques UI ni SaveSystem."
- Malas: "Hazme el juego entero", "Mete IA a los personajes", "Refactoriza todo".
- Una tarea = una rama. Contexto mínimo: objetivo, archivos permitidos, archivos
  prohibidos, contrato entrada/salida, tests esperados, criterio de aceptación.
