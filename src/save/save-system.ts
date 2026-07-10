import type { Resident } from "@/core/resident";
import type { ResidentId } from "@/core/ids";
import { applyFoodEffect, decayNeeds } from "@/core/needs";
import { addToPantry, pantryQuantity, removeFromPantry } from "@/core/pantry";
import { FOOD_CATALOG } from "@/data/foods";
import { newlyUnlockedZones } from "@/data/zones";
import {
  coinsForScene,
  detectSceneCandidates,
  detectSocialSceneCandidates,
  detectZoneOpeningCandidates,
  isSocialSceneType,
  mulberry32,
  relationshipActionForScene,
  resolveSceneNeeds,
  resolveSocialSceneNeeds,
  seedForResidentDay,
  selectScenes,
  type SceneIntent,
  type SceneResolutionAction,
} from "@/events";
import { SCENE_LOG_CAP } from "@/events/types";
import {
  applyRelationshipAction,
  decayRelationship,
  getRelationship,
  upsertRelationship,
  type Relationship,
  type RelationshipAction,
} from "@/relationships";
import type { StoragePort } from "./storage-port";
import {
  createEmptySaveState,
  migrateSaveState,
  type SaveState,
  type UnknownSaveState,
} from "./save-state";

/** Clave bajo la que se guarda el `SaveState` completo en el storage. */
export const SAVE_STATE_KEY = "cotilleo:save-state";

/** Pares unicos (sin repetir, sin invertidos) de una lista de residentes. */
function residentPairs(residents: readonly Resident[]): Array<[Resident, Resident]> {
  const pairs: Array<[Resident, Resident]> = [];
  for (let i = 0; i < residents.length; i++) {
    for (let j = i + 1; j < residents.length; j++) {
      pairs.push([residents[i]!, residents[j]!]);
    }
  }
  return pairs;
}

/**
 * Fachada de persistencia del juego. No conoce IndexedDB ni localForage
 * directamente: recibe un `StoragePort` por inyección (Dependency Inversion),
 * lo que permite testearla con `InMemoryStorage` sin DOM.
 */
export class SaveSystem {
  constructor(
    private readonly storage: StoragePort,
    private readonly nowMs: () => number = Date.now,
  ) {}

