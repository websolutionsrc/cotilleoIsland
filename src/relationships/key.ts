import type { ResidentId } from "@/core/ids";
import type { Relationship } from "./types";

/** Ordena dos ids segun la invariante `a < b` (orden lexicografico de string). */
export function orderedPair(x: ResidentId, y: ResidentId): [ResidentId, ResidentId] {
  return x < y ? [x, y] : [y, x];
}

/**
 * Relacion por defecto para un par que nunca ha interactuado. NO se persiste
 * hasta que haya una interaccion real (regla #0: solo se guarda lo que paso);
 * `findRelationship`/`getRelationship` la generan al vuelo cuando falta.
 */
export function makeDefaultRelationship(x: ResidentId, y: ResidentId): Relationship {
  const [a, b] = orderedPair(x, y);
  return {
    a,
    b,
    friendship: 0,
    tension: 0,
    romance: 0,
    status: "strangers",
    lastInteractionAtMs: null,
  };
}

/** Busca la relacion persistida entre dos residentes, o `null` si no existe aun. */
export function findRelationship(
  relationships: readonly Relationship[],
  x: ResidentId,
  y: ResidentId,
): Relationship | null {
  const [a, b] = orderedPair(x, y);
  return relationships.find((relationship) => relationship.a === a && relationship.b === b) ?? null;
}

/** Como `findRelationship`, pero devuelve la relacion por defecto ("strangers") si falta. */
export function getRelationship(
  relationships: readonly Relationship[],
  x: ResidentId,
  y: ResidentId,
): Relationship {
  return findRelationship(relationships, x, y) ?? makeDefaultRelationship(x, y);
}

/**
 * Reemplaza (o inserta) una relacion en el array, manteniendo la invariante de
 * una sola fila por par. Pura: devuelve un array nuevo.
 */
export function upsertRelationship(
  relationships: readonly Relationship[],
  updated: Relationship,
): Relationship[] {
  const index = relationships.findIndex(
    (relationship) => relationship.a === updated.a && relationship.b === updated.b,
  );
  if (index === -1) return [...relationships, updated];
  return relationships.map((relationship, i) => (i === index ? updated : relationship));
}
