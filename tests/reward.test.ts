import { describe, expect, it } from "vitest";
import type { ResidentId } from "@/core/ids";
import { HUNGER_URGENT_THRESHOLD } from "@/core/needs";
import { coinsForScene, type SceneIntent } from "@/events";

const RESIDENT_ID = "resident-1" as ResidentId;
const NOW_MS = 1_700_000_000_000;

function hungryIntent(value: number): SceneIntent {
  return {
    sceneType: "hungry",
    participants: [RESIDENT_ID],
    cause: { kind: "need", need: "hunger", value },
    urgency: value,
    createdAtMs: NOW_MS,
  };
}

describe("coinsForScene", () => {
  it("pays the base reward for a regular scene", () => {
    expect(coinsForScene(hungryIntent(HUNGER_URGENT_THRESHOLD - 1))).toBe(5);
  });

  it("pays the urgent reward exactly when the scene ignores cooldown (urgent hunger)", () => {
    expect(coinsForScene(hungryIntent(HUNGER_URGENT_THRESHOLD))).toBe(10);
  });

  it("pays the base reward for non-hunger scenes (no other urgency exception exists yet)", () => {
    const tired: SceneIntent = {
      sceneType: "tired",
      participants: [RESIDENT_ID],
      cause: { kind: "need", need: "energy", value: 5 },
      urgency: 95,
      createdAtMs: NOW_MS,
    };
    expect(coinsForScene(tired)).toBe(5);
  });

  it("pays the base reward for social scenes", () => {
    const meet: SceneIntent = {
      sceneType: "meet",
      participants: [RESIDENT_ID, "resident-2" as ResidentId],
      cause: { kind: "social" },
      urgency: 30,
      createdAtMs: NOW_MS,
    };
    expect(coinsForScene(meet)).toBe(5);
  });
});
