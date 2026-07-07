import type { Resident } from "@/core/resident";
import {
  HUNGER_REQUEST_THRESHOLD,
  type Needs,
} from "@/core/needs";
import type { Quirk } from "@/data/quirks";
import { QUIRK_CATALOG } from "@/data/quirks";
import type { RandomSource } from "./rng";
import type { SceneIntent } from "./types";

const NEED_SCENE_THRESHOLD = 65;
const LOW_ENERGY_THRESHOLD = 30;
const IMPATIENT_RELAXATION = 10;
const SOCIABLE_LONELY_RELAXATION = 10;
const MAX_THRESHOLD_RELAXATION = 20;
const QUIRK_WEIRDNESS_THRESHOLD = 60;
const QUIRK_URGENCY = 45;

function relaxedThreshold(base: number, relaxation: number): number {
  return base - Math.min(relaxation, MAX_THRESHOLD_RELAXATION);
}

function needRelaxation(resident: Resident, need: keyof Needs): number {
  const impatient = resident.personality.patience <= 30 ? IMPATIENT_RELAXATION : 0;
  const sociableLonely =
    need === "social_need" && resident.personality.sociability >= 70
      ? SOCIABLE_LONELY_RELAXATION
      : 0;
  return Math.min(impatient + sociableLonely, MAX_THRESHOLD_RELAXATION);
}

function makeNeedIntent(
  resident: Resident,
  sceneType: SceneIntent["sceneType"],
  need: keyof Needs,
  value: number,
  urgency: number,
  nowMs: number,
): SceneIntent {
  return {
    sceneType,
    participants: [resident.id],
    cause: { kind: "need", need, value },
    urgency,
    createdAtMs: nowMs,
  };
}

function chooseQuirk(quirks: readonly Quirk[], rng: RandomSource): Quirk | null {
  if (quirks.length === 0) return null;
  const index = Math.min(quirks.length - 1, Math.floor(rng() * quirks.length));
  return quirks[index] ?? null;
}

export interface DetectSceneOptions {
  rng: RandomSource;
  quirks?: readonly Quirk[];
}

export function detectSceneCandidates(
  resident: Resident,
  nowMs: number,
  options: DetectSceneOptions,
): SceneIntent[] {
  const candidates: SceneIntent[] = [];
  const { needs, personality } = resident;

  const hungerThreshold = relaxedThreshold(
    HUNGER_REQUEST_THRESHOLD,
    needRelaxation(resident, "hunger"),
  );
  if (needs.hunger >= hungerThreshold) {
    candidates.push(makeNeedIntent(resident, "hungry", "hunger", needs.hunger, needs.hunger, nowMs));
  }

  const tiredThreshold = LOW_ENERGY_THRESHOLD + needRelaxation(resident, "energy");
  if (needs.energy <= tiredThreshold) {
    candidates.push(
      makeNeedIntent(resident, "tired", "energy", needs.energy, 100 - needs.energy, nowMs),
    );
  }

  const boredThreshold = relaxedThreshold(
    NEED_SCENE_THRESHOLD,
    needRelaxation(resident, "boredom"),
  );
  if (needs.boredom >= boredThreshold) {
    candidates.push(
      makeNeedIntent(resident, "bored", "boredom", needs.boredom, needs.boredom, nowMs),
    );
  }

  const lonelyThreshold = relaxedThreshold(
    NEED_SCENE_THRESHOLD,
    needRelaxation(resident, "social_need"),
  );
  if (needs.social_need >= lonelyThreshold) {
    candidates.push(
      makeNeedIntent(
        resident,
        "lonely",
        "social_need",
        needs.social_need,
        needs.social_need,
        nowMs,
      ),
    );
  }

  if (
    personality.weirdness >= QUIRK_WEIRDNESS_THRESHOLD &&
    options.rng() < personality.weirdness / 200
  ) {
    const quirk = chooseQuirk(options.quirks ?? QUIRK_CATALOG, options.rng);
    if (quirk) {
      candidates.push({
        sceneType: "quirk",
        participants: [resident.id],
        cause: { kind: "quirk", quirkId: quirk.id },
        urgency: QUIRK_URGENCY,
        createdAtMs: nowMs,
      });
    }
  }

  return candidates;
}

