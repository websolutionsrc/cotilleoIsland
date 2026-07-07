# Changelog — Cotilleo Island

Formato: entradas por fase/hito. Fechas en `YYYY-MM-DD`.

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
