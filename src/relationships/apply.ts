import { chemistry } from "./chemistry";
import { nextRelationshipStatus, type RelationshipAction } from "./status";
import { RELATIONSHIP_MAX, RELATIONSHIP_MIN, type Relationship } from "./types";
import type { Personality } from "@/core/personality";

interface RelationshipDelta {
  friendship?: number;
  tension?: number;
  romance?: number;
}

// Deltas fijos por accion social (mismo patron que NEEDS_DELTA_BY_ACTION en
// src/events/resolve.ts). F4.3 conecta estas acciones a sceneType concretos.
const RELATIONSHIP_DELTA_BY_ACTION: Record<RelationshipAction, RelationshipDelta> = {
  meet: { friendship: 5 },
  chat: { friendship: 10, tension: -5 },
  argument: { friendship: -10, tension: 25 },
  reconcile: { friendship: 5, tension: -30 },
  flirt: { friendship: 5, romance: 15 },
  confess: { friendship: 5, romance: 20 },
  propose: { friendship: 5, romance: 25 },
};

function clampRelationshipValue(value: number): number {
  if (!Number.isFinite(value)) return RELATIONSHIP_MIN;
  return Math.min(RELATIONSHIP_MAX, Math.max(RELATIONSHIP_MIN, Math.round(value)));
}

/**
 * Punto de entrada unico para resolver una accion social sobre una relacion:
 * aplica el delta de valores, recalcula `chemistry` con los valores YA
 * actualizados (para que las guardas de `confess`/`propose` vean el estado
 * post-accion) y decide la transicion de `status`. Pura, determinista.
 */
export function applyRelationshipAction(
  relationship: Relationship,
  action: RelationshipAction,
  participants: { a: Personality; b: Personality },
  nowMs: number,
): Relationship {
  const delta = RELATIONSHIP_DELTA_BY_ACTION[action];

  const updatedValues: Relationship = {
    ...relationship,
    friendship: clampRelationshipValue(relationship.friendship + (delta.friendship ?? 0)),
    tension: clampRelationshipValue(relationship.tension + (delta.tension ?? 0)),
    romance: clampRelationshipValue(relationship.romance + (delta.romance ?? 0)),
    lastInteractionAtMs: nowMs,
  };

  const chemistryValue = chemistry(participants.a, participants.b, updatedValues);
  const status = nextRelationshipStatus(relationship.status, action, {
    friendship: updatedValues.friendship,
    chemistry: chemistryValue,
  });

  return { ...updatedValues, status };
}
