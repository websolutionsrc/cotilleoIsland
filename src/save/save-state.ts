import type { Resident } from "@/core/resident";
import type { ResidentId } from "@/core/ids";
import { DEFAULT_PERSONALITY, type Personality } from "@/core/personality";
import { normalizeNeeds, type Needs } from "@/core/needs";
import type { PantryEntry } from "@/core/pantry";
import {
  SCENE_LOG_CAP,
  SOCIAL_SCENE_TYPES,
  type SceneLogEntry,
  type SceneStats,
  type SceneType,
} from "@/events/types";
import { orderedPair, type Relationship, type RelationshipStatus } from "@/relationships";
import { FOOD_CATALOG } from "@/data/foods";
import { ZONE_CATALOG, evaluateZoneUnlocks, type ZoneId } from "@/data/zones";

/** Versión actual del esquema de guardado. Incrementar al cambiar la forma de `SaveState`. */
export const CURRENT_SCHEMA_VERSION = 7;

/** Estado de guardado completo, versionado. Ver docs/data_model.md. */
export interface SaveState {
  schemaVersion: number;
  residents: Resident[];
  activeResidentId: ResidentId | null;
  needsUpdatedAtMs: number | null;
  sceneLog: SceneLogEntry[];
  stats: SceneStats;
  relationships: Relationship[];
  wallet: { coins: number };
  unlockedZoneIds: ZoneId[];
  pantry: PantryEntry[];
  celebratedZoneIds: ZoneId[];
}

const STARTER_COINS = 50;
const STARTER_PANTRY_QTY = 3;

/** Despensa inicial: 3 unidades de la comida más barata del catálogo. */
function starterPantry(): PantryEntry[] {
  const cheapest = [...FOOD_CATALOG].sort((a, b) => a.price - b.price)[0];
  return cheapest ? [{ itemId: cheapest.id, qty: STARTER_PANTRY_QTY }] : [];
}

export function createEmptySaveState(): SaveState {
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    residents: [],
    activeResidentId: null,
    needsUpdatedAtMs: null,
    sceneLog: [],
    stats: { scenesResolved: 0 },
    relationships: [],
    wallet: { coins: STARTER_COINS },
    unlockedZoneIds: evaluateZoneUnlocks(0), // = ["residential"], siempre disponible
    pantry: starterPantry(),
    // La zona residencial siempre esta desbloqueada desde el inicio: no es un
    // hito que "abrir", asi que nace ya celebrada (evita una escena
    // zone_opening espuria en la primerisima carga, antes de que exista
    // ningun residente que pueda protagonizarla).
    celebratedZoneIds: evaluateZoneUnlocks(0),
  };
}

/** Forma mínima y flexible de un guardado de esquema desconocido/antiguo. */
export type UnknownSaveState = Record<string, unknown>;

const SCENE_TYPES: readonly SceneType[] = [
  "hungry",
  "tired",
  "bored",
  "lonely",
  "quirk",
  "zone_opening",
  ...SOCIAL_SCENE_TYPES,
];

function isSceneType(value: unknown): value is SceneType {
  return typeof value === "string" && SCENE_TYPES.includes(value as SceneType);
}

function normalizeSceneLogEntry(entry: unknown, nowMs: number): SceneLogEntry | null {
  if (entry === null || typeof entry !== "object") return null;
  const raw = entry as Record<string, unknown>;
  if (!isSceneType(raw.sceneType) || !Array.isArray(raw.participants)) return null;
  const participants = raw.participants.filter(
    (participant): participant is ResidentId => typeof participant === "string",
  );
  if (participants.length === 0) return null;
  const rawAtMs = typeof raw.atMs === "number" && Number.isFinite(raw.atMs) ? raw.atMs : nowMs;
  return {
    sceneType: raw.sceneType,
    participants,
    atMs: Math.min(Math.max(0, Math.round(rawAtMs)), nowMs),
  };
}

function normalizeSceneLog(rawSceneLog: unknown, nowMs: number): SceneLogEntry[] {
  if (!Array.isArray(rawSceneLog)) return [];
  return rawSceneLog
    .map((entry) => normalizeSceneLogEntry(entry, nowMs))
    .filter((entry): entry is SceneLogEntry => entry !== null)
    .slice(-SCENE_LOG_CAP);
}

