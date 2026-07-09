import { normalizeNeeds, type NeedsDelta } from "@/core/needs";
import type { Resident } from "@/core/resident";
import type { RelationshipAction } from "@/relationships";
import type { SocialSceneType } from "./types";

// Mapeo 1:1 sceneType social -> RelationshipAction. Los nombres coinciden a
// proposito (mismo concepto); este mapeo explicito hace que TS avise si algun
// dia divergen, en vez de depender de un cast silencioso.
const SCENE_TO_RELATIONSHIP_ACTION: Record<SocialSceneType, RelationshipAction> = {
  meet: "meet",
  chat: "chat",
  argument: "argument",
  reconcile: "reconcile",
  flirt: "flirt",
  confess: "confess",
  propose: "propose",
};

export function relationshipActionForScene(sceneType: SocialSceneType): RelationshipAction {
  return SCENE_TO_RELATIONSHIP_ACTION[sceneType];
}

// Efecto sobre needs de AMBOS participantes al resolver una escena social
// (independiente del efecto sobre la relacion, que resuelve
// applyRelationshipAction). Simetrico: mismo delta para los dos residentes.
const NEEDS_DELTA_BY_SOCIAL_SCENE: Record<SocialSceneType, NeedsDelta> = {
  meet: { mood: 3 },
  chat: { social_need: -25, mood: 6 },
  argument: { mood: -10 },
  reconcile: { mood: 8 },
  flirt: { mood: 6 },
  confess: { mood: 10 },
  propose: { mood: 15 },
};

function applyNeedsDelta(resident: Resident, delta: NeedsDelta): Resident {
  return {
    ...resident,
    needs: normalizeNeeds({
      hunger: resident.needs.hunger + (delta.hunger ?? 0),
      mood: resident.needs.mood + (delta.mood ?? 0),
      energy: resident.needs.energy + (delta.energy ?? 0),
      social_need: resident.needs.social_need + (delta.social_need ?? 0),
      boredom: resident.needs.boredom + (delta.boredom ?? 0),
    }),
  };
}

/** Aplica el efecto de needs de una escena social a ambos participantes. Pura. */
export function resolveSocialSceneNeeds(
  residentA: Resident,
  residentB: Resident,
  sceneType: SocialSceneType,
): { a: Resident; b: Resident } {
  const delta = NEEDS_DELTA_BY_SOCIAL_SCENE[sceneType];
  return {
    a: applyNeedsDelta(residentA, delta),
    b: applyNeedsDelta(residentB, delta),
  };
}
