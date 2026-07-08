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
 * Decaimiento pasivo de una relacion por tiempo transcurrido desde
 * `lastInteractionAtMs` (mismo patron que `decayNeeds`: puro, sin RNG ni
 * reloj interno, recibe `elapsedMs` ya calculado por el llamador).
 *
 * `friendship` no decae hasta pasado un periodo de gracia (los enfriamientos
 * son mas lentos que la creacion de amistad); `tension` se enfria sola sin
 * gracia (los enfados se calman con el tiempo). `romance`/`status` no decaen
 * pasivamente: son hitos, solo cambian por accion resuelta (regla #0).
 */
export function decayRelationship(relationship: Relationship, elapsedMs: number): Relationship {
  if (elapsedMs <= 0 || relationship.lastInteractionAtMs === null) return relationship;

  const elapsedDays = elapsedMs / MS_PER_DAY;
  const friendshipDecayDays = Math.max(0, elapsedDays - FRIENDSHIP_GRACE_DAYS);

  return {
    ...relationship,
    friendship: clampRelationshipValue(
      relationship.friendship - friendshipDecayDays * FRIENDSHIP_DECAY_PER_DAY,
    ),
    tension: clampRelationshipValue(relationship.tension - elapsedDays * TENSION_DECAY_PER_DAY),
  };
}
