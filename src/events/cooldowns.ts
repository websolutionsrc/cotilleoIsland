import { HUNGER_URGENT_THRESHOLD } from "@/core/needs";
import type { SceneIntent, SceneLogEntry, SceneType } from "./types";

const MINUTE_MS = 60 * 1000;

export const SCENE_COOLDOWN_MS: Record<SceneType, number> = {
  hungry: 30 * MINUTE_MS,
  tired: 45 * MINUTE_MS,
  bored: 60 * MINUTE_MS,
  lonely: 60 * MINUTE_MS,
  quirk: 120 * MINUTE_MS,
};

function samePrimaryParticipant(intent: SceneIntent, entry: SceneLogEntry): boolean {
  return intent.participants[0] !== undefined && intent.participants[0] === entry.participants[0];
}

export function ignoresCooldown(intent: SceneIntent): boolean {
  return (
    intent.sceneType === "hungry" &&
    intent.cause.kind === "need" &&
    intent.cause.need === "hunger" &&
    intent.cause.value >= HUNGER_URGENT_THRESHOLD
  );
}

export function isSceneOnCooldown(
  intent: SceneIntent,
  sceneLog: readonly SceneLogEntry[],
  nowMs: number,
): boolean {
  if (ignoresCooldown(intent)) return false;
  const cooldownMs = SCENE_COOLDOWN_MS[intent.sceneType];
  return sceneLog.some(
    (entry) =>
      entry.sceneType === intent.sceneType &&
      samePrimaryParticipant(intent, entry) &&
      nowMs - entry.atMs >= 0 &&
      nowMs - entry.atMs < cooldownMs,
  );
}

export function filterScenesOnCooldown(
  intents: readonly SceneIntent[],
  sceneLog: readonly SceneLogEntry[],
  nowMs: number,
): SceneIntent[] {
  return intents.filter((intent) => !isSceneOnCooldown(intent, sceneLog, nowMs));
}

