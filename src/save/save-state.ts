import type { Resident } from "@/core/resident";
import type { ResidentId } from "@/core/ids";
import { DEFAULT_PERSONALITY, type Personality } from "@/core/personality";
import { normalizeNeeds, type Needs } from "@/core/needs";
import { SCENE_LOG_CAP, type SceneLogEntry, type SceneStats, type SceneType } from "@/events/types";
import { orderedPair, type Relationship, type RelationshipStatus } from "@/relationships";

/** Versión actual del esquema de guardado. Incrementar al cambiar la forma de `SaveState`. */
export const CURRENT_SCHEMA_VERSION = 5;

/** Estado de guardado completo, versionado. Ver docs/data_model.md. */
export interface SaveState {
  schemaVersion: number;
  residents: Resident[];
  activeResidentId: ResidentId | null;
  needsUpdatedAtMs: number | null;
  sceneLog: SceneLogEntry[];
  stats: SceneStats;
  relationships: Relationship[];
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
  };
}

/** Forma mínima y flexible de un guardado de esquema desconocido/antiguo. */
export type UnknownSaveState = Record<string, unknown>;

const SCENE_TYPES: readonly SceneType[] = ["hungry", "tired", "bored", "lonely", "quirk"];

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

  state = {
    ...state,
    sceneLog: normalizeSceneLog(state.sceneLog, nowMs),
    stats: normalizeStats(state.stats),
    relationships: normalizeRelationships(state.relationships, nowMs),
  };

  return state;
}
