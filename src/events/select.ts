import { filterScenesOnCooldown } from "./cooldowns";
import type { SceneIntent, SceneLogEntry, SceneType } from "./types";

const SCENE_TYPE_ORDER: readonly SceneType[] = ["hungry", "tired", "bored", "lonely", "quirk"];

const SCENE_SCORE_WEIGHT: Record<SceneType, number> = {
  hungry: 1,
  tired: 0.8,
  lonely: 0.7,
  bored: 0.6,
  quirk: 0,
};

export function scoreScene(intent: SceneIntent): number {
  if (intent.sceneType === "quirk") return 35;
  return intent.urgency * SCENE_SCORE_WEIGHT[intent.sceneType];
}

function sceneTypeRank(sceneType: SceneType): number {
  return SCENE_TYPE_ORDER.indexOf(sceneType);
}

function compareScenes(a: SceneIntent, b: SceneIntent): number {
  const scoreDelta = scoreScene(b) - scoreScene(a);
  if (scoreDelta !== 0) return scoreDelta;
  return sceneTypeRank(a.sceneType) - sceneTypeRank(b.sceneType);
}

export interface SelectScenesOptions {
  sceneLog: readonly SceneLogEntry[];
  nowMs: number;
  maxGlobal?: number;
}

export function selectScenes(
  candidates: readonly SceneIntent[],
  options: SelectScenesOptions,
): SceneIntent[] {
  const maxGlobal = options.maxGlobal ?? 3;
  const available = filterScenesOnCooldown(candidates, options.sceneLog, options.nowMs);
  const bestByResident = new Map<string, SceneIntent>();

  for (const candidate of available) {
    const residentId = candidate.participants[0];
    if (!residentId) continue;
    const current = bestByResident.get(residentId);
    if (!current || compareScenes(candidate, current) < 0) {
      bestByResident.set(residentId, candidate);
    }
  }

  return [...bestByResident.values()].sort(compareScenes).slice(0, maxGlobal);
}

