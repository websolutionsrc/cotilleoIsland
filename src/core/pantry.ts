// Despensa del jugador (F5): la comida deja de ser gratis, se compra y se
// consume de aqui. engine_design_f3-f5.md #4.2. Pura, sin storage.

export interface PantryEntry {
  itemId: string;
  qty: number;
}

export function pantryQuantity(pantry: readonly PantryEntry[], itemId: string): number {
  return pantry.find((entry) => entry.itemId === itemId)?.qty ?? 0;
}

/** Anade unidades (compra). Pura: devuelve un array nuevo. */
export function addToPantry(
  pantry: readonly PantryEntry[],
  itemId: string,
  qty: number,
): PantryEntry[] {
  if (qty <= 0) return [...pantry];
  const existing = pantry.find((entry) => entry.itemId === itemId);
  if (!existing) return [...pantry, { itemId, qty }];
  return pantry.map((entry) => (entry.itemId === itemId ? { ...entry, qty: entry.qty + qty } : entry));
}

/**
 * Quita unidades (consumo al dar comida). Clampa en 0 y elimina la entrada si
 * llega a 0 (mantiene la despensa sin filas vacias). Pura.
 */
export function removeFromPantry(
  pantry: readonly PantryEntry[],
  itemId: string,
  qty: number,
): PantryEntry[] {
  if (qty <= 0) return [...pantry];
  const existing = pantry.find((entry) => entry.itemId === itemId);
  if (!existing) return [...pantry];
  const nextQty = Math.max(0, existing.qty - qty);
  if (nextQty === 0) return pantry.filter((entry) => entry.itemId !== itemId);
  return pantry.map((entry) => (entry.itemId === itemId ? { ...entry, qty: nextQty } : entry));
}
