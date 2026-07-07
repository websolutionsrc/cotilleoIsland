// Necesidades de un residente. Todos los valores son enteros 0-100.
// Fase 1 solo define el tipo y sus defaults: el tick que las hace evolucionar
// en el tiempo es de una fase posterior (no incluido aquí).
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

/** Un residente recién creado empieza cómodo: sin hambre, de buen humor y descansado. */
export const DEFAULT_NEEDS: Needs = {
  hunger: 20,
  mood: 70,
  energy: 80,
  social_need: 30,
  boredom: 20,
};
