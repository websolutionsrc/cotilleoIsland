import type { FoodEffect } from "@/core/needs";
import { applyFoodEffect, normalizeNeeds, type NeedsDelta } from "@/core/needs";
import type { Resident } from "@/core/resident";
import { isSocialSceneType, type SceneIntent, type SoloSceneType } from "./types";

export type SceneResolutionAction =
  | { kind: "give_food"; foodEffect: FoodEffect }
  | { kind: "rest" }
  | { kind: "play" }
  | { kind: "chat" }
  | { kind: "observe" }
  | { kind: "celebrate" };

// Solo las escenas "solo" (1 residente) resuelven por esta via. Las escenas
// sociales (F4) resuelven aparte via resolve-social.ts + applyRelationshipAction:
// afectan a needs de AMBOS participantes y a la relacion, no a SceneResolutionAction.
type NonFoodSoloSceneType = Exclude<SoloSceneType, "hungry">;
type NonFoodActionKind = Exclude<SceneResolutionAction["kind"], "give_food">;

const DEFAULT_ACTION_KIND_BY_SCENE: Record<NonFoodSoloSceneType, NonFoodActionKind> = {
  tired: "rest",
  bored: "play",
  lonely: "chat",
  quirk: "observe",
  zone_opening: "celebrate",
};

const NEEDS_DELTA_BY_ACTION: Record<Exclude<SceneResolutionAction["kind"], "give_food">, NeedsDelta> = {
  rest: { energy: 30, mood: 5 },
  play: { boredom: -40, energy: -10, mood: 8 },
  chat: { social_need: -35, mood: 8 },
  observe: { mood: 4 },
  celebrate: { mood: 10 },
};

export function defaultActionForScene(intent: SceneIntent): SceneResolutionAction | null {
  if (intent.sceneType === "hungry" || isSocialSceneType(intent.sceneType)) return null;
  return { kind: DEFAULT_ACTION_KIND_BY_SCENE[intent.sceneType] };
}

export function resolveSceneNeeds(
  resident: Resident,
  intent: SceneIntent,
  action: SceneResolutionAction,
): Resident {
  if (resident.id !== intent.participants[0]) {
    throw new Error("Scene participant does not match resident");
  }
  if (isSocialSceneType(intent.sceneType)) {
    throw new Error("Social scenes resolve via resolve-social.ts, not resolveSceneNeeds");
  }

  if (intent.sceneType === "hungry") {
    if (action.kind !== "give_food") {
      throw new Error("Hungry scenes require a give_food action");
    }
    return { ...resident, needs: applyFoodEffect(resident.needs, action.foodEffect) };
  }

  const expectedAction = DEFAULT_ACTION_KIND_BY_SCENE[intent.sceneType];
  if (action.kind !== expectedAction) {
    throw new Error(`Scene ${intent.sceneType} requires a ${expectedAction} action`);
  }
  const delta = NEEDS_DELTA_BY_ACTION[expectedAction];

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
