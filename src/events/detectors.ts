import type { Resident } from "@/core/resident";
import {
  HUNGER_REQUEST_THRESHOLD,
  type Needs,
} from "@/core/needs";
import type { Quirk } from "@/data/quirks";
import { QUIRK_CATALOG } from "@/data/quirks";
import {
  chemistry,
  CONFESS_CHEMISTRY_MIN,
  CONFESS_FRIENDSHIP_MIN,
  PROPOSE_CHEMISTRY_MIN,
  PROPOSE_FRIENDSHIP_MIN,
  type Relationship,
} from "@/relationships";
import type { RandomSource } from "./rng";
import type { SceneIntent, SocialSceneType } from "./types";

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

// --- Escenas sociales (F4) --------------------------------------------------
//
// Umbrales de deteccion no fijados por engine_design_f3-f5.md #3.4 mas alla de
// los ejemplos citados (argument>=60, flirt>=60); el resto son decisiones de
// implementacion, documentadas aqui. confess/propose REUSAN exactamente las
// mismas constantes que la guarda de transicion en status.ts: si la escena se
// detecta, resolverla garantiza cruzar la guarda (los deltas de
// applyRelationshipAction solo suman, nunca restan, antes de comprobarla).
const CHAT_SOCIAL_NEED_THRESHOLD = 55;
const ARGUMENT_TENSION_THRESHOLD = 60;
const RECONCILE_KINDNESS_THRESHOLD = 50;
const FLIRT_CHEMISTRY_THRESHOLD = 60;

const MEET_URGENCY = 30;
const RECONCILE_URGENCY = 55;
const CONFESS_URGENCY = 65;
const PROPOSE_URGENCY = 70;

function makeSocialIntent(
  a: Resident,
  b: Resident,
  sceneType: SocialSceneType,
  urgency: number,
  nowMs: number,
): SceneIntent {
  return {
    sceneType,
    participants: [a.id, b.id],
    cause: { kind: "social" },
    urgency,
    createdAtMs: nowMs,
  };
}

/**
 * Detecta candidatas sociales (2 participantes) para un par de residentes.
 * Pura, sin RNG (a diferencia de los quirks, estos disparadores son siempre
 * por umbral). El orden de `a`/`b` no importa para el resultado (las
 * condiciones son simetricas); `participants` conserva el orden recibido.
 */
export function detectSocialSceneCandidates(
  a: Resident,
  b: Resident,
  relationship: Relationship,
  nowMs: number,
): SceneIntent[] {
  const candidates: SceneIntent[] = [];
  const { status } = relationship;

  if (status === "strangers") {
    candidates.push(makeSocialIntent(a, b, "meet", MEET_URGENCY, nowMs));
  }

  if (status === "acquaintances" || status === "friends" || status === "besties") {
    const avgSocialNeed = (a.needs.social_need + b.needs.social_need) / 2;
    if (avgSocialNeed >= CHAT_SOCIAL_NEED_THRESHOLD) {
      candidates.push(makeSocialIntent(a, b, "chat", avgSocialNeed, nowMs));
    }
  }

  if (
    (status === "friends" || status === "besties" || status === "dating" || status === "partners") &&
    relationship.tension >= ARGUMENT_TENSION_THRESHOLD
  ) {
    candidates.push(makeSocialIntent(a, b, "argument", relationship.tension, nowMs));
  }

  if (status === "fighting") {
    const avgKindness = (a.personality.kindness + b.personality.kindness) / 2;
    if (avgKindness >= RECONCILE_KINDNESS_THRESHOLD) {
      candidates.push(makeSocialIntent(a, b, "reconcile", RECONCILE_URGENCY, nowMs));
    }
  }

  if (status === "friends" || status === "besties") {
    const chemistryValue = chemistry(a.personality, b.personality, relationship);
    if (chemistryValue >= FLIRT_CHEMISTRY_THRESHOLD) {
      candidates.push(makeSocialIntent(a, b, "flirt", chemistryValue, nowMs));
    }
    if (
      relationship.friendship >= CONFESS_FRIENDSHIP_MIN &&
      chemistryValue >= CONFESS_CHEMISTRY_MIN
    ) {
      candidates.push(makeSocialIntent(a, b, "confess", CONFESS_URGENCY, nowMs));
    }
  }

  if (status === "dating") {
    const chemistryValue = chemistry(a.personality, b.personality, relationship);
    if (
      relationship.friendship >= PROPOSE_FRIENDSHIP_MIN &&
      chemistryValue >= PROPOSE_CHEMISTRY_MIN
    ) {
      candidates.push(makeSocialIntent(a, b, "propose", PROPOSE_URGENCY, nowMs));
    }
  }

  return candidates;
}

