# Cotilleo Island

Simulador social **local-first** para iPad, inspirado en Tomodachi Life: residentes
personalizados viven en una isla, tienen necesidades y relaciones, y generan escenas
emergentes que el jugador va descubriendo. La IA es una **capa de expresividad
opcional**, no el motor del juego.

> Regla que ordena todo: **el motor decide el estado; la IA embellece, resume o sugiere; la IA no manda sobre el núcleo.**

## Estado
**Fase 5 cerrada** (tag `v01.00.F5`) — residentes, personalidad derivada, necesidades,
Event Engine (escenas solo), relaciones (escenas sociales) e isla/economía (zonas,
monedero, despensa, tienda, celebraciones de zona) están implementados, testeados
(175 tests) y validados en vivo. Siguiente hito: **Fase 6** (capa de IA opcional).
Ver [`CODEMAP.md`](CODEMAP.md) para el detalle por subfase.

## Stack
- **TypeScript** + **Vite** + **Phaser 3** (2D; scenes/sprites/input/tweens/sound). Framework swappable (Pixi/React) si conviene.
- **Local-first**: guardado en **IndexedDB** (vía localForage). Sin backend en V1.
- **PWA**: instalable en la pantalla de inicio del iPad (manifest + service worker), sin Mac ni build cloud de pago. Wrapper nativo (Capacitor/PWABuilder) opcional más adelante.
- IA runtime opcional y acotada (detrás de interfaces, con fallback a plantilla).

> Elegimos web/PWA en vez de Unity porque el mayor bloqueo (no tener Mac) golpea justo la parte iPad-nativa de Unity. Ver [`docs/adr/0001-web-pwa-stack.md`](docs/adr/0001-web-pwa-stack.md).

## Modo de trabajo actual
Tú (coordinación + decisiones + probar diversión) + **Claude Code** como constructor.
El comité multi-modelo queda en reserva hasta que el core loop esté validado y haya
volumen de contenido que repartir. Ver la nota de la bóveda "Equipo de modelos LLM".

## Objetivo del primer hito (ya cumplido en F2)
Un residente en una casa que tiene hambre, pide comida, reacciona y se guarda el
resultado. Esa microescena funcionó y el proyecto siguió creciendo sobre ella.

## Empezar
```bash
npm install
npm run dev      # servidor de desarrollo Vite
npm test         # suite Vitest
npm run build    # build de producción (PWA)
```

## Documentación
- [`AGENTS.md`](AGENTS.md) — reglas para los agentes de IA.
- [`CODEMAP.md`](CODEMAP.md) — mapa de módulos.
- [`docs/`](docs/) — brief, arquitectura, SceneIntent, modelo de datos, política de IA, distribución. **Fuente de verdad técnica.**
- [`docs/adr/`](docs/adr/) — decisiones de arquitectura.

## Memoria del proyecto (segundo cerebro)
Objetivo, estado y roadmap navegables en la bóveda Obsidian:
`Documents/notes/40-Proyectos/CotilleoIsland/` (apunta aquí para el detalle técnico).