function normalizeStats(rawStats: unknown): SceneStats {
  if (rawStats === null || typeof rawStats !== "object") return { scenesResolved: 0 };
  const scenesResolved = (rawStats as Record<string, unknown>).scenesResolved;
  return {
    scenesResolved:
      typeof scenesResolved === "number" && Number.isFinite(scenesResolved)
        ? Math.max(0, Math.round(scenesResolved))
        : 0,
  };
}

const RELATIONSHIP_STATUSES: readonly RelationshipStatus[] = [
  "strangers",
  "acquaintances",
  "friends",
  "besties",
  "fighting",
  "dating",
  "partners",
];

function isRelationshipStatus(value: unknown): value is RelationshipStatus {
  return typeof value === "string" && RELATIONSHIP_STATUSES.includes(value as RelationshipStatus);
}

function clampRelationshipNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? Math.min(100, Math.max(0, Math.round(value))) : 0;
}

function normalizeRelationship(entry: unknown, nowMs: number): Relationship | null {
  if (entry === null || typeof entry !== "object") return null;
  const raw = entry as Record<string, unknown>;
  if (typeof raw.a !== "string" || typeof raw.b !== "string" || !isRelationshipStatus(raw.status)) {
    return null;
  }
  const [a, b] = orderedPair(raw.a as ResidentId, raw.b as ResidentId);
  const rawLastInteraction = raw.lastInteractionAtMs;
  const lastInteractionAtMs =
    typeof rawLastInteraction === "number" && Number.isFinite(rawLastInteraction)
      ? Math.min(Math.max(0, Math.round(rawLastInteraction)), nowMs)
      : null;

  return {
    a,
    b,
    friendship: clampRelationshipNumber(raw.friendship),
    tension: clampRelationshipNumber(raw.tension),
    romance: clampRelationshipNumber(raw.romance),
    status: raw.status,
    lastInteractionAtMs,
  };
}

function normalizeRelationships(raw: unknown, nowMs: number): Relationship[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((entry) => normalizeRelationship(entry, nowMs))
    .filter((entry): entry is Relationship => entry !== null);
}

function normalizeWallet(raw: unknown): { coins: number } {
  if (raw === null || typeof raw !== "object") return { coins: 0 };
  const coins = (raw as Record<string, unknown>).coins;
  return {
    coins: typeof coins === "number" && Number.isFinite(coins) ? Math.max(0, Math.round(coins)) : 0,
  };
}

const ZONE_IDS: readonly ZoneId[] = ZONE_CATALOG.map((zone) => zone.id);

function isZoneId(value: unknown): value is ZoneId {
  return typeof value === "string" && ZONE_IDS.includes(value as ZoneId);
}

function normalizeUnlockedZoneIds(raw: unknown): ZoneId[] {
  if (!Array.isArray(raw)) return [];
  return [...new Set(raw.filter(isZoneId))];
}

function isRawPantryEntry(value: unknown): value is { itemId: string; qty: number } {
  if (value === null || typeof value !== "object") return false;
  const raw = value as Record<string, unknown>;
  return typeof raw.itemId === "string" && typeof raw.qty === "number" && Number.isFinite(raw.qty);
}

function normalizePantry(raw: unknown): PantryEntry[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(isRawPantryEntry)
    .map((entry) => ({ itemId: entry.itemId, qty: Math.max(0, Math.round(entry.qty)) }))
    .filter((entry) => entry.qty > 0);
}

/**
 * Migra un `SaveState` guardado (de cualquier versión anterior) a la versión
 * actual, aplicando los pasos incrementales que hagan falta (v0 -> v1 -> v2 ->
 * ...), nunca saltando versiones. Cada paso se aplica solo si la versión del
 * estado en curso lo requiere.
 */
