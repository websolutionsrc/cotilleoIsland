# ADR 0003 - AI as an expression layer, not the engine

- **Status:** accepted
- **Date:** 2026-07-07

## Context
The temptation is to "make Tomodachi Life with AI". The risk is that AI becomes the
engine, with cost, latency, unpredictability, and difficult testing.

## Decision
The **rule engine decides state**; AI only **expresses** that state (dialogue,
narration, summaries, catchphrases), **always behind interfaces** and with a no-AI
**fallback**.
```
Rules -> SceneIntent -> optional AI -> validated text -> scene
```

## Reasons
- Deterministic, testable core.
- AI must be replaceable by templates.
- Cost, latency, and privacy control.

## Consequences
- All AI usage sends minimized `SceneIntent`, validated JSON output, cache, a per-session
  budget, and rate limit (see `ai_usage_policy.md`).
- `IEventSuggestor` proposes, `EventEngine` validates, `GameState` applies.
- No autonomous agents inside the game in V1/MVP.
