import { ignoresCooldown } from "./cooldowns";
import type { SceneIntent } from "./types";

// Economia minima (F5, engine_design_f3-f5.md #4.2): "resolver escena -> +5
// coins (+10 si era urgente)" - interpretado como 5 base O 10 total si es
// urgente (no 5+10). "Urgente" reutiliza EXACTAMENTE la misma nocion que ya
// existe en el motor (`ignoresCooldown`, la unica excepcion documentada de
// cooldown - invariante #8): hoy solo hambre urgente la cumple, pero la
// definicion generaliza sola si el futuro anade mas excepciones de cooldown.
const SCENE_REWARD_COINS = 5;
const URGENT_SCENE_REWARD_COINS = 10;

export function coinsForScene(intent: SceneIntent): number {
  return ignoresCooldown(intent) ? URGENT_SCENE_REWARD_COINS : SCENE_REWARD_COINS;
}
