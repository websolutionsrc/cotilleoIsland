// Necesidades de un residente. Todos los valores son enteros 0-100.
// F2.1 añade lógica pura para evolucionarlas y aplicar comida; no depende de
// Phaser, storage ni datos JSON.
//
// Semántica (0 = sin necesidad / mínimo, 100 = necesidad máxima), salvo `mood`
// y `energy`, donde 100 es el mejor estado posible:
//   hunger:      0 saciado    -> 100 hambriento
//   mood:        0 triste     -> 100 feliz
//   energy:      0 agotado    -> 100 lleno de energía
//   social_need: 0 satisfecho -> 100 necesita socializar
//   boredom:     0 entretenido-> 100 muy aburrido

export interface Needs {
  hunger: number;
  mood: number;
  energy: number;
  social_need: number;
  boredom: number;
}

export const NEEDS_KEYS: readonly (keyof Needs)[] = [
  "hunger",
  "mood",
  "energy",
  "social_need",
  "boredom",
];

export const NEEDS_MIN = 0;
export const NEEDS_MAX = 100;

export const HUNGER_REQUEST_THRESHOLD = 70;
export const HUNGER_URGENT_THRESHOLD = 90;
export const LOW_MOOD_THRESHOLD = 30;

/** Un residente recién creado empieza cómodo: sin hambre, de buen humor y descansado. */
export const DEFAULT_NEEDS: Needs = {
  hunger: 20,
  mood: 70,
  energy: 80,
  social_need: 30,
  boredom: 20,
};

export type NeedsDelta = Partial<Record<keyof Needs, number>>;

export interface FoodEffect {
  needsDelta: NeedsDelta;
}

export interface NeedsStatus {
  wantsFood: boolean;
  urgentlyNeedsFood: boolean;
  lowMood: boolean;
}

const MS_PER_HOUR = 60 * 60 * 1000;

const DEFAULT_DECAY_PER_HOUR: NeedsDelta = {
  hunger: 8,
  mood: -3,
  energy: -4,
  social_need: 5,
  boredom: 6,
};

export function clampNeedValue(value: number): number {
  if (!Number.isFinite(value)) return NEEDS_MIN;
  return Math.min(NEEDS_MAX, Math.max(NEEDS_MIN, Math.round(value)));
}

export function normalizeNeeds(needs: Partial<Needs>): Needs {
  return {
    hunger: clampNeedValue(needs.hunger ?? DEFAULT_NEEDS.hunger),
    mood: clampNeedValue(needs.mood ?? DEFAULT_NEEDS.mood),
    energy: clampNeedValue(needs.energy ?? DEFAULT_NEEDS.energy),
    social_need: clampNeedValue(needs.social_need ?? DEFAULT_NEEDS.social_need),
    boredom: clampNeedValue(needs.boredom ?? DEFAULT_NEEDS.boredom),
  };
}

function applyNeedsDelta(needs: Needs, delta: NeedsDelta, multiplier = 1): Needs {
  return normalizeNeeds({
    hunger: needs.hunger + (delta.hunger ?? 0) * multiplier,
    mood: needs.mood + (delta.mood ?? 0) * multiplier,
    energy: needs.energy + (delta.energy ?? 0) * multiplier,
    social_need: needs.social_need + (delta.social_need ?? 0) * multiplier,
    boredom: needs.boredom + (delta.boredom ?? 0) * multiplier,
  });
}

export function decayNeeds(needs: Needs, elapsedMs: number): Needs {
  if (elapsedMs <= 0) return normalizeNeeds(needs);
  return applyNeedsDelta(needs, DEFAULT_DECAY_PER_HOUR, elapsedMs / MS_PER_HOUR);
}

export function applyFoodEffect(needs: Needs, foodEffect: FoodEffect): Needs {
  return applyNeedsDelta(needs, foodEffect.needsDelta);
}

export function needsToStatus(needs: Needs): NeedsStatus {
  const normalized = normalizeNeeds(needs);
  return {
    wantsFood: normalized.hunger >= HUNGER_REQUEST_THRESHOLD,
    urgentlyNeedsFood: normalized.hunger >= HUNGER_URGENT_THRESHOLD,
    lowMood: normalized.mood <= LOW_MOOD_THRESHOLD,
  };
}
