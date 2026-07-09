import { LOW_MOOD_THRESHOLD } from "@/core/needs";
import { personalityToTags } from "@/core/personality-derived";
import type { Resident } from "@/core/resident";
import { findQuirk } from "@/data/quirks";
import {
  isSocialSceneType,
  type SceneIntent,
  type SocialSceneType,
  type SoloSceneType,
} from "@/events/types";

const DEFAULT_TEXT: Record<SoloSceneType, string> = {
  hungry: "I could really use something to eat.",
  tired: "I need a little rest.",
  bored: "Can we do something fun?",
  lonely: "I would like to talk for a bit.",
  quirk: "Something oddly charming is happening.",
};

const TAG_ENERGETIC = "enérgica";
const TAG_ECCENTRIC = "excéntrica";

const TAG_VARIANTS: Partial<Record<SoloSceneType, Record<string, string>>> = {
  hungry: {
    sociable: "Food tastes better with company.",
    tranquila: "A quiet snack would be perfect.",
    impaciente: "Snack time should have happened already.",
  },
  tired: {
    [TAG_ENERGETIC]: "Even I need to recharge sometimes.",
    tranquila: "A calm nap sounds perfect.",
    paciente: "I can wait, but rest would help.",
  },
  bored: {
    [TAG_ECCENTRIC]: "My brain wants something wonderfully weird.",
    sociable: "Let's do something with people around.",
    impaciente: "I need fun right now.",
  },
  lonely: {
    sociable: "I miss having someone around.",
    reservada: "Maybe just a small chat would be nice.",
    amable: "I would love to check in with someone.",
  },
};

const LOW_MOOD_TEXT: Partial<Record<SoloSceneType, string>> = {
  hungry: "Food might help this day feel less heavy.",
  tired: "Rest would make everything feel a little easier.",
  bored: "A small distraction might lift my mood.",
  lonely: "I could use a kind voice right now.",
};

const QUIRK_TEXT: Record<string, string> = {
  talks_to_plants: "The plants have been updated on today's gossip.",
  shower_singer: "A concert is happening somewhere behind a bathroom door.",
  collects_pebbles: "A very important pebble has joined the collection.",
  dances_alone: "A private dance party has started with full confidence.",
};

// Textos de escenas sociales (F4): funcion de los dos nombres, no un string
// estatico (a diferencia de las escenas solo). Sin variantes por tag todavia
// (posible mejora futura, no bloqueante para F4.3).
const SOCIAL_DEFAULT_TEXT: Record<SocialSceneType, (a: string, b: string) => string> = {
  meet: (a, b) => `${a} and ${b} are meeting for the first time.`,
  chat: (a, b) => `${a} and ${b} are catching up.`,
  argument: (a, b) => `${a} and ${b} are in the middle of a disagreement.`,
  reconcile: (a, b) => `${a} and ${b} are making up.`,
  flirt: (a, b) => `${a} and ${b} can't stop smiling at each other.`,
  confess: (a, b) => `${a} is working up the courage to tell ${b} something important.`,
  propose: (a, b) => `${a} has a big question for ${b}.`,
};

function firstMatchingTagText(sceneType: SoloSceneType, resident: Resident): string | null {
  const variants = TAG_VARIANTS[sceneType];
  if (!variants) return null;
  for (const tag of personalityToTags(resident.personality)) {
    const text = variants[tag];
    if (text) return text;
  }
  return null;
}

/**
 * Texto de una escena para mostrar en la burbuja/panel. `counterpart` es
 * obligatorio en la practica para escenas sociales (el llamador siempre tiene
 * ambos residentes); si faltara, cae a "someone" en vez de fallar (invariante
 * #9 de engine_design_f3-f5.md: el render de texto siempre es total).
 */
export function sceneTextFor(intent: SceneIntent, resident: Resident, counterpart?: Resident): string {
  if (isSocialSceneType(intent.sceneType)) {
    return SOCIAL_DEFAULT_TEXT[intent.sceneType](resident.name, counterpart?.name ?? "someone");
  }

  if (intent.sceneType === "quirk" && intent.cause.kind === "quirk") {
    return QUIRK_TEXT[intent.cause.quirkId] ?? findQuirk(intent.cause.quirkId)?.name ?? DEFAULT_TEXT.quirk;
  }

  if (resident.needs.mood <= LOW_MOOD_THRESHOLD) {
    const lowMoodText = LOW_MOOD_TEXT[intent.sceneType];
    if (lowMoodText) return lowMoodText;
  }

  return firstMatchingTagText(intent.sceneType, resident) ?? DEFAULT_TEXT[intent.sceneType];
}
