// Personalidad de un residente. Todos los rasgos son enteros 0-100.
// Ver docs/data_model.md.

export interface Personality {
  /** Nivel de actividad/vitalidad general. */
  energy: number;
  /** Cuánto disfruta estar con otros residentes. */
  sociability: number;
  /** Tolerancia a la frustración / rapidez para enfadarse. */
  patience: number;
  /** Cuán excéntrico o impredecible es. */
  weirdness: number;
  /** Predisposición al romance. */
  romanticism: number;
  /** Amabilidad/calidez. Eje que en fases futuras disparará escenas de conflicto/ayuda. */
  kindness: number;
}

export const PERSONALITY_KEYS: readonly (keyof Personality)[] = [
  "energy",
  "sociability",
  "patience",
  "weirdness",
  "romanticism",
  "kindness",
];

export const PERSONALITY_MIN = 0;
export const PERSONALITY_MAX = 100;

/** Valores por defecto: un residente "neutro" al crearse, ni extremo ni plano. */
export const DEFAULT_PERSONALITY: Personality = {
  energy: 50,
  sociability: 50,
  patience: 50,
  weirdness: 50,
  romanticism: 50,
  kindness: 50,
};
