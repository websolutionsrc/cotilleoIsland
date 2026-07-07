import { describe, expect, it } from "vitest";
import type { ResidentId } from "@/core/ids";
import { DEFAULT_NEEDS } from "@/core/needs";
import { createResident } from "@/residents/factory";
import { sceneTextFor } from "@/dialogue/scene-texts";
import { defaultActionForScene, resolveSceneNeeds, type SceneIntent } from "@/events";

const NOW_MS = 1_700_000_000_000;
const RESIDENT_ID = "resident-1" as ResidentId;

function intent(overrides: Partial<SceneIntent>): SceneIntent {
  return {
    sceneType: "bored",
    participants: [RESIDENT_ID],
    cause: { kind: "need", need: "boredom", value: 80 },
    urgency: 80,
    createdAtMs: NOW_MS,
    ...overrides,
  };
}

describe("sceneTextFor", () => {
  it("returns a low mood variant before personality variants", () => {
    const resident = createResident({
      id: RESIDENT_ID,
      name: "Lina",
      personality: { weirdness: 90 },
      needs: { ...DEFAULT_NEEDS, mood: 20 },
    });

    expect(sceneTextFor(intent({ sceneType: "bored" }), resident)).toContain("lift my mood");
  });

  it("returns a personality variant when available", () => {
    const resident = createResident({
      id: RESIDENT_ID,
      name: "Lina",
      personality: { weirdness: 90 },
      needs: { ...DEFAULT_NEEDS, mood: 70 },
    });

    expect(sceneTextFor(intent({ sceneType: "bored" }), resident)).toContain("wonderfully weird");
  });

  it("returns quirk-specific text with fallback coverage", () => {
    const resident = createResident({ id: RESIDENT_ID, name: "Lina" });

    expect(
      sceneTextFor(
        intent({ sceneType: "quirk", cause: { kind: "quirk", quirkId: "collects_pebbles" } }),
        resident,
      ),
    ).toContain("pebble");
    expect(
      sceneTextFor(
        intent({ sceneType: "quirk", cause: { kind: "quirk", quirkId: "missing" } }),
        resident,
      ),
    ).not.toHaveLength(0);
  });
});

describe("resolveSceneNeeds", () => {
  it("applies non-food scene effects with clamping", () => {
    const resident = createResident({
      id: RESIDENT_ID,
      name: "Lina",
      needs: { ...DEFAULT_NEEDS, boredom: 90, energy: 5, mood: 95 },
    });
    const action = defaultActionForScene(intent({ sceneType: "bored" }));

    const updated = resolveSceneNeeds(resident, intent({ sceneType: "bored" }), action!);

    expect(updated.needs.boredom).toBe(50);
    expect(updated.needs.energy).toBe(0);
    expect(updated.needs.mood).toBe(100);
  });

  it("requires food effects for hungry scenes", () => {
    const resident = createResident({
      id: RESIDENT_ID,
      name: "Lina",
      needs: { ...DEFAULT_NEEDS, hunger: 90 },
    });

    const updated = resolveSceneNeeds(
      resident,
      intent({ sceneType: "hungry", cause: { kind: "need", need: "hunger", value: 90 } }),
      { kind: "give_food", foodEffect: { needsDelta: { hunger: -50 } } },
    );

    expect(updated.needs.hunger).toBe(40);
  });
});