export function migrateSaveState(raw: UnknownSaveState, nowMs = Date.now()): SaveState {
  const version = typeof raw.schemaVersion === "number" ? raw.schemaVersion : 0;
  if (version > CURRENT_SCHEMA_VERSION) {
    throw new Error(
      `Cannot load SaveState schema ${version}; current schema is ${CURRENT_SCHEMA_VERSION}`,
    );
  }

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
          needsUpdatedAtMs: null,
          sceneLog: [],
          stats: { scenesResolved: 0 },
          relationships: [],
          wallet: { coins: 0 },
          unlockedZoneIds: [],
          pantry: [],
          celebratedZoneIds: [],
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

  if (state.schemaVersion < 3) {
    // v2 -> v3: F2 añade evolución temporal de necesidades. Los residentes de
    // guardados anteriores pueden tener necesidades parciales; se normalizan y
    // se añade una marca temporal de necesidades a nivel de SaveState.
    state = {
      ...state,
      schemaVersion: 3,
      needsUpdatedAtMs:
        typeof (state as Partial<SaveState>).needsUpdatedAtMs === "number"
          ? (state as SaveState).needsUpdatedAtMs
          : null,
      residents: state.residents.map((resident) => ({
        ...resident,
        needs: normalizeNeeds(resident.needs as Partial<Needs>),
      })),
    };
  }

  if (state.schemaVersion < 4) {
    // v3 -> v4: F3 añade el Event Engine. Se siembran `sceneLog` (cooldowns
    // entre sesiones) y `stats` (contador de por vida) vacíos si faltan.
    state = {
      ...state,
      schemaVersion: 4,
      sceneLog: normalizeSceneLog((state as Partial<SaveState>).sceneLog, nowMs),
      stats: normalizeStats((state as Partial<SaveState>).stats),
    };
  }

  if (state.schemaVersion < 5) {
    // v4 -> v5: F4 añade relaciones entre residentes. Se siembra un array
    // vacío si falta: una relación inexistente ya equivale a "strangers"
    // (regla derivado-vs-persistido de engine_design_f3-f5.md #0), así que no
    // hay nada real que reconstruir para pares que nunca interactuaron.
    state = {
      ...state,
      schemaVersion: 5,
      relationships: normalizeRelationships((state as Partial<SaveState>).relationships, nowMs),
    };
  }

  if (state.schemaVersion < 6) {
    // v5 -> v6: F5 añade economía. Se siembran monedas/despensa iniciales
    // (para no romper de golpe el flujo de comida, que era gratis) y
    // `unlockedZoneIds` se calcula RETROACTIVAMENTE según el número de
    // residentes ya existente, para no disparar celebraciones de zona por
    // progreso que el jugador ya tenía antes de que existiera esta feature.
    const existingWallet = (state as Partial<SaveState>).wallet;
    const existingPantry = (state as Partial<SaveState>).pantry;
    state = {
      ...state,
      schemaVersion: 6,
      wallet: existingWallet ? normalizeWallet(existingWallet) : { coins: STARTER_COINS },
      unlockedZoneIds: evaluateZoneUnlocks(state.residents.length),
      pantry: existingPantry ? normalizePantry(existingPantry) : starterPantry(),
    };
  }

  if (state.schemaVersion < 7) {
    // v6 -> v7: F5.3 añade la celebración de apertura de zona. Se siembra
    // `celebratedZoneIds` = `unlockedZoneIds` RETROACTIVAMENTE: las zonas ya
    // desbloqueadas antes de que existiera esta feature no deben disparar de
    // golpe una escena `zone_opening` por cada una (mismo patrón que el
    // cálculo retroactivo de `unlockedZoneIds` en v5 -> v6).
    const existingCelebrated = (state as Partial<SaveState>).celebratedZoneIds;
    state = {
      ...state,
      schemaVersion: 7,
      celebratedZoneIds: existingCelebrated
        ? normalizeUnlockedZoneIds(existingCelebrated)
        : [...state.unlockedZoneIds],
    };
  }

  state = {
    ...state,
    sceneLog: normalizeSceneLog(state.sceneLog, nowMs),
    stats: normalizeStats(state.stats),
    relationships: normalizeRelationships(state.relationships, nowMs),
    wallet: normalizeWallet(state.wallet),
    unlockedZoneIds: normalizeUnlockedZoneIds(state.unlockedZoneIds),
    pantry: normalizePantry(state.pantry),
    celebratedZoneIds: normalizeUnlockedZoneIds(state.celebratedZoneIds),
  };

  return state;
}