  /** Carga el `SaveState`, aplicando migraciones si hace falta. Nunca devuelve null. */
  async loadState(): Promise<SaveState> {
    const raw = await this.storage.get<UnknownSaveState>(SAVE_STATE_KEY);
    if (raw === null) return createEmptySaveState();
    return migrateSaveState(raw, this.nowMs());
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
      needsUpdatedAtMs: state.needsUpdatedAtMs ?? this.nowMs(),
    };
    await this.persistState(next);
    return next;
  }

  /**
   * Aplica el decaimiento temporal de necesidades y de relaciones (F4), evalua
   * desbloqueos de zona (F5, "se evaluan al abrir" - independiente de si paso
   * tiempo, ya que depende del numero de residentes, no del reloj), y
   * persiste el resultado en una sola escritura. Disenado para llamarse al
   * abrir/cargar la isla, antes de renderizar UI. Sustituye a
   * `applyNeedsDecay` (F2/F3): needs y relaciones comparten el mismo tick de
   * mundo (`needsUpdatedAtMs`).
   *
   * Nota para F5.3: esto persiste `unlockedZoneIds` pero NO expone que zonas
   * son nuevas ni genera la escena `zone_opening` todavia - F5.3 decide como
   * rastrear "ya celebrado" (el sceneLog tiene cap 20 y no sirve para eso).
   */
  async applyWorldDecay(nowMs = this.nowMs()): Promise<SaveState> {
    const state = await this.loadState();
    if (state.residents.length === 0) return state;

    const newlyUnlocked = newlyUnlockedZones(state.residents.length, state.unlockedZoneIds);
    const needsSeedOnly = state.needsUpdatedAtMs === null;
    const elapsedMs = needsSeedOnly ? 0 : Math.max(0, nowMs - state.needsUpdatedAtMs!);

    if (elapsedMs === 0 && newlyUnlocked.length === 0 && !needsSeedOnly) {
      return state;
    }

    const next: SaveState = {
      ...state,
      residents:
        elapsedMs > 0
          ? state.residents.map((resident) => ({
              ...resident,
              needs: decayNeeds(resident.needs, elapsedMs),
            }))
          : state.residents,
      relationships:
        elapsedMs > 0
          ? state.relationships.map((relationship) => decayRelationship(relationship, elapsedMs, nowMs))
          : state.relationships,
      needsUpdatedAtMs: nowMs,
      unlockedZoneIds:
        newlyUnlocked.length > 0 ? [...state.unlockedZoneIds, ...newlyUnlocked] : state.unlockedZoneIds,
    };
    await this.persistState(next);
    return next;
  }

  /**
   * Compra `qty` unidades de una comida del catalogo y las anade a la
   * despensa, descontando el coste total del monedero. Persiste en una sola
   * escritura. Lanza si la comida no existe, `qty` no es positivo, o no hay
   * monedas suficientes (nunca deja el monedero en negativo).
   */
  async buyFood(foodId: string, qty: number): Promise<SaveState> {
    if (qty <= 0) {
      throw new Error("qty must be a positive integer");
    }
    const food = FOOD_CATALOG.find((item) => item.id === foodId);
    if (!food) {
      throw new Error(`Unknown food id: ${foodId}`);
    }

    const state = await this.loadState();
    const totalCost = food.price * qty;
    if (state.wallet.coins < totalCost) {
      throw new Error("Not enough coins");
    }

    const next: SaveState = {
      ...state,
      wallet: { coins: state.wallet.coins - totalCost },
      pantry: addToPantry(state.pantry, foodId, qty),
    };
    await this.persistState(next);
    return next;
  }

  /**
   * Da comida directamente a un residente (fuera de una escena de hambre),
   * consumiendo 1 unidad de la despensa. Persiste needs+pantry en una sola
   * escritura (invariante #5). Lanza si el residente/comida no existen o si
   * no queda stock (nunca deja la despensa en negativo).
   */
  async giveFoodFromPantry(residentId: ResidentId, foodId: string): Promise<SaveState> {
    const food = FOOD_CATALOG.find((item) => item.id === foodId);
    if (!food) {
      throw new Error(`Unknown food id: ${foodId}`);
    }

    const state = await this.loadState();
    const resident = state.residents.find((candidate) => candidate.id === residentId);
    if (!resident) {
      throw new Error("Cannot give food to missing resident");
    }
    if (pantryQuantity(state.pantry, foodId) <= 0) {
      throw new Error(`No pantry stock for food id: ${foodId}`);
    }

    const updatedResident: Resident = { ...resident, needs: applyFoodEffect(resident.needs, food) };
    const next: SaveState = {
      ...state,
      residents: state.residents.map((candidate) =>
        candidate.id === updatedResident.id ? updatedResident : candidate,
      ),
      pantry: removeFromPantry(state.pantry, foodId, 1),
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
      sceneLog: state.sceneLog.filter((entry) => !entry.participants.includes(id)),
      relationships: state.relationships.filter((relationship) => relationship.a !== id && relationship.b !== id),
    };
    await this.persistState(next);
    return next;
  }

  /** Relacion entre dos residentes, o la relacion por defecto ("strangers") si nunca interactuaron. */
  async getRelationshipBetween(x: ResidentId, y: ResidentId): Promise<Relationship> {
    const state = await this.loadState();
    return getRelationship(state.relationships, x, y);
  }

  /**
   * Aplica una accion social (F4) sobre la relacion entre dos residentes y
   * persiste el resultado en una sola escritura. Independiente del pipeline
   * de `SceneIntent`/`resolveScene` (que F4.3 conectara aqui cuando existan
   * los `sceneType` sociales); usable ya para tests/depuracion o UI directa.
   */
  async resolveRelationshipAction(
    residentAId: ResidentId,
    residentBId: ResidentId,
    action: RelationshipAction,
    nowMs = this.nowMs(),
  ): Promise<SaveState> {
    const state = await this.loadState();
    const residentA = state.residents.find((candidate) => candidate.id === residentAId);
    const residentB = state.residents.find((candidate) => candidate.id === residentBId);
    if (!residentA || !residentB) {
      throw new Error("Cannot resolve relationship action for missing resident(s)");
    }

    const current = getRelationship(state.relationships, residentAId, residentBId);
    const updated = applyRelationshipAction(
      current,
      action,
      { a: residentA.personality, b: residentB.personality },
      nowMs,
    );

    const next: SaveState = {
      ...state,
      relationships: upsertRelationship(state.relationships, updated),
    };
    await this.persistState(next);
    return next;
  }

  /**
   * Candidatas "solo" (por residente) + sociales (por par, F4): mismo pipeline
   * detect->cooldown->score->select, la lista de detectores simplemente creció.
   */
  async computeActiveScenes(nowMs = this.nowMs(), seed?: number): Promise<SceneIntent[]> {
    const state = await this.loadState();
    const soloCandidates = state.residents.flatMap((resident, index) => {
      const sceneSeed = seed === undefined ? seedForResidentDay(resident.id, nowMs) : seed + index;
      return detectSceneCandidates(resident, nowMs, {
        rng: mulberry32(sceneSeed),
      });
    });
    const socialCandidates = residentPairs(state.residents).flatMap(([a, b]) => {
      const relationship = getRelationship(state.relationships, a.id, b.id);
      return detectSocialSceneCandidates(a, b, relationship, nowMs);
    });
    const zoneOpeningCandidates = detectZoneOpeningCandidates(
      state.residents,
      state.unlockedZoneIds,
      state.celebratedZoneIds,
      nowMs,
    );
    return selectScenes([...soloCandidates, ...socialCandidates, ...zoneOpeningCandidates], {
      sceneLog: state.sceneLog,
      nowMs,
    });
  }

  /**
   * Resuelve una escena y persiste en una sola escritura (invariante #5).
   * `action` es obligatoria para escenas "solo" (elige como se resuelve);
   * las escenas sociales (F4) se ignoran porque resuelven de forma
   * determinista via el mapeo 1:1 sceneType->RelationshipAction - no hay
   * eleccion del jugador mas alla de "resolver".
   */
  async resolveScene(
    intent: SceneIntent,
    action?: SceneResolutionAction,
    nowMs = this.nowMs(),
  ): Promise<SaveState> {
    const state = await this.loadState();

    if (isSocialSceneType(intent.sceneType)) {
      const [residentAId, residentBId] = intent.participants;
      const residentA = state.residents.find((candidate) => candidate.id === residentAId);
      const residentB = state.residents.find((candidate) => candidate.id === residentBId);
      if (!residentA || !residentB) {
        throw new Error("Cannot resolve social scene for missing resident(s)");
      }

      const { a: updatedA, b: updatedB } = resolveSocialSceneNeeds(residentA, residentB, intent.sceneType);
      const currentRelationship = getRelationship(state.relationships, residentA.id, residentB.id);
      const updatedRelationship = applyRelationshipAction(
        currentRelationship,
        relationshipActionForScene(intent.sceneType),
        { a: updatedA.personality, b: updatedB.personality },
        nowMs,
      );

      const next: SaveState = {
        ...state,
        residents: state.residents.map((candidate) => {
          if (candidate.id === updatedA.id) return updatedA;
          if (candidate.id === updatedB.id) return updatedB;
          return candidate;
        }),
        relationships: upsertRelationship(state.relationships, updatedRelationship),
        sceneLog: [
          ...state.sceneLog,
          { sceneType: intent.sceneType, participants: intent.participants, atMs: nowMs },
        ].slice(-SCENE_LOG_CAP),
        stats: { scenesResolved: state.stats.scenesResolved + 1 },
        wallet: { coins: state.wallet.coins + coinsForScene(intent) },
      };
      await this.persistState(next);
      return next;
    }

    if (!action) {
      throw new Error(`Scene ${intent.sceneType} requires a SceneResolutionAction`);
    }
    const residentId = intent.participants[0];
    const resident = state.residents.find((candidate) => candidate.id === residentId);
    if (!resident) {
      throw new Error("Cannot resolve scene for missing resident");
    }

    if (action.kind === "give_food" && pantryQuantity(state.pantry, action.foodId) <= 0) {
      throw new Error(`No pantry stock for food id: ${action.foodId}`);
    }

    const updatedResident = resolveSceneNeeds(resident, intent, action);
    const celebratedZoneId =
      intent.sceneType === "zone_opening" && intent.cause.kind === "zone" ? intent.cause.zoneId : null;
    const next: SaveState = {
      ...state,
      residents: state.residents.map((candidate) =>
        candidate.id === updatedResident.id ? updatedResident : candidate,
      ),
      sceneLog: [
        ...state.sceneLog,
        { sceneType: intent.sceneType, participants: intent.participants, atMs: nowMs },
      ].slice(-SCENE_LOG_CAP),
      stats: { scenesResolved: state.stats.scenesResolved + 1 },
      wallet: { coins: state.wallet.coins + coinsForScene(intent) },
      celebratedZoneIds: celebratedZoneId
        ? [...state.celebratedZoneIds, celebratedZoneId]
        : state.celebratedZoneIds,
      pantry: action.kind === "give_food" ? removeFromPantry(state.pantry, action.foodId, 1) : state.pantry,
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
