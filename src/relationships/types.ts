import type { ResidentId } from "@/core/ids";

// Estados de relacion (F4). Persistido: una transicion es un hito con memoria
// (regla derivado-vs-persistido, engine_design_f3-f5.md #0), nunca un bucket
// recalculado desde friendship/romance.
export type RelationshipStatus =
  | "strangers"
  | "acquaintances"
  | "friends"
  | "besties"
  | "fighting"
  | "dating"
  | "partners"; // partners cubre convivencia/matrimonio

export const RELATIONSHIP_MIN = 0;
export const RELATIONSHIP_MAX = 100;

/**
 * Relacion entre dos residentes. Clave normalizada `a < b` (orden lexicografico
 * del ResidentId) para que exista una sola fila por par, nunca (a,b) y (b,a).
 * Ver `key.ts` para los helpers que garantizan esta invariante.
 */
export interface Relationship {
  a: ResidentId;
  b: ResidentId;
  friendship: number;
  tension: number;
  romance: number;
  status: RelationshipStatus;
  lastInteractionAtMs: number | null;
}
