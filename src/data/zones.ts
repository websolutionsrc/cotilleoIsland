// Catalogo fijo de zonas (F5). Mismo patron que quirks.ts: lista pequena y
// estable, sin split JSON/validador (no hace falta editarla fuera de codigo).
// engine_design_f3-f5.md #4.1.

export type ZoneId = "residential" | "food_shop" | "clothes_shop" | "plaza" | "workshop";

export interface Zone {
  id: ZoneId;
  name: string;
  /** Numero de residentes necesario para desbloquear (0 = siempre desbloqueada). */
  minResidents: number;
}

// El diseno permite condiciones basadas tambien en stats.scenesResolved, pero
// las 5 zonas del alcance V1 solo usan numero de residentes (regla de oro:
// no construir generalidad que nadie usa todavia).
export const ZONE_CATALOG: readonly Zone[] = [
  { id: "residential", name: "Zona residencial", minResidents: 0 },
  { id: "food_shop", name: "Tienda de comida", minResidents: 1 },
  { id: "clothes_shop", name: "Tienda de ropa", minResidents: 3 },
  { id: "plaza", name: "Plaza", minResidents: 5 },
  { id: "workshop", name: "Taller", minResidents: 8 },
];

export function findZone(id: ZoneId): Zone | undefined {
  return ZONE_CATALOG.find((zone) => zone.id === id);
}

/** Todas las zonas que DEBERIAN estar desbloqueadas dado el numero de residentes actual. */
export function evaluateZoneUnlocks(residentCount: number): ZoneId[] {
  return ZONE_CATALOG.filter((zone) => residentCount >= zone.minResidents).map((zone) => zone.id);
}

/**
 * Zonas que se desbloquean POR PRIMERA VEZ dado el numero de residentes
 * actual, comparado con lo ya persistido (`unlockedZoneIds`). Pura: no decide
 * como se persiste ni genera la escena de celebracion (F5.2/F5.3).
 */
export function newlyUnlockedZones(
  residentCount: number,
  alreadyUnlocked: readonly ZoneId[],
): ZoneId[] {
  return evaluateZoneUnlocks(residentCount).filter((id) => !alreadyUnlocked.includes(id));
}

/**
 * Zonas desbloqueadas que aun no tuvieron su escena `zone_opening` resuelta
 * (F5.3). Distinto de `newlyUnlockedZones`: esa mira el CRUCE de umbral en un
 * instante; esta mira que celebraciones siguen pendientes en cualquier
 * momento (el jugador pudo desbloquear una zona y cerrar la app antes de
 * resolver la escena). `celebratedZoneIds` se persiste aparte de
 * `unlockedZoneIds` porque el `sceneLog` (cap 20) no sirve para un disparador
 * de una sola vez que debe sobrevivir a mucha actividad posterior.
 */
export function pendingZoneCelebrations(
  unlockedZoneIds: readonly ZoneId[],
  celebratedZoneIds: readonly ZoneId[],
): ZoneId[] {
  return unlockedZoneIds.filter((id) => !celebratedZoneIds.includes(id));
}
