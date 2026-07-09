import { HUNGER_URGENT_THRESHOLD } from "@/core/needs";
import type { ResidentId } from "@/core/ids";
import type { SceneIntent, SceneLogEntry, SceneType } from "./types";

const MINUTE_MS = 60 * 1000;

export const SCENE_COOLDOWN_MS: Record<SceneType, number> = {
  hungry: 30 * MINUTE_MS,
  tired: 45 * MINUTE_MS,
  bored: 60 * MINUTE_MS,
  lonely: 60 * MINUTE_MS,
  quirk: 120 * MINUTE_MS,
  meet: 24 * 60 * MINUTE_MS, // ya se conocen tras el primer meet; en la practica no vuelve a dispararse (status deja de ser "strangers")
  chat: 45 * MINUTE_MS,
  argument: 90 * MINUTE_MS,
  reconcile: 60 * MINUTE_MS,
  flirt: 90 * MINUTE_MS,
  confess: 24 * 60 * MINUTE_MS,
  propose: 24 * 60 * MINUTE_MS,
};

/** Compara el CONJUNTO de participantes (orden indiferente), no solo el primero. */
function sameParticipantSet(a: readonly ResidentId[], b: readonly ResidentId[]): boolean {
  if (a.length !== b.length) return false;
  const sortedA = [...a].sort();
  const sortedB = [...b].sort();
  return sortedA.every((id, index) => id === sortedB[index]);
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
      sameParticipantSet(intent.participants, entry.participants) &&
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
