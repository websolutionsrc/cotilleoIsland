import { describe, expect, it } from "vitest";
import { DEFAULT_NEEDS } from "@/core/needs";
import type { CreateResidentInput } from "@/residents/factory";
import { createResident } from "@/residents/factory";
import {
  detectSceneCandidates,
  detectZoneOpeningCandidates,
  filterScenesOnCooldown,
  mulberry32,
  scoreScene,
  selectScenes,
  type SceneIntent,
  type SceneLogEntry,
} from "@/events";

const NOW_MS = 1_700_000_000_000;

function residentWith(overrides: Partial<CreateResidentInput>): ReturnType<typeof createResident> {
  return createResident({ ...overrides, name: overrides.name ?? "Lina" });
}

describe("event detection", () => {
  it("detects need scenes from thresholds", () => {
    const resident = residentWith({
      needs: { ...DEFAULT_NEEDS, hunger: 70, energy: 30, boredom: 65, social_need: 65 },
    });

    const candidates = detectSceneCandidates(resident, NOW_MS, { rng: () => 1 });

    expect(candidates.map((candidate) => candidate.sceneType)).toEqual([
      "hungry",
      "tired",
      "bored",
      "lonely",
    ]);
  });

  it("relaxes thresholds for impatient and sociable residents", () => {
    const resident = residentWith({
      personality: { patience: 20, sociability: 80 },
      needs: { ...DEFAULT_NEEDS, hunger: 60, energy: 40, boredom: 55, social_need: 45 },
    });

    const candidates = detectSceneCandidates(resident, NOW_MS, { rng: () => 1 });

    expect(candidates.map((candidate) => candidate.sceneType)).toEqual([
      "hungry",
      "tired",
      "bored",
      "lonely",
    ]);
  });

  it("uses seeded rng for deterministic quirk detection", () => {
    const resident = residentWith({
      personality: { weirdness: 100 },
      needs: DEFAULT_NEEDS,
    });

    const first = detectSceneCandidates(resident, NOW_MS, { rng: mulberry32(0) });
    const second = detectSceneCandidates(resident, NOW_MS, { rng: mulberry32(0) });

    expect(first).toEqual(second);
    expect(first.some((candidate) => candidate.sceneType === "quirk")).toBe(true);
  });
});

describe("cooldowns and selection", () => {
  it("filters scenes on hard cooldown but lets urgent hunger through", () => {
    const resident = residentWith({ needs: { ...DEFAULT_NEEDS, hunger: 90 } });
    const [hungry] = detectSceneCandidates(resident, NOW_MS, { rng: () => 1 });
    const log: SceneLogEntry[] = [{ sceneType: "hungry", participants: [resident.id], atMs: NOW_MS - 1 }];

    expect(filterScenesOnCooldown([hungry as SceneIntent], log, NOW_MS)).toHaveLength(1);
  });

  it("scores scenes and selects one per resident with deterministic tie order", () => {
    const resident = residentWith({
      needs: { ...DEFAULT_NEEDS, hunger: 70, boredom: 100, social_need: 100 },
    });
    const candidates = detectSceneCandidates(resident, NOW_MS, { rng: () => 1 });

    expect(scoreScene(candidates.find((candidate) => candidate.sceneType === "hungry")!)).toBe(70);
    expect(selectScenes(candidates, { sceneLog: [], nowMs: NOW_MS })).toEqual([
      candidates.find((candidate) => candidate.sceneType === "hungry"),
    ]);
  });

  it("limits global selected scenes to three", () => {
    const residents = [0, 1, 2, 3].map((index) =>
      residentWith({ name: `Resident ${index}`, needs: { ...DEFAULT_NEEDS, hunger: 80 } }),
    );
    const candidates = residents.flatMap((resident) =>
      detectSceneCandidates(resident, NOW_MS, { rng: () => 1 }),
    );

    expect(selectScenes(candidates, { sceneLog: [], nowMs: NOW_MS })).toHaveLength(3);
  });
});

describe("detectZoneOpeningCandidates (F5.3)", () => {
  it("produces a candidate for each pending zone, starring the oldest resident", () => {
    const oldest = residentWith({ name: "Lina" });
    const newest = residentWith({ name: "Nico" });

    const candidates = detectZoneOpeningCandidates(
      [oldest, newest],
      ["residential", "food_shop"],
      ["residential"],
      NOW_MS,
    );

    expect(candidates).toHaveLength(1);
    expect(candidates[0]?.sceneType).toBe("zone_opening");
    expect(candidates[0]?.participants).toEqual([oldest.id]);
    expect(candidates[0]?.cause).toEqual({ kind: "zone", zoneId: "food_shop" });
  });

  it("returns nothing when there are no residents or nothing pending", () => {
    const resident = residentWith({ name: "Lina" });
    expect(detectZoneOpeningCandidates([], ["residential"], [], NOW_MS)).toEqual([]);
    expect(
      detectZoneOpeningCandidates([resident], ["residential"], ["residential"], NOW_MS),
    ).toEqual([]);
  });
});
