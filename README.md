# Cotilleo Island

Simulador social **local-first** para iPad, inspirado en Tomodachi Life: residentes
personalizados viven en una isla, tienen necesidades y relaciones, y generan escenas
emergentes que el jugador va descubriendo. La IA es una **capa de expresividad
opcional**, no el motor del juego.

> Regla que ordena todo: **el motor decide el estado; la IA embellece, resume o sugiere; la IA no manda sobre el núcleo.**

## Estado
**Fase 0** — repo y documentación base. Sin código todavía. El proyecto Unity se crea
desde el editor de Unity (ver [`UnityProject/`](UnityProject/README.md)).

## Objetivo del primer hito
Un residente en una casa que tiene hambre, pide comida, reacciona y se guarda el
resultado. Si esa microescena tiene gracia, el proyecto tiene base.

## Documentación
- [`AGENTS.md`](AGENTS.md) — reglas para los agentes de IA (Claude Code / Codex).
- [`CODEMAP.md`](CODEMAP.md) — mapa de módulos.
- [`docs/`](docs/) — brief de producto, arquitectura, spec de SceneIntent, modelo de datos, política de IA, distribución.
- [`docs/adr/`](docs/adr/) — decisiones de arquitectura (ADRs).

## Memoria del proyecto (segundo cerebro)
La memoria navegable, roadmap y decisiones viven también en la bóveda Obsidian:
`Documents/notes/40-Proyectos/CotilleoIsland/`.

## Stack
Unity + C# · datos JSON local (SQLite al crecer) · sin backend en V1 · IA runtime opcional y acotada.
