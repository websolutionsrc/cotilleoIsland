import { RELATIONSHIP_MAX, RELATIONSHIP_MIN, type Relationship } from "./types";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Dias de gracia sin interaccion antes de que `friendship` empiece a decaer. */
const FRIENDSHIP_GRACE_DAYS = 3;
const FRIENDSHIP_DECAY_PER_DAY = 1;
const TENSION_DECAY_PER_DAY = 2;

function clampRelationshipValue(value: number): number {
  if (!Number.isFinite(value)) return RELATIONSHIP_MIN;
  return Math.min(RELATIONSHIP_MAX, Math.max(RELATIONSHIP_MIN, Math.round(value)));
}

/**
 * Decaimiento pasivo de una relacion (mismo patron incremental que
 * `decayNeeds`: puro, sin RNG ni reloj interno, recibe `elapsedMs` ya
 * calculado por el llamador para el tick de mundo actual).
 *
 * `tension` decae `elapsedMs` a `TENSION_DECAY_PER_DAY`/dia sin gracia (los
 * enfados se enfrian solos). `friendship` decae a la misma tasa incremental
 * SOLO si, en terminos absolutos, ya pasaron `FRIENDSHIP_GRACE_DAYS` desde
 * `lastInteractionAtMs` (por eso se recibe tambien `nowMs`): la gracia es una
 * puerta booleana sobre el momento, no una resta de dias sobre `elapsedMs`.
 * Esto mantiene el decay idempotente entre ticks sucesivos (igual que
 * `decayNeeds` con `needsUpdatedAtMs`): cada tick decae solo lo que le
 * corresponde a su propio `elapsedMs`, nunca se re-decae lo mismo dos veces.
 *
 * Aproximacion aceptada (igual de tosca que `decayNeeds`): un tick que cruza
 * el limite de gracia decae el tick completo en cuanto se supera la gracia,
 * sin prorratear la parte anterior al limite. No es simulacion exacta; para
 * la cadencia de aperturas de este juego (no un reloj en segundo plano) el
 * error es despreciable.
 *
 * `romance`/`status` no decaen pasivamente: son hitos, solo cambian por
 * accion resuelta (regla #0 de engine_design_f3-f5.md).
 */
export function decayRelationship(relationship: Relationship, elapsedMs: number, nowMs: number): Relationship {
  if (elapsedMs <= 0 || relationship.lastInteractionAtMs === null) return relationship;

  const elapsedDays = elapsedMs / MS_PER_DAY;
  const sinceInteractionMs = nowMs - relationship.lastInteractionAtMs;
  const pastGrace = sinceInteractionMs >= FRIENDSHIP_GRACE_DAYS * MS_PER_DAY;

  return {
    ...relationship,
    friendship: pastGrace
      ? clampRelationshipValue(relationship.friendship - elapsedDays * FRIENDSHIP_DECAY_PER_DAY)
      : relationship.friendship,
    tension: clampRelationshipValue(relationship.tension - elapsedDays * TENSION_DECAY_PER_DAY),
  };
}
