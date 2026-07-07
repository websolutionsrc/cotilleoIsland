import { LOW_MOOD_THRESHOLD } from "@/core/needs";
import { personalityToTags } from "@/core/personality-derived";
import type { Resident } from "@/core/resident";
import { findQuirk } from "@/data/quirks";
import type { SceneIntent, SceneType } from "@/events/types";

const DEFAULT_TEXT: Record<SceneType, string> = {
  hungry: "I could really use something to eat.",
  tired: "I need a little rest.",
  bored: "Can we do something fun?",
  lonely: "I would like to talk for a bit.",
  quirk: "Something oddly charming is happening.",
};

const TAG_ENERGETIC = "en\u00e9rgica";
const TAG_ECCENTRIC = "exc\u00e9ntrica";

const TAG_VARIANTS: Partial<Record<SceneType, Record<string, string>>> = {
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

const LOW_MOOD_TEXT: Partial<Record<SceneType, string>> = {
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

function firstMatchingTagText(intent: SceneIntent, resident: Resident): string | null {
  const variants = TAG_VARIANTS[intent.sceneType];
  if (!variants) return null;
  for (const tag of personalityToTags(resident.personality)) {
    const text = variants[tag];
    if (text) return text;
  }
  return null;
}

export function sceneTextFor(intent: SceneIntent, resident: Resident): string {
  if (intent.sceneType === "quirk" && intent.cause.kind === "quirk") {
    return QUIRK_TEXT[intent.cause.quirkId] ?? findQuirk(intent.cause.quirkId)?.name ?? DEFAULT_TEXT.quirk;
  }

  if (resident.needs.mood <= LOW_MOOD_THRESHOLD) {
    const lowMoodText = LOW_MOOD_TEXT[intent.sceneType];
    if (lowMoodText) return lowMoodText;
  }

  return firstMatchingTagText(intent, resident) ?? DEFAULT_TEXT[intent.sceneType];
}
