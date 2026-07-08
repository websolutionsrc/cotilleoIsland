import type { Personality } from "@/core/personality";
import type { Relationship } from "./types";

// Pesos deterministas para la formula de chemistry. Los 4 primeros suman 1.0
// (repartidos sobre romanticism/compatibilidad); tension es una penalizacion
// aparte, no un peso positivo. Ver engine_design_f3-f5.md #3.3.
const ROMANCE_WEIGHT = 0.5;
const WEIRDNESS_COMPAT_WEIGHT = 0.25;
const SOCIABILITY_COMPAT_WEIGHT = 0.15;
const KINDNESS_WEIGHT = 0.1;
const TENSION_PENALTY_WEIGHT = 0.3;

/**
 * Afinidad romantica entre dos residentes concretos (0-100). Proyeccion PURA y
 * determinista (regla #0 de engine_design_f3-f5.md): nunca se persiste ni se
 * edita aparte, se recalcula siempre a partir de los sliders de personalidad
 * de ambos + la relacion actual. Distinto de `Personality.romanticism`, que es
 * la propension individual de un residente (ADR 0004).
 *
 * Ingredientes: media de romanticism de ambos (a mas romantico el par, mas
 * potencial), compatibilidad de weirdness/sociability (cuanto mas parecidos,
 * mas afinidad), media de kindness (calidez ayuda), menos una penalizacion por
 * tension acumulada en la relacion.
 */
export function chemistry(a: Personality, b: Personality, relationship: Relationship): number {
  const romanceBase = (a.romanticism + b.romanticism) / 2;
  const weirdnessCompat = 100 - Math.abs(a.weirdness - b.weirdness);
  const sociabilityCompat = 100 - Math.abs(a.sociability - b.sociability);
  const kindnessAvg = (a.kindness + b.kindness) / 2;

  const raw =
    ROMANCE_WEIGHT * romanceBase +
    WEIRDNESS_COMPAT_WEIGHT * weirdnessCompat +
    SOCIABILITY_COMPAT_WEIGHT * sociabilityCompat +
    KINDNESS_WEIGHT * kindnessAvg -
    TENSION_PENALTY_WEIGHT * relationship.tension;

  return Math.round(Math.min(100, Math.max(0, raw)));
}
