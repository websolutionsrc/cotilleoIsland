# ADR 0002 - Local-first, no backend in V1

- **Status:** accepted
- **Date:** 2026-07-07

## Context
The game may contain characters based on real people. We want to validate gameplay
quickly, without infrastructure costs or privacy risks.

## Decision
V1 is **local-first**: no backend, no accounts, local saves in **IndexedDB** (localForage)
with a versioned schema, manual export/import (JSON). Cloud AI is disabled by default or
clearly explained.

## Reasons
- Privacy for real-person characters (nothing is uploaded by default).
- Less complexity; validate the core loop before investing in infrastructure.
- No network dependency for the game to work.

## Consequences
- If cloud AI is used later: send only minimized `SceneIntent`, with an anonymization
  option (`Resident A/B`), a send log, and a local-only mode always available.
- Synchronization/sharing are deferred to advanced phases.
