// Proyecciones puras y deterministas de `Personality`. Los 6 sliders son la
// ÚNICA fuente de verdad (ver docs/data_model.md, docs/adr/0004-personality-model.md):
// tags, categoría y expresión se recalculan siempre a partir de ellos y NUNCA se
// guardan en el SaveState ni se editan por separado. TS puro, sin Phaser.

import { PERSONALITY_KEYS, type Personality } from "./personality";

/** Umbral a partir del cual un rasgo se considera "alto". */
const HIGH_THRESHOLD = 70;
/** Umbral por debajo del cual un rasgo se considera "bajo". */
const LOW_THRESHOLD = 30;
/** Punto medio de la escala 0-100, usado para medir "extremidad" (distancia al centro). */
const MID_POINT = 50;
/** Distancia mínima al centro para que un rasgo cuente como extremo (equivale a >=70 o <=30). */
const EXTREME_DISTANCE = HIGH_THRESHOLD - MID_POINT;

/** Máximo de tags devueltas por `personalityToTags`. */
const MAX_TAGS = 3;

/**
 * Etiqueta de un rasgo en su banda extrema, o `null` si ese rasgo no tiene
 * etiqueta en esa banda (p.ej. `romanticism` bajo no genera tag) o no es extremo.
 */
function traitTag(key: keyof Personality, value: number): string | null {
  const isHigh = value >= HIGH_THRESHOLD;
  const isLow = value <= LOW_THRESHOLD;

  switch (key) {
    case "energy":
      if (isHigh) return "enérgica";
      if (isLow) return "tranquila";
      return null;
    case "sociability":
      if (isHigh) return "sociable";
      if (isLow) return "reservada";
      return null;
    case "patience":
      if (isHigh) return "paciente";
      if (isLow) return "impaciente";
      return null;
    case "weirdness":
      if (isHigh) return "excéntrica";
      if (isLow) return "convencional";
      return null;
    case "romanticism":
      if (isHigh) return "romántica";
      return null; // bajo: sin tag propia (evita etiquetas "antirrománticas" negativas).
    case "kindness":
      if (isHigh) return "amable";
      if (isLow) return "borde";
      return null;
    default:
      return null;
  }
}

/**
 * Traduce los 6 sliders de personalidad en hasta 3 etiquetas de texto ("tags"),
 * ordenadas por extremidad (distancia a 50, de mayor a menor). Determinista:
 * mismos sliders, mismas tags, siempre. Desempates entre rasgos igual de
 * extremos se resuelven por el orden fijo de `PERSONALITY_KEYS`.
 *
 * Si ningún rasgo cae en banda extrema (alto >= 70, bajo <= 30), devuelve
 * `["equilibrada"]`.
 */
export function personalityToTags(p: Personality): string[] {
  const extremeEntries = PERSONALITY_KEYS.map((key) => {
    const value = p[key];
    return {
      key,
      distance: Math.abs(value - MID_POINT),
      tag: traitTag(key, value),
    };
  }).filter((entry) => entry.tag !== null && entry.distance >= EXTREME_DISTANCE);

  // Array.prototype.sort es estable (ES2019+): a igual distancia se conserva
  // el orden original de PERSONALITY_KEYS, dando un desempate fijo.
  extremeEntries.sort((a, b) => b.distance - a.distance);

  const tags = extremeEntries.slice(0, MAX_TAGS).map((entry) => entry.tag as string);
  return tags.length > 0 ? tags : ["equilibrada"];
}

/** Las 4 familias amplias de personalidad (inspiradas en, pero no iguales a, Tomodachi Life). */
export type PersonalityCategory = "Sociable" | "Reservada" | "Cariñosa" | "Excéntrica";

/**
 * Clasifica la personalidad en una de 4 familias amplias, usadas solo para dar
 * identidad visual rápida por defecto (color de avatar/tono), nunca como dato
 * editable ni persistido. Determinista: calcula un score 0-200 por familia a
 * partir de los sliders relevantes y elige el máximo; en empate exacto gana la
 * familia que aparece antes en la lista fija de abajo.
 */
export function personalityCategory(p: Personality): PersonalityCategory {
  const scores: { name: PersonalityCategory; score: number }[] = [
    // Alta sociabilidad + energía: le gusta estar rodeada de gente y moverse.
    { name: "Sociable", score: p.sociability + p.energy },
    // Baja sociabilidad: cuanto más baja, más "Reservada" (escala a 0-200).
    { name: "Reservada", score: (100 - p.sociability) * 2 },
    // Alta amabilidad + paciencia: cálida y tolerante con los demás.
    { name: "Cariñosa", score: p.kindness + p.patience },
    // Alta rareza: impredecible (escala a 0-200 para ser comparable).
    { name: "Excéntrica", score: p.weirdness * 2 },
  ];

  return scores.reduce((best, current) => (current.score > best.score ? current : best)).name;
}

/**
 * Hint mínimo de pose/idle para el render (placeholder), derivado del rasgo
 * dominante. Prioridad fija (primer rasgo que aplica gana): energy alto,
 * kindness alto, patience bajo, weirdness alto; si ninguno aplica, "neutral".
 */
export function personalityExpression(p: Personality): string {
  if (p.energy >= HIGH_THRESHOLD) return "animada";
  if (p.kindness >= HIGH_THRESHOLD) return "sonriente";
  if (p.patience <= LOW_THRESHOLD) return "seria";
  if (p.weirdness >= HIGH_THRESHOLD) return "peculiar";
  return "neutral";
}
