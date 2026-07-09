import { describe, expect, it } from "vitest";
import {
  ZONE_CATALOG,
  evaluateZoneUnlocks,
  findZone,
  newlyUnlockedZones,
  pendingZoneCelebrations,
} from "@/data/zones";

describe("ZONE_CATALOG", () => {
  it("has 5 zones with unique ids and residential always unlocked", () => {
    expect(ZONE_CATALOG).toHaveLength(5);
    expect(new Set(ZONE_CATALOG.map((z) => z.id)).size).toBe(5);
    expect(findZone("residential")?.minResidents).toBe(0);
  });
});

describe("evaluateZoneUnlocks", () => {
  it("unlocks progressively as resident count grows", () => {
    expect(evaluateZoneUnlocks(0)).toEqual(["residential"]);
    expect(evaluateZoneUnlocks(1)).toEqual(["residential", "food_shop"]);
    expect(evaluateZoneUnlocks(3)).toEqual(["residential", "food_shop", "clothes_shop"]);
    expect(evaluateZoneUnlocks(5)).toEqual(["residential", "food_shop", "clothes_shop", "plaza"]);
    expect(evaluateZoneUnlocks(8)).toEqual([
      "residential",
      "food_shop",
      "clothes_shop",
      "plaza",
      "workshop",
    ]);
  });

  it("is monotonic: never unlocks fewer zones with more residents", () => {
    const at5 = evaluateZoneUnlocks(5);
    const at10 = evaluateZoneUnlocks(10);
    expect(at10.length).toBeGreaterThanOrEqual(at5.length);
    for (const id of at5) expect(at10).toContain(id);
  });
});

describe("newlyUnlockedZones", () => {
  it("returns only zones crossed for the first time", () => {
    expect(newlyUnlockedZones(1, [])).toEqual(["residential", "food_shop"]);
    expect(newlyUnlockedZones(1, ["residential"])).toEqual(["food_shop"]);
    expect(newlyUnlockedZones(1, ["residential", "food_shop"])).toEqual([]);
  });

  it("returns nothing when nothing new crosses the threshold", () => {
    expect(newlyUnlockedZones(2, ["residential", "food_shop"])).toEqual([]);
  });
});

describe("pendingZoneCelebrations", () => {
  it("returns unlocked zones that have not been celebrated yet", () => {
    expect(pendingZoneCelebrations(["residential", "food_shop"], ["residential"])).toEqual([
      "food_shop",
    ]);
  });

  it("returns nothing when everything unlocked is already celebrated", () => {
    expect(pendingZoneCelebrations(["residential"], ["residential"])).toEqual([]);
  });

  it("returns nothing when nothing is unlocked yet", () => {
    expect(pendingZoneCelebrations([], [])).toEqual([]);
  });
});
