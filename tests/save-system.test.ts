import { describe, expect, it, beforeEach } from "vitest";
import { InMemoryStorage } from "@/save/in-memory-storage";
import { SaveSystem, SAVE_STATE_KEY } from "@/save/save-system";
import { CURRENT_SCHEMA_VERSION, migrateSaveState } from "@/save/save-state";
import { createResident } from "@/residents/factory";
import { DEFAULT_PERSONALITY } from "@/core/personality";
import { DEFAULT_NEEDS } from "@/core/needs";
import type { SceneLogEntry } from "@/events";

class CountingStorage extends InMemoryStorage {
  setCalls = 0;

  override async set<T>(key: string, value: T): Promise<void> {
    this.setCalls += 1;
    await super.set(key, value);
  }
}

describe("SaveSystem con InMemoryStorage", () => {
  let storage: InMemoryStorage;
  let saveSystem: SaveSystem;

  beforeEach(() => {
    storage = new InMemoryStorage();
    saveSystem = new SaveSystem(storage);
  });

  it("empieza con un SaveState vacío en la versión actual", async () => {
    const state = await saveSystem.loadState();
    expect(state).toEqual({
      schemaVersion: CURRENT_SCHEMA_VERSION,
      residents: [],
      activeResidentId: null,
      needsUpdatedAtMs: null,
      sceneLog: [],
      stats: { scenesResolved: 0 },
    });
  });

  it("round-trip: guardar un residente y volver a cargarlo es idéntico", async () => {
    const resident = createResident({ name: "Lina", personality: { sociability: 80 } });

    await saveSystem.saveResident(resident);
    const loaded = await saveSystem.loadResident(resident.id);

    expect(loaded).toEqual(resident);
  });

  it("listResidents devuelve todos los residentes guardados", async () => {
    const a = createResident({ name: "Lina" });
    const b = createResident({ name: "Nico" });

    await saveSystem.saveResident(a);
    await saveSystem.saveResident(b);

    const residents = await saveSystem.listResidents();
    expect(residents).toHaveLength(2);
    expect(residents.map((r) => r.id).sort()).toEqual([a.id, b.id].sort());
  });

  it("guardar un residente con el mismo id lo actualiza en vez de duplicarlo", async () => {
    const resident = createResident({ name: "Lina" });
    await saveSystem.saveResident(resident);

    const renamed = { ...resident, name: "Lina Reyes" };
    await saveSystem.saveResident(renamed);

    const residents = await saveSystem.listResidents();
    expect(residents).toHaveLength(1);
    expect(residents[0]?.name).toBe("Lina Reyes");
  });

  it("el primer residente guardado se marca como activo automáticamente", async () => {
    const resident = createResident({ name: "Lina" });
    const state = await saveSystem.saveResident(resident);
    expect(state.activeResidentId).toBe(resident.id);
  });

  it("guardar un residente inicializa la marca temporal de necesidades", async () => {
    const storage = new InMemoryStorage();
    const saveSystem = new SaveSystem(storage, () => 1234);
    const resident = createResident({ name: "Lina" });

    const state = await saveSystem.saveResident(resident);

    expect(state.needsUpdatedAtMs).toBe(1234);
  });

  it("applyNeedsDecay decae necesidades y persiste la nueva marca temporal", async () => {
    const storage = new InMemoryStorage();
    const saveSystem = new SaveSystem(storage, () => 0);
    const resident = createResident({ name: "Lina", needs: { hunger: 20, mood: 70 } });
    await saveSystem.saveResident(resident);

    const next = await saveSystem.applyNeedsDecay(60 * 60 * 1000);
    const decayed = next.residents[0];

    expect(next.needsUpdatedAtMs).toBe(60 * 60 * 1000);
    expect(decayed?.needs.hunger).toBeGreaterThan(resident.needs.hunger);
    expect(decayed?.needs.mood).toBeLessThan(resident.needs.mood);
    await expect(saveSystem.loadState()).resolves.toEqual(next);
  });

  it("applyNeedsDecay solo siembra timestamp si el guardado no tenía marca temporal", async () => {
    const resident = createResident({ name: "Nico" });
    await storage.set(SAVE_STATE_KEY, {
      schemaVersion: 3,
      residents: [resident],
      activeResidentId: resident.id,
      needsUpdatedAtMs: null,
      sceneLog: [],
      stats: { scenesResolved: 0 },
    });

    const next = await saveSystem.applyNeedsDecay(5000);

    expect(next.needsUpdatedAtMs).toBe(5000);
    expect(next.residents[0]).toEqual(resident);
  });

  it("removeResident lo quita de la lista y limpia activeResidentId si era el activo", async () => {
    const resident = createResident({ name: "Lina" });
    await saveSystem.saveResident(resident);

    const state = await saveSystem.removeResident(resident.id);
    expect(state.residents).toHaveLength(0);
    expect(state.activeResidentId).toBeNull();
  });

  it("clear() borra el SaveState guardado", async () => {
    const resident = createResident({ name: "Lina" });
    await saveSystem.saveResident(resident);

    await saveSystem.clear();
    const raw = await storage.get(SAVE_STATE_KEY);
    expect(raw).toBeNull();

    // Tras borrar, loadState vuelve a devolver un estado vacío (no falla).
    const state = await saveSystem.loadState();
    expect(state.residents).toHaveLength(0);
  });
});

