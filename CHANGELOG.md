# Changelog — Cotilleo Island

Formato: entradas por fase/hito. Fechas en `YYYY-MM-DD`.

## [Fase 3 — diseño] — 2026-07-07

### Añadido (solo documentación; sin código)
- `docs/engine_design_f3-f5.md`: arquitectura conjunta del motor (F3 Event Engine,
  F4 Relationships, F5 Isla/progreso) con modelo de datos unificado (plan de schema
  v4/v5/v6), invariantes, plan de evolución honesto, subfases F3.1–F3.4 y anti-scope.
- `docs/adr/0005-event-engine-f3-f5.md`: decisiones (participants[] desde F3, cooldown
  duro, SceneIntent efímera, status persistido vs chemistry pura, stats en v4) y
  alternativas descartadas.
- `docs/scene_intent_spec.md` reescrita como contrato V1 real (la anterior era
  aspiracional y contradecía el ADR 0004: fuera `tone`/`result_options`).
- `docs/architecture.md`/`docs/data_model.md`/`CODEMAP.md` alineados (tabla de versiones
  de guardado v2→v6; corregida la inconsistencia "versión actual: 2").
- `AGENTS.md`: regla de trazabilidad de modelos en commits (trailer = orquestador
  actual; el cuerpo nombra al constructor si fue un subagente distinto).

### Decisiones
- Diseño por Fable 5 (sesión interactiva); construcción prevista: Sonnet/Codex.
- Regla que ordena el modelo de datos: derivado si no tiene memoria; persistido si una
  transición depende de la historia.

## [Fase 1.2] — 2026-07-07

### Añadido
- **Core** (`src/core/personality-derived.ts`, nuevo, TS puro sin Phaser): implementa las
  proyecciones puras y deterministas de los 6 sliders de `Personality` que Fase 1.1 dejó
  documentadas como contrato pendiente:
  - `personalityToTags(p)`: hasta 3 tags por umbrales fijos (alto ≥ 70, bajo ≤ 30),
    ordenadas por distancia a 50 (desempate: orden fijo de `PERSONALITY_KEYS`); si ningún
    rasgo es extremo devuelve `["equilibrada"]`. `romanticism` bajo no genera tag propia.
  - `personalityCategory(p)`: clasifica en 1 de 4 familias amplias (`Sociable`,
    `Reservada`, `Cariñosa`, `Excéntrica`) por score comparable 0–200 por familia; empate
    exacto lo resuelve el orden fijo de esa lista (gana `Sociable`).
  - `personalityExpression(p)`: hint de pose/idle (`"animada"`, `"sonriente"`, `"seria"`,
    `"peculiar"`, `"neutral"`) por prioridad fija sobre el rasgo dominante.
  - Reexportado desde el barrel `src/core/index.ts`.
- **UI** (`src/ui/island-scene.ts`): muestra la categoría y las tags derivadas junto al
  resumen de personalidad, y usa `personalityExpression`/`personalityCategory` para variar
  el color del nombre y del trazo de la "casa" placeholder (recalculado en cada
  `renderResident`, sigue siendo placeholder sin sprites). El panel de edición
  (`resident-panel.ts`) no cambia: sigue editando solo los 6 sliders + nombre.
- Tests (Vitest, `tests/personality-derived.test.ts`): casos extremos, equilibrados y de
  desempate para las tres funciones.
- `docs/adr/0004-personality-model.md` (nuevo ADR): fija el modelo — sliders como única
  fuente de verdad, tags/categoría/expresión como proyecciones puras no persistidas, y el
  romance dividido en `romanticism` (individual) + `chemistry` de pareja (plan Fase 4).
- `docs/data_model.md`: nueva sección "Personalidad: 6 sliders, única fuente de verdad" y
  sección "Romance individual vs. `chemistry` de pareja (plan Fase 4)" en `Relationship`.
- `docs/architecture.md`: subsistema de personalidad (sliders → tags/categoría/expresión).

### Decisiones
- **Ningún cambio de esquema de guardado**: `CURRENT_SCHEMA_VERSION` sigue en **2**, sin
  migración nueva. Tags/categoría/expresión nunca se guardan en `SaveState`; se recalculan
  siempre desde los sliders persistidos.
- `chemistry` (afinidad romántica por pareja) **no se implementa** en esta fase: queda como
  plan documentado para Fase 4 (`src/relationships/`, hoy inexistente).

## [Fase 1.1] — 2026-07-07

### Añadido
- **Core** (`src/core/personality.ts`): nuevo rasgo `kindness` (amabilidad/calidez,
  0–100) en `Personality` y `PERSONALITY_KEYS`; default `50` en `DEFAULT_PERSONALITY`.
  Cubierto automáticamente por `validatePersonality` (itera `PERSONALITY_KEYS`).
- **UI**: nuevo slider "Amabilidad" en el panel de edición (`resident-panel.ts`) y en el
  resumen de personalidad de `IslandScene` (`island-scene.ts`).
