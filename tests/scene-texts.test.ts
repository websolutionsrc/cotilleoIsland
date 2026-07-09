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

describe("sceneTextFor for social scenes", () => {
  const RESIDENT_B_ID = "resident-2" as ResidentId;

  it("mentions both residents by name when a counterpart is given", () => {
    const a = createResident({ id: RESIDENT_ID, name: "Lina" });
    const b = createResident({ id: RESIDENT_B_ID, name: "Nico" });
    const socialIntent = intent({
      sceneType: "meet",
      participants: [RESIDENT_ID, RESIDENT_B_ID],
      cause: { kind: "social" },
    });

    const text = sceneTextFor(socialIntent, a, b);
    expect(text).toContain("Lina");
    expect(text).toContain("Nico");
  });

  it("falls back to a generic counterpart name instead of failing (total render invariant)", () => {
    const a = createResident({ id: RESIDENT_ID, name: "Lina" });
    const socialIntent = intent({
      sceneType: "confess",
      participants: [RESIDENT_ID, RESIDENT_B_ID],
      cause: { kind: "social" },
    });

    expect(() => sceneTextFor(socialIntent, a)).not.toThrow();
    expect(sceneTextFor(socialIntent, a).length).toBeGreaterThan(0);
  });

  it("produces distinct, non-empty text for every social sceneType", () => {
    const a = createResident({ id: RESIDENT_ID, name: "Lina" });
    const b = createResident({ id: RESIDENT_B_ID, name: "Nico" });
    const socialTypes = ["meet", "chat", "argument", "reconcile", "flirt", "confess", "propose"] as const;

    const texts = socialTypes.map((sceneType) =>
      sceneTextFor(
        intent({ sceneType, participants: [RESIDENT_ID, RESIDENT_B_ID], cause: { kind: "social" } }),
        a,
        b,
      ),
    );

    for (const text of texts) expect(text.length).toBeGreaterThan(0);
    expect(new Set(texts).size).toBe(socialTypes.length);
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
