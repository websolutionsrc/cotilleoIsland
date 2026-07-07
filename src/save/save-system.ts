import type { Resident } from "@/core/resident";
import type { ResidentId } from "@/core/ids";
import type { StoragePort } from "./storage-port";
import {
  createEmptySaveState,
  migrateSaveState,
  type SaveState,
  type UnknownSaveState,
} from "./save-state";

/** Clave bajo la que se guarda el `SaveState` completo en el storage. */
export const SAVE_STATE_KEY = "cotilleo:save-state";

/**
 * Fachada de persistencia del juego. No conoce IndexedDB ni localForage
 * directamente: recibe un `StoragePort` por inyección (Dependency Inversion),
 * lo que permite testearla con `InMemoryStorage` sin DOM.
 */
export class SaveSystem {
  constructor(private readonly storage: StoragePort) {}

  /** Carga el `SaveState`, aplicando migraciones si hace falta. Nunca devuelve null. */
  async loadState(): Promise<SaveState> {
    const raw = await this.storage.get<UnknownSaveState>(SAVE_STATE_KEY);
    if (raw === null) return createEmptySaveState();
    return migrateSaveState(raw);
  }

  private async persistState(state: SaveState): Promise<void> {
    await this.storage.set(SAVE_STATE_KEY, state);
  }

  /** Crea o actualiza un residente dentro del SaveState y lo persiste. */
  async saveResident(resident: Resident): Promise<SaveState> {
    const state = await this.loadState();
    const index = state.residents.findIndex((r) => r.id === resident.id);
    const residents =
      index >= 0
        ? state.residents.map((r, i) => (i === index ? resident : r))
        : [...state.residents, resident];

    const next: SaveState = {
      ...state,
      residents,
      activeResidentId: state.activeResidentId ?? resident.id,
    };
    await this.persistState(next);
    return next;
  }

  async loadResident(id: ResidentId): Promise<Resident | null> {
    const state = await this.loadState();
    return state.residents.find((r) => r.id === id) ?? null;
  }

  async listResidents(): Promise<Resident[]> {
    const state = await this.loadState();
    return state.residents;
  }

  async removeResident(id: ResidentId): Promise<SaveState> {
    const state = await this.loadState();
    const residents = state.residents.filter((r) => r.id !== id);
    const next: SaveState = {
      ...state,
      residents,
      activeResidentId: state.activeResidentId === id ? null : state.activeResidentId,
    };
    await this.persistState(next);
    return next;
  }

  async setActiveResident(id: ResidentId): Promise<SaveState> {
    const state = await this.loadState();
    const next: SaveState = { ...state, activeResidentId: id };
    await this.persistState(next);
    return next;
  }

  /** Borra todo el guardado (usado en tests y como "reset" manual). */
  async clear(): Promise<void> {
    await this.storage.remove(SAVE_STATE_KEY);
  }
}
