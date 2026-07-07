# Changelog — Cotilleo Island

Formato: entradas por fase/hito. Fechas en `YYYY-MM-DD`.

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
