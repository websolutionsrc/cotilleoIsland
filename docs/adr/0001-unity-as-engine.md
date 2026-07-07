# ADR 0001 — Unity como motor

- **Estado:** aceptada
- **Fecha:** 2026-07-07

## Contexto
Necesitamos un motor para un juego 2D/casual con iteración rápida y target iPad,
pudiendo probar en escritorio antes de tener hardware/cuenta Apple.

## Decisión
Usar **Unity + C#**.

## Motivos
- Iteración rápida y buen soporte 2D/3D.
- Export multiplataforma; permite probar en escritorio antes que en iPad.
- Mejor para prototipo de juego que Swift nativo.

## Alternativa considerada
**Swift nativo**: solo si se prioriza al máximo consumo bajo, integración Apple y UI
nativa con poca carga visual. Para este juego, Unity es más pragmático.

## Consecuencias
- Para build iOS sin Mac se dependerá de Unity Build Automation (ver `distribution_strategy.md`).
