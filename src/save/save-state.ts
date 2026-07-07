import type { Resident } from "@/core/resident";
import type { ResidentId } from "@/core/ids";
import { DEFAULT_PERSONALITY, type Personality } from "@/core/personality";

/** Versión actual del esquema de guardado. Incrementar al cambiar la forma de `SaveState`. */
export const CURRENT_SCHEMA_VERSION = 2;

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
 * actual, aplicando los pasos incrementales que hagan falta (v0 -> v1 -> v2 ->
 * ...), nunca saltando versiones. Cada paso se aplica solo si la versión del
 * estado en curso lo requiere.
 */
export function migrateSaveState(raw: UnknownSaveState): SaveState {
  const version = typeof raw.schemaVersion === "number" ? raw.schemaVersion : 0;

  let state: SaveState =
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

  if (state.schemaVersion < 2) {
    // v1 -> v2: se añadió el rasgo de personalidad `kindness`. Los guardados
    // v1 no lo tienen (su `personality` no está garantizado a incluirlo pese al
    // tipo estático `Personality`); se rellena con el valor por defecto.
    state = {
      ...state,
      schemaVersion: 2,
      residents: state.residents.map((resident) => {
        const personality = resident.personality as Partial<Personality>;
        if (typeof personality.kindness === "number") return resident;
        return {
          ...resident,
          personality: { ...personality, kindness: DEFAULT_PERSONALITY.kindness } as Personality,
        };
      }),
    };
  }

  // Punto de extensión para el siguiente paso de migración, p.ej.:
  // if (state.schemaVersion < 3) { state = { ...state, schemaVersion: 3, ... }; }

  return state;
}
