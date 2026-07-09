import { filterScenesOnCooldown } from "./cooldowns";
import type { SceneIntent, SceneLogEntry, SceneType } from "./types";

const SCENE_TYPE_ORDER: readonly SceneType[] = [
  "hungry",
  "tired",
  "argument",
  "lonely",
  "bored",
  "chat",
  "reconcile",
  "zone_opening",
  "confess",
  "propose",
  "flirt",
  "meet",
  "quirk",
];

// Pesos de escenas sociales: decision de implementacion (el diseno solo fija
// los umbrales de deteccion de argument/flirt, no las prioridades relativas).
// argument pesa alto (un conflicto sin resolver debe notarse, como tired);
// meet/flirt son las de menor prioridad (flavor, nunca deben tapar una
// necesidad real); confess/propose son hitos, prioridad media para que se
// noten sin monopolizar la burbuja frente a necesidades urgentes.
const SCENE_SCORE_WEIGHT: Record<SceneType, number> = {
  hungry: 1,
  tired: 0.8,
  argument: 0.85,
  lonely: 0.7,
  bored: 0.6,
  chat: 0.65,
  reconcile: 0.7,
  zone_opening: 0.6, // hito raro (F5.3): misma prioridad media que confess/propose
  confess: 0.6,
  propose: 0.6,
  flirt: 0.5,
  meet: 0.5,
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

/**
 * Elige la mejor escena para cada residente y hasta `maxGlobal` en total.
 *
 * Las escenas sociales (2 participantes) compiten por el hueco de AMBOS
 * residentes a la vez: un residente no puede "conocer a alguien" mientras
 * tiene una necesidad propia mas urgente sin resolver. Por eso una candidata
 * social solo se selecciona si gana el hueco de CADA uno de sus
 * participantes (no basta con ganar el de uno); si no, se descarta entera
 * (el otro residente sigue con su mejor opcion individual).
 */
export function selectScenes(
  candidates: readonly SceneIntent[],
  options: SelectScenesOptions,
): SceneIntent[] {
  const maxGlobal = options.maxGlobal ?? 3;
  const available = filterScenesOnCooldown(candidates, options.sceneLog, options.nowMs);
  const bestByResident = new Map<string, SceneIntent>();

  for (const candidate of available) {
    for (const residentId of candidate.participants) {
      const current = bestByResident.get(residentId);
      if (!current || compareScenes(candidate, current) < 0) {
        bestByResident.set(residentId, candidate);
      }
    }
  }

  const consistent = [...bestByResident.values()].filter((candidate) =>
    candidate.participants.every((residentId) => bestByResident.get(residentId) === candidate),
  );

  // Dedupe por identidad de objeto: una escena social gana el mismo objeto
  // bajo la clave de cada uno de sus participantes.
  const unique = [...new Set(consistent)];

  return unique.sort(compareScenes).slice(0, maxGlobal);
}
