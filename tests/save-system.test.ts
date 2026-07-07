import { describe, expect, it, beforeEach } from "vitest";
import { InMemoryStorage } from "@/save/in-memory-storage";
import { SaveSystem, SAVE_STATE_KEY } from "@/save/save-system";
import { CURRENT_SCHEMA_VERSION, migrateSaveState } from "@/save/save-state";
import { createResident } from "@/residents/factory";

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

describe("migrateSaveState (stub de migración)", () => {
  it("no cambia un SaveState que ya está en la versión actual", () => {
    const resident = createResident({ name: "Lina" });
    const state = {
      schemaVersion: CURRENT_SCHEMA_VERSION,
      residents: [resident],
      activeResidentId: resident.id,
    };

    expect(migrateSaveState(state)).toEqual(state);
  });

  it("migra un guardado sin schemaVersion (v0) rellenando los campos por defecto", () => {
    const legacyRaw = { residents: [] };

    const migrated = migrateSaveState(legacyRaw);

    expect(migrated.schemaVersion).toBe(1);
    expect(migrated.residents).toEqual([]);
    expect(migrated.activeResidentId).toBeNull();
  });

  it("conserva los residentes de un guardado v0 que sí los tenía", () => {
    const resident = createResident({ name: "Nico" });
    const legacyRaw = { residents: [resident], activeResidentId: resident.id };

    const migrated = migrateSaveState(legacyRaw);

    expect(migrated.schemaVersion).toBe(1);
    expect(migrated.residents).toEqual([resident]);
    expect(migrated.activeResidentId).toBe(resident.id);
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
  });
});
