# ADR 0002 — Local-first, sin backend en V1

- **Estado:** aceptada
- **Fecha:** 2026-07-07

## Contexto
El juego puede contener personajes basados en personas reales. Queremos validar el
gameplay rápido y sin costes/infra ni riesgos de privacidad.

## Decisión
V1 **local-first**: sin backend, sin cuentas, guardado local en **IndexedDB** (localForage)
con esquema versionado, export/import manual (JSON). IA cloud desactivada por defecto o
claramente explicada.

## Motivos
- Privacidad de personajes reales (nada se sube por defecto).
- Menos complejidad; validar el core loop antes de invertir en infra.
- Sin dependencia de red para funcionar.

## Consecuencias
- Si más adelante se usa IA cloud: enviar solo `SceneIntent` minimizado, opción de
  anonimizar (`Resident A/B`), log de envíos, modo solo-local siempre disponible.
- Sincronización/compartir quedan para fases avanzadas.
