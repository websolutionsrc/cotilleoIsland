# AGENTS.md — Cotilleo Island

Reglas para cualquier agente de IA que trabaje en este repo (Claude Code, etc.).

## Modo de trabajo actual
Constructor unico por tarea/rama, coordinado por el humano y seleccionado entre las
dos lineas de construccion disponibles: **Claude** (Fable/Opus/Sonnet/Haiku) y
**GPT-5.6** (Sol/Terra/Luna). Claude no es una linea de revision opcional: Fable
arquitecta, Opus coordina e integra, Sonnet construye y Haiku produce volumen; la
linea GPT-5.6 tambien disena, coordina, construye y produce contenido segun el rol.

El comite dual completo esta **en reserva** hasta validar el core loop y tener volumen
de contenido. Mientras tanto, una tarea tiene un solo owner y no se montan pipelines
de varios modelos ni se tocan los mismos archivos en paralelo. Reparto detallado:
`40-Proyectos/CotilleoIsland/CotilleoIsland - Equipo de modelos LLM.md` en la boveda.

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

## Planificación y uso de modelos
- Antes de generar o ejecutar el plan de una fase/subfase, separar siempre:
  **diseño/rediseño**, **código** y **validación**.
- Antes de lanzar la tarea, recomendar modelo y grado de razonamiento (`low`,
  `medium`, `high` o equivalente en la herramienta usada), con una justificación breve.
- Decidir explícitamente si usar subagentes/paralelismo. Por defecto, no usarlos en
  tareas pequeñas, muy acopladas o con archivos compartidos.
- Cada subfase debe tener criterio de aceptación, archivos permitidos/prohibidos y
  comandos de verificación esperados.
- Optimizar recursos: modelos fuertes/razonamiento alto para arquitectura o decisiones
  difíciles; razonamiento medio para core puro acotado; modelos pequeños/rápidos para
  contenido repetible, fixtures y transformaciones simples.

## Operational language and logs
- From v01.00.F3 onward, new operational logs, model-trace notes, commit messages/bodies,
  validation summaries, implementation summaries, new tests and new technical docs should
  be written in English.
- Prefer ASCII-safe operational text: avoid accents, smart punctuation and special
  symbols in handoffs/logs unless they are part of game-facing copy or an existing
  domain identifier.
- Spanish user-facing game copy can remain Spanish when intentional.
- Do not rename existing domain identifiers such as `sceneLog`; this rule is about
  human-written operational text, not persisted data shapes.
- Do not mass-translate historical Spanish docs. Apply this rule to new work and to
  nearby text only when it is already being touched for the current task.

## Trazabilidad de modelos en commits
Cada commit debe dejar constancia de qué modelo(s) hicieron el trabajo, para poder
auditar después qué modelo tomó cada decisión:
- El trailer `Co-Authored-By: Claude <Modelo> <noreply@anthropic.com>` identifica al
  modelo que **orquestó/revisó y ejecutó el commit** (el modelo del chat interactivo en
  ese momento — puede cambiar a lo largo del proyecto; no usar un valor fijo).
- Si el código lo construyó un **subagente de otro modelo** (p.ej. Sonnet construyendo
  mientras el chat lo dirige Fable/Opus), el cuerpo del commit debe decirlo explícito:
  "Construido por subagente <Modelo>, revisado e integrado por <Modelo orquestador>".
- Si una tarea de **diseño** (arquitectura, ADR) la hizo un modelo distinto al que
  luego construyó el código, nombrar ambos en el cuerpo del commit o del ADR.

## Cómo pedir tareas
- Buenas: "Implementa `ResidentState` + un test unitario. No toques UI ni SaveSystem."
- Malas: "Hazme el juego entero", "Mete IA a los personajes", "Refactoriza todo".
- Una tarea = una rama. Contexto mínimo: objetivo, archivos permitidos, archivos
  prohibidos, contrato entrada/salida, tests esperados, criterio de aceptación.