- **Save**: `CURRENT_SCHEMA_VERSION` sube a **2**. Nuevo paso de migración incremental
  v1 → v2 en `migrateSaveState` (`save-state.ts`) que rellena `kindness` con el valor por
  defecto en cualquier residente guardado que no lo tenga (guardados v1). El paso v0 → v1
  se mantiene sin cambios; las migraciones siguen siendo incrementales (nunca se salta de
  v0 a v2 directamente). Test añadido en `tests/save-system.test.ts`.
- Documentado en `docs/data_model.md` (y una línea en `docs/architecture.md`) el principio
  para Fase 3: las tags/tono de personalidad de una escena (p.ej. "dramática", "impaciente",
  el campo `tone` de `scene_intent_spec.md`) deben derivarse siempre de los sliders de
  `Personality` mediante una única función determinista `personalityToTags(personality)`
  (a implementar en Fase 3); no se autoescriben tags de texto sueltas por residente. Los
  sliders son la única fuente de verdad. No se implementa la función en esta tarea.

## [Fase 1] — 2026-07-07

### Añadido
- **Core** (`src/core/`): tipos de dominio puros `Resident`, `Personality` (energy,
  sociability, patience, weirdness, romanticism), `Needs` (hunger, mood, energy,
  social_need, boredom), `Avatar` e ids tipados (`ResidentId`, `createResidentId`).
- **Residents** (`src/residents/`): `createResident`/`updateResident` (defaults sensatos,
  puro, sin efectos secundarios) y validación (`validateResidentName`, `sanitizeResidentName`,
  `validatePersonality`); lanzan `ResidentValidationError` con la lista de errores.
- **Save** (`src/save/`): puerto `StoragePort` con dos implementaciones —
  `IndexedDbStorage` (localForage, runtime) e `InMemoryStorage` (tests, sin DOM) — inyectadas
  en `SaveSystem` (guardar/cargar/listar/eliminar residentes). `SaveState` versionado
  (`schemaVersion`) con stub de migración (`migrateSaveState`) para guardados antiguos.
- **UI** (`src/ui/` + `src/main.ts`): `IslandScene` (Phaser) muestra un residente placeholder
  "en su casa" (casa + avatar teñido por color + nombre + resumen de personalidad); panel de
  edición en overlay DOM (nombre + 5 sliders de personalidad) que guarda vía `SaveSystem` y
  re-renderiza la escena. Al arrancar carga el residente guardado o crea uno por defecto.
- Tests (Vitest): creación/validación de residentes (casos válidos e inválidos) y round-trip
  de `SaveSystem` con `InMemoryStorage`, incluida la migración de un guardado sin `schemaVersion`.
- `.claude/launch.json` para levantar el servidor de dev (`npm run dev`) desde el preview.

### Decisiones
- Tipos de dominio (`Resident`, `Personality`, `Needs`, `Avatar`) viven en `src/core/`; la
  lógica de creación/validación en `src/residents/` (separación datos vs. lógica).
- `SaveState` guarda todos los residentes en un único blob versionado bajo una clave
  (`cotilleo:save-state`), no una entrada por residente: simplifica migración y consistencia
  a costa de reescribir todo el estado en cada guardado (aceptable al volumen de V1).
- Avatar en Fase 1 es solo un conjunto de claves de string (`face/hair/eyes/mouth/color`);
  el render usa una paleta local en `src/ui/avatar-palette.ts` para teñir un círculo — no hay
  sprites/atlas todavía.

### Fuera de alcance (a propósito)
- Tick de necesidades, Event Engine, relaciones/romance, diálogo, IA, tiendas, isla/mapa real.
- Export/import manual de `SaveState` (mencionado en docs, no requerido en Fase 1).
- Múltiples residentes en pantalla a la vez (el `SaveSystem` ya soporta varios; la UI de
  Fase 1 solo muestra y edita el residente activo).

## [Fase 0] — 2026-07-07

### Decisiones
- **Engine: web/PWA** (TypeScript + Vite + Phaser 3) en lugar de Unity — llega al iPad
  sin Mac ni build cloud de pago (ADR 0001, sustituye a la propuesta Unity).
- **Modo de trabajo**: humano + Claude Code como único constructor; comité multi-modelo
  en reserva hasta validar el core loop.
- **Alcance V1**: romance y matrimonio/convivencia **dentro**; **bebés fuera**.
- **Fuente de verdad técnica**: este repo (`docs/`); la bóveda Obsidian queda como puntero.

### Añadido
- Repositorio inicializado (git) y `.gitignore` (Node/web).
- Documentación base: `README.md`, `AGENTS.md`, `CODEMAP.md`.
- `docs/`: product_brief, architecture, scene_intent_spec, data_model, ai_usage_policy, distribution_strategy.
- `docs/adr/`: 0001 (web/PWA), 0002 (local-first), 0003 (IA como capa de expresión).
- Scaffold web: `package.json`, `tsconfig.json`, `vite.config.ts` (PWA), `index.html`,
  `src/main.ts` (placeholder) y estructura de módulos `src/{core,residents,relationships,events,dialogue,ai,save,ui,data}`.
- `tools/` y `public/icons/`.

### Cambiado
- Sustituido el scaffold Unity (`UnityProject/`, ADR Unity) por el stack web.

### Pendiente
- `npm install` y primer `npm run dev`.
- Iconos PWA (192/512) en `public/icons/`.
- Fase 1: sistema de residentes.
