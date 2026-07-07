import type { Resident } from "@/core/resident";
import type { ResidentId } from "@/core/ids";

/** Versión actual del esquema de guardado. Incrementar al cambiar la forma de `SaveState`. */
export const CURRENT_SCHEMA_VERSION = 1;

/** Estado de guardado completo, versionado. Ver docs/data_model.md. */
export interface SaveState {
  schemaVersion: number;
  residents: Resident[];
  activeResidentId: ResidentId | null;
}

export function createEmptySaveState(): SaveState {
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    residents: [],
    activeResidentId: null,
  };
}

/** Forma mínima y flexible de un guardado de esquema desconocido/antiguo. */
export type UnknownSaveState = Record<string, unknown>;

/**
 * Migra un `SaveState` guardado (de cualquier versión anterior) a la versión
 * actual. Fase 1 es la primera versión con `SaveState`, así que hoy solo hay
 * un paso "v0 -> v1" (guardados sin `schemaVersion`, p.ej. de un futuro import
 * manual incompleto). Futuras migraciones deben añadirse aquí como pasos
 * incrementales adicionales (v1 -> v2, v2 -> v3, ...), nunca saltando versiones.
 */
export function migrateSaveState(raw: UnknownSaveState): SaveState {
  const version = typeof raw.schemaVersion === "number" ? raw.schemaVersion : 0;

  const state: SaveState =
    version < 1
      ? {
          // v0 -> v1: guardados sin `schemaVersion` (p.ej. de un import manual
          // incompleto, o previos a Fase 1) no tienen forma garantizada.
          schemaVersion: 1,
          residents: Array.isArray(raw.residents) ? (raw.residents as Resident[]) : [],
          activeResidentId:
            typeof raw.activeResidentId === "string"
              ? (raw.activeResidentId as ResidentId)
              : null,
        }
      : (raw as unknown as SaveState);

  // Punto de extensión para el siguiente paso de migración, p.ej.:
  // if (state.schemaVersion < 2) { state = { ...state, schemaVersion: 2, ... }; }

  return state;
}
