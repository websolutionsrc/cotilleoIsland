// Validación pura de datos de residente: nombre y personalidad.
// Sin efectos secundarios, sin dependencias de Phaser/DOM/storage.

import {
  PERSONALITY_KEYS,
  PERSONALITY_MIN,
  PERSONALITY_MAX,
  type Personality,
} from "@/core/personality";

export const RESIDENT_NAME_MIN_LENGTH = 1;
export const RESIDENT_NAME_MAX_LENGTH = 24;

/** Resultado de una validación: o bien un valor saneado, o una lista de errores. */
export type ValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; errors: string[] };

/** True si el carácter es de control C0 (0-31) o DEL (127); esos se descartan del nombre. */
function isControlChar(ch: string): boolean {
  const code = ch.charCodeAt(0);
  return code <= 31 || code === 127;
}

/**
 * Sanea un nombre de residente: elimina caracteres de control, quita `<`/`>`
 * (para no romper el HTML del panel), colapsa espacios internos y recorta.
 * No valida longitud (eso lo hace `validateResidentName`).
 */
export function sanitizeResidentName(raw: string): string {
  const withoutControl = Array.from(raw).filter((ch) => !isControlChar(ch)).join("");
  return withoutControl
    .replace(/[<>]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Valida (y sanea) el nombre de un residente. Longitud entre 1 y 24 tras sanear. */
export function validateResidentName(raw: string): ValidationResult<string> {
  const errors: string[] = [];
  const sanitized = sanitizeResidentName(raw);

  if (sanitized.length < RESIDENT_NAME_MIN_LENGTH) {
    errors.push("El nombre no puede estar vacío.");
  }
  if (sanitized.length > RESIDENT_NAME_MAX_LENGTH) {
    errors.push(`El nombre no puede superar los ${RESIDENT_NAME_MAX_LENGTH} caracteres.`);
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }
  return { ok: true, value: sanitized };
}

function isValidTraitValue(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    Number.isInteger(value) &&
    value >= PERSONALITY_MIN &&
    value <= PERSONALITY_MAX
  );
}

/** Valida que cada rasgo de personalidad exista y sea un entero en [0, 100]. */
export function validatePersonality(
  input: Partial<Record<keyof Personality, unknown>>,
): ValidationResult<Personality> {
  const errors: string[] = [];
  const value = {} as Personality;

  for (const key of PERSONALITY_KEYS) {
    const raw = input[key];
    if (!isValidTraitValue(raw)) {
      errors.push(
        `"${key}" debe ser un entero entre ${PERSONALITY_MIN} y ${PERSONALITY_MAX}.`,
      );
      continue;
    }
    value[key] = raw;
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }
  return { ok: true, value };
}