describe("migrateSaveState (migraciones incrementales)", () => {
  it("no cambia un SaveState que ya está en la versión actual", () => {
    const resident = createResident({ name: "Lina" });
    const state = {
      schemaVersion: CURRENT_SCHEMA_VERSION,
      residents: [resident],
      activeResidentId: resident.id,
      needsUpdatedAtMs: 123,
      sceneLog: [],
      stats: { scenesResolved: 0 },
    };

    expect(migrateSaveState(state)).toEqual(state);
  });

  it("migra un guardado sin schemaVersion (v0) rellenando los campos por defecto", () => {
    const legacyRaw = { residents: [] };

    const migrated = migrateSaveState(legacyRaw);

    // v0 pasa por v1 y luego por v2 hasta llegar a la versión actual.
    expect(migrated.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
    expect(migrated.residents).toEqual([]);
    expect(migrated.activeResidentId).toBeNull();
    expect(migrated.needsUpdatedAtMs).toBeNull();
    expect(migrated.sceneLog).toEqual([]);
    expect(migrated.stats).toEqual({ scenesResolved: 0 });
  });

  it("conserva los residentes de un guardado v0 que sí los tenía", () => {
    const resident = createResident({ name: "Nico" });
    const legacyRaw = { residents: [resident], activeResidentId: resident.id };

    const migrated = migrateSaveState(legacyRaw);

    expect(migrated.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
    expect(migrated.residents).toEqual([resident]);
    expect(migrated.activeResidentId).toBe(resident.id);
    expect(migrated.needsUpdatedAtMs).toBeNull();
    expect(migrated.sceneLog).toEqual([]);
    expect(migrated.stats).toEqual({ scenesResolved: 0 });
  });

  it("SaveSystem migra automáticamente un guardado antiguo al cargarlo", async () => {
    const storage = new InMemoryStorage();
    const resident = createResident({ name: "Gala" });
    // Simula un guardado de una versión anterior a Fase 1 (sin schemaVersion).
    await storage.set(SAVE_STATE_KEY, { residents: [resident] });

    const saveSystem = new SaveSystem(storage);
    const state = await saveSystem.loadState();

    expect(state.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
    expect(state.residents).toEqual([resident]);
    expect(state.needsUpdatedAtMs).toBeNull();
    expect(state.sceneLog).toEqual([]);
    expect(state.stats).toEqual({ scenesResolved: 0 });
  });

  it("migra un guardado v1 (sin `kindness`) a v2 rellenando el valor por defecto", () => {
    const resident = createResident({ name: "Nico" });
    const { kindness: _kindness, ...personalityWithoutKindness } = resident.personality;
    const legacyResidentV1 = { ...resident, personality: personalityWithoutKindness };
    const legacyRaw = {
      schemaVersion: 1,
      residents: [legacyResidentV1],
      activeResidentId: resident.id,
    };

    const migrated = migrateSaveState(legacyRaw);

    expect(migrated.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
    expect(migrated.residents[0]?.personality.kindness).toBe(DEFAULT_PERSONALITY.kindness);
    expect(migrated.residents[0]?.personality).toEqual(resident.personality);
    expect(migrated.residents[0]?.needs).toEqual(DEFAULT_NEEDS);
    expect(migrated.sceneLog).toEqual([]);
    expect(migrated.stats).toEqual({ scenesResolved: 0 });
    expect(migrated.needsUpdatedAtMs).toBeNull();
  });

  it("migra un guardado v2 a v3 normalizando necesidades parciales", () => {
    const resident = createResident({ name: "Gala" });
    const legacyRaw = {
      schemaVersion: 2,
      residents: [{ ...resident, needs: { hunger: 150 } }],
      activeResidentId: resident.id,
    };

    const migrated = migrateSaveState(legacyRaw);

    expect(migrated.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
    expect(migrated.needsUpdatedAtMs).toBeNull();
    expect(migrated.residents[0]?.needs).toEqual({ ...DEFAULT_NEEDS, hunger: 100 });
    expect(migrated.sceneLog).toEqual([]);
    expect(migrated.stats).toEqual({ scenesResolved: 0 });
  });

  it("migrates a v3 save to the internal F3 schema with scene log and stats", () => {
    const resident = createResident({ name: "Gala" });
    const migrated = migrateSaveState(
      {
        schemaVersion: 3,
        residents: [resident],
        activeResidentId: resident.id,
        needsUpdatedAtMs: 10,
      },
      1000,
    );

    expect(migrated.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
    expect(migrated.sceneLog).toEqual([]);
    expect(migrated.stats).toEqual({ scenesResolved: 0 });
  });

  it("rejects saves from a newer schema", () => {
    expect(() =>
      migrateSaveState({
        schemaVersion: CURRENT_SCHEMA_VERSION + 1,
        residents: [],
        activeResidentId: null,
        needsUpdatedAtMs: null,
      }),
    ).toThrow(/Cannot load SaveState schema/);
  });

  it("clamps future scene log timestamps while loading", () => {
    const resident = createResident({ name: "Gala" });
    const migrated = migrateSaveState(
      {
        schemaVersion: 4,
        residents: [resident],
        activeResidentId: resident.id,
        needsUpdatedAtMs: 10,
        sceneLog: [{ sceneType: "hungry", participants: [resident.id], atMs: 2000 }],
        stats: { scenesResolved: 1 },
      },
      1000,
    );

    expect(migrated.sceneLog[0]?.atMs).toBe(1000);
  });
});

describe("SaveSystem scenes", () => {
  it("computeActiveScenes does not persist state", async () => {
    const storage = new CountingStorage();
    const saveSystem = new SaveSystem(storage, () => 1000);
    const resident = createResident({ name: "Lina", needs: { hunger: 80 } });
    await saveSystem.saveResident(resident);
    storage.setCalls = 0;

    const scenes = await saveSystem.computeActiveScenes(1000, 123);

    expect(scenes.map((scene) => scene.sceneType)).toEqual(["hungry"]);
    expect(storage.setCalls).toBe(0);
  });

  it("resolveScene persists needs, appends log and increments stats in one write", async () => {
    const storage = new CountingStorage();
    const saveSystem = new SaveSystem(storage, () => 1000);
    const resident = createResident({ name: "Lina", needs: { hunger: 90 } });
    await saveSystem.saveResident(resident);
    const [scene] = await saveSystem.computeActiveScenes(1000, 123);
    storage.setCalls = 0;

    const next = await saveSystem.resolveScene(scene!, {
      kind: "give_food",
      foodEffect: { needsDelta: { hunger: -50 } },
    });

    expect(next.residents[0]?.needs.hunger).toBe(40);
    expect(next.sceneLog).toEqual([
      { sceneType: "hungry", participants: [resident.id], atMs: 1000 },
    ]);
    expect(next.stats.scenesResolved).toBe(1);
    expect(storage.setCalls).toBe(1);
  });

  it("keeps only the latest 20 scene log entries", async () => {
    const storage = new CountingStorage();
    const saveSystem = new SaveSystem(storage, () => 1000);
    const resident = createResident({ name: "Lina", needs: { hunger: 90 } });
    const sceneLog: SceneLogEntry[] = Array.from({ length: 20 }, (_, index) => ({
      sceneType: "bored",
      participants: [resident.id],
      atMs: index,
    }));
    await storage.set(SAVE_STATE_KEY, {
      schemaVersion: CURRENT_SCHEMA_VERSION,
      residents: [resident],
      activeResidentId: resident.id,
      needsUpdatedAtMs: 1000,
      sceneLog,
      stats: { scenesResolved: 20 },
    });
    const [scene] = await saveSystem.computeActiveScenes(1000, 123);

    const next = await saveSystem.resolveScene(scene!, {
      kind: "give_food",
      foodEffect: { needsDelta: { hunger: -50 } },
    });

    expect(next.sceneLog).toHaveLength(20);
    expect(next.sceneLog[0]?.atMs).toBe(1);
    expect(next.sceneLog[19]?.sceneType).toBe("hungry");
  });
});
