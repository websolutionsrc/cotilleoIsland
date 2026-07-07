export interface Quirk {
  id: string;
  name: string;
}

export const QUIRK_CATALOG: readonly Quirk[] = [
  { id: "talks_to_plants", name: "Talks to plants" },
  { id: "shower_singer", name: "Shower singer" },
  { id: "collects_pebbles", name: "Collects pebbles" },
  { id: "dances_alone", name: "Dances alone" },
] as const;

export function findQuirk(id: string): Quirk | null {
  return QUIRK_CATALOG.find((quirk) => quirk.id === id) ?? null;
}

