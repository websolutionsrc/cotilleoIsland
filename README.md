# Cotilleo Island

**Local-first** social simulator for iPad, inspired by Tomodachi Life: custom residents
live on an island, have needs and relationships, and generate emergent scenes that the
player discovers. AI is an **optional expressiveness layer**, not the game engine.

> Guiding rule: **the engine decides state; AI embellishes, summarizes, or suggests; AI does not control the core.**

## Status
**v1.0 engine complete** (tag `v01.00.F5`) - residents, derived personality, needs,
Event Engine (solo scenes), relationships (social scenes), and island/economy (zones,
wallet, pantry, shop, zone celebrations) are implemented, tested (175 tests), and
validated live. F6 (optional AI) skipped for now; F7 (distribution) on standby.
Current work: **v1.1 F0 visual production foundation** - F0.1 (contracts, inventory,
validators) closed, registration master approved; F0.2 (character pilot) is next.
See [`CODEMAP.md`](CODEMAP.md) and [`docs/v1_1_plan.md`](docs/v1_1_plan.md).

## Stack
- **TypeScript** + **Vite** + **Phaser 3** (2D; scenes/sprites/input/tweens/sound). Framework swappable (Pixi/React) if useful.
- **Local-first**: saves in **IndexedDB** (via localForage). No backend in V1.
- **PWA**: installable on the iPad home screen (manifest + service worker), with no Mac or paid cloud build. Native wrapper (Capacitor/PWABuilder) optional later.
- Optional, bounded runtime AI (behind interfaces, with template fallback).

> We chose web/PWA over Unity because the biggest blocker (not having a Mac) affects Unity's iPad-native side directly. See [`docs/adr/0001-web-pwa-stack.md`](docs/adr/0001-web-pwa-stack.md).

## Current workflow
You (coordination + decisions + fun testing) + **Claude Code** as builder. The multi-model
committee remains on reserve until the core loop is validated and there is enough
content volume to distribute. See the vault note "LLM Model Team".

## First milestone goal (completed in F2)
A resident in a house gets hungry, asks for food, reacts, and saves the result. That
micro-scene worked, and the project continued growing from it.

## Getting started
```bash
npm install
npm run dev      # Vite development server
npm test         # Vitest suite
npm run build    # production PWA build
```

## Documentation
- [`AGENTS.md`](AGENTS.md) - rules for AI agents.
- [`CODEMAP.md`](CODEMAP.md) - module map.
- [`docs/`](docs/) - brief, architecture, SceneIntent, data model, AI policy, distribution. **Technical source of truth.**
- [`docs/adr/`](docs/adr/) - architecture decisions.

## Project memory (second brain)
Objective, status, and roadmap are navigable in the Obsidian vault:
`Documents/notes/40-Proyectos/CotilleoIsland/` (technical details point back here).
