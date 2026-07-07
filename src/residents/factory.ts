// Creación de residentes con defaults sensatos. Función pura: mismas entradas,
// misma salida (salvo el sufijo aleatorio del id, ver src/core/ids.ts).

import { createResidentId, type ResidentId } from "@/core/ids";
import { DEFAULT_PERSONALITY, type Personality } from "@/core/personality";
import { DEFAULT_NEEDS, type Needs } from "@/core/needs";
import { DEFAULT_AVATAR, type Avatar } from "@/core/avatar";
import type { Resident } from "@/core/resident";
import { validateResidentName, validatePersonality } from "./validation";

export interface CreateResidentInput {
  /** Si no se indica, se genera uno nuevo a partir del nombre. */
  id?: ResidentId;
  name: string;
  personality?: Partial<Personality>;
  needs?: Partial<Needs>;
  avatar?: Partial<Avatar>;
}

/** Se lanza cuando los datos de entrada no pasan validación. */
export class ResidentValidationError extends Error {
  constructor(public readonly errors: string[]) {
    super(`Residente inválido: ${errors.join("; ")}`);
    this.name = "ResidentValidationError";
  }
}

/**
 * Crea un residente completo aplicando defaults a los campos no indicados.
 * Valida nombre y personalidad; lanza `ResidentValidationError` si no son válidos.
 */
export function createResident(input: CreateResidentInput): Resident {
  const nameResult = validateResidentName(input.name);
  const personalityResult = validatePersonality({
    ...DEFAULT_PERSONALITY,
    ...input.personality,
  });

  const errors = [
    ...(nameResult.ok ? [] : nameResult.errors),
    ...(personalityResult.ok ? [] : personalityResult.errors),
  ];
  if (errors.length > 0 || !nameResult.ok || !personalityResult.ok) {
    throw new ResidentValidationError(errors);
  }

  return {
    id: input.id ?? createResidentId(nameResult.value),
    name: nameResult.value,
    avatar: { ...DEFAULT_AVATAR, ...input.avatar },
    personality: personalityResult.value,
    needs: { ...DEFAULT_NEEDS, ...input.needs },
  };
}

export interface UpdateResidentInput {
  name?: string;
  personality?: Partial<Personality>;
  avatar?: Partial<Avatar>;
}

/**
 * Devuelve una copia de `resident` con el nombre y/o la personalidad editados
 * (usado por el panel de edición). Valida igual que `createResident`; no muta
 * el residente original.
 */
export function updateResident(resident: Resident, changes: UpdateResidentInput): Resident {
  const nameResult = validateResidentName(changes.name ?? resident.name);
  const personalityResult = validatePersonality({
    ...resident.personality,
    ...changes.personality,
  });

  const errors = [
    ...(nameResult.ok ? [] : nameResult.errors),
    ...(personalityResult.ok ? [] : personalityResult.errors),
  ];
  if (errors.length > 0 || !nameResult.ok || !personalityResult.ok) {
    throw new ResidentValidationError(errors);
  }

  return {
    ...resident,
    name: nameResult.value,
    avatar: { ...resident.avatar, ...changes.avatar },
    personality: personalityResult.value,
  };
}
