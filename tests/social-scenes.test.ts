import { describe, expect, it } from "vitest";
import { DEFAULT_NEEDS } from "@/core/needs";
import type { Personality } from "@/core/personality";
import type { ResidentId } from "@/core/ids";
import { createResident } from "@/residents/factory";
import { makeDefaultRelationship, type Relationship } from "@/relationships";
import {
  detectSocialSceneCandidates,
  filterScenesOnCooldown,
  relationshipActionForScene,
  resolveSocialSceneNeeds,
  selectScenes,
  type SceneIntent,
  type SceneLogEntry,
} from "@/events";

const NOW_MS = 1_700_000_000_000;
const RELATIONSHIP_A = "resident_a" as ResidentId;
const RELATIONSHIP_B = "resident_b" as ResidentId;

function resident(name: string, overrides: { personality?: Partial<Personality>; needs?: Partial<typeof DEFAULT_NEEDS> } = {}) {
  return createResident({
    name,
    personality: overrides.personality,
    needs: { ...DEFAULT_NEEDS, ...overrides.needs },
  });
}

function relationship(overrides: Partial<Relationship> = {}): Relationship {
  return { ...makeDefaultRelationship(RELATIONSHIP_A, RELATIONSHIP_B), ...overrides };
}

describe("detectSocialSceneCandidates", () => {
  it("detects meet only when strangers", () => {
    const a = resident("Alice");
    const b = resident("Bob");
    const strangers = detectSocialSceneCandidates(a, b, relationship({ status: "strangers" }), NOW_MS);
    expect(strangers.map((c) => c.sceneType)).toEqual(["meet"]);

    const acquainted = detectSocialSceneCandidates(a, b, relationship({ status: "acquaintances" }), NOW_MS);
    expect(acquainted.some((c) => c.sceneType === "meet")).toBe(false);
  });

  it("detects chat only for known pairs with enough combined social_need", () => {
    const a = resident("Alice", { needs: { social_need: 60 } });
    const b = resident("Bob", { needs: { social_need: 60 } });
    const rel = relationship({ status: "friends" });

    expect(detectSocialSceneCandidates(a, b, rel, NOW_MS).some((c) => c.sceneType === "chat")).toBe(true);
    expect(
      detectSocialSceneCandidates(a, b, relationship({ status: "strangers" }), NOW_MS).some(
        (c) => c.sceneType === "chat",
      ),
    ).toBe(false);

    const lowNeed = resident("Cara", { needs: { social_need: 10 } });
    expect(detectSocialSceneCandidates(a, lowNeed, rel, NOW_MS).some((c) => c.sceneType === "chat")).toBe(
      false,
    );
  });

  it("detects argument only above the tension threshold and for eligible statuses", () => {
    const a = resident("Alice");
    const b = resident("Bob");

    expect(
      detectSocialSceneCandidates(a, b, relationship({ status: "friends", tension: 60 }), NOW_MS).some(
        (c) => c.sceneType === "argument",
      ),
    ).toBe(true);
    expect(
      detectSocialSceneCandidates(a, b, relationship({ status: "friends", tension: 59 }), NOW_MS).some(
        (c) => c.sceneType === "argument",
      ),
    ).toBe(false);
    expect(
      detectSocialSceneCandidates(
        a,
        b,
        relationship({ status: "acquaintances", tension: 100 }),
        NOW_MS,
      ).some((c) => c.sceneType === "argument"),
    ).toBe(false);
  });

  it("detects reconcile only when fighting and kind enough on average", () => {
    const kind = resident("Alice", { personality: { kindness: 80 } });
    const cold = resident("Bob", { personality: { kindness: 10 } });
    const veryKind = resident("Cara", { personality: { kindness: 90 } });

    expect(
      detectSocialSceneCandidates(kind, veryKind, relationship({ status: "fighting" }), NOW_MS).some(
        (c) => c.sceneType === "reconcile",
      ),
    ).toBe(true);
    expect(
      detectSocialSceneCandidates(kind, cold, relationship({ status: "fighting" }), NOW_MS).some(
        (c) => c.sceneType === "reconcile",
      ),
    ).toBe(false);
    expect(
      detectSocialSceneCandidates(kind, veryKind, relationship({ status: "friends" }), NOW_MS).some(
        (c) => c.sceneType === "reconcile",
      ),
    ).toBe(false);
  });

  it("detects flirt only for friends/besties with high chemistry", () => {
    const romantic = resident("Alice", { personality: { romanticism: 90 } });
    const romantic2 = resident("Bob", { personality: { romanticism: 90 } });
    const cold = resident("Cara", { personality: { romanticism: 0 } });

    expect(
      detectSocialSceneCandidates(romantic, romantic2, relationship({ status: "besties" }), NOW_MS).some(
        (c) => c.sceneType === "flirt",
      ),
    ).toBe(true);
    expect(
      detectSocialSceneCandidates(romantic, cold, relationship({ status: "besties", tension: 80 }), NOW_MS).some(
        (c) => c.sceneType === "flirt",
      ),
    ).toBe(false);
    expect(
      detectSocialSceneCandidates(romantic, romantic2, relationship({ status: "strangers" }), NOW_MS).some(
        (c) => c.sceneType === "flirt",
      ),
    ).toBe(false);
  });

  it("detects confess only when the exact status/friendship/chemistry guards are met", () => {
    const romantic = resident("Alice", { personality: { romanticism: 90 } });
    const romantic2 = resident("Bob", { personality: { romanticism: 90 } });

    const meetsGuard = relationship({ status: "friends", friendship: 50 });
    expect(
      detectSocialSceneCandidates(romantic, romantic2, meetsGuard, NOW_MS).some((c) => c.sceneType === "confess"),
    ).toBe(true);

    const lowFriendship = relationship({ status: "friends", friendship: 49 });
    expect(
      detectSocialSceneCandidates(romantic, romantic2, lowFriendship, NOW_MS).some(
        (c) => c.sceneType === "confess",
      ),
    ).toBe(false);
  });

  it("detects propose only when dating with the exact friendship/chemistry guards", () => {
    const romantic = resident("Alice", { personality: { romanticism: 90 } });
    const romantic2 = resident("Bob", { personality: { romanticism: 90 } });

    const meetsGuard = relationship({ status: "dating", friendship: 70 });
    expect(
      detectSocialSceneCandidates(romantic, romantic2, meetsGuard, NOW_MS).some((c) => c.sceneType === "propose"),
    ).toBe(true);

    const notDating = relationship({ status: "friends", friendship: 70 });
    expect(
      detectSocialSceneCandidates(romantic, romantic2, notDating, NOW_MS).some((c) => c.sceneType === "propose"),
    ).toBe(false);
  });

  it("participants preserve the order the residents were passed in", () => {
    const a = resident("Alice");
    const b = resident("Bob");
    const [meet] = detectSocialSceneCandidates(a, b, relationship({ status: "strangers" }), NOW_MS);
    expect(meet?.participants).toEqual([a.id, b.id]);
  });
});

describe("relationshipActionForScene", () => {
  it("maps every social sceneType to its same-named RelationshipAction", () => {
    expect(relationshipActionForScene("meet")).toBe("meet");
    expect(relationshipActionForScene("chat")).toBe("chat");
    expect(relationshipActionForScene("argument")).toBe("argument");
    expect(relationshipActionForScene("reconcile")).toBe("reconcile");
    expect(relationshipActionForScene("flirt")).toBe("flirt");
    expect(relationshipActionForScene("confess")).toBe("confess");
    expect(relationshipActionForScene("propose")).toBe("propose");
  });
});

describe("resolveSocialSceneNeeds", () => {
  it("applies the same symmetric delta to both participants", () => {
    const a = resident("Alice", { needs: { social_need: 80, mood: 50 } });
    const b = resident("Bob", { needs: { social_need: 80, mood: 50 } });

    const { a: updatedA, b: updatedB } = resolveSocialSceneNeeds(a, b, "chat");

    expect(updatedA.needs.social_need).toBe(55); // -25
    expect(updatedB.needs.social_need).toBe(55);
    expect(updatedA.needs.mood).toBe(56); // +6
    expect(updatedB.needs.mood).toBe(56);
  });

  it("does not mutate the original residents (pure)", () => {
    const a = resident("Alice", { needs: { mood: 50 } });
    const b = resident("Bob", { needs: { mood: 50 } });
    resolveSocialSceneNeeds(a, b, "propose");
    expect(a.needs.mood).toBe(50);
    expect(b.needs.mood).toBe(50);
  });
});

describe("cooldowns for social scenes (participant SET, not just [0])", () => {
  it("blocks the same pair regardless of participant order in the log", () => {
    const a = resident("Alice");
    const b = resident("Bob");
    const intent: SceneIntent = {
      sceneType: "chat",
      participants: [a.id, b.id],
      cause: { kind: "social" },
      urgency: 60,
      createdAtMs: NOW_MS,
    };
    const log: SceneLogEntry[] = [
      { sceneType: "chat", participants: [b.id, a.id], atMs: NOW_MS - 1 },
    ];

    expect(filterScenesOnCooldown([intent], log, NOW_MS)).toHaveLength(0);
  });

  it("does not block a different pair or a different sceneType", () => {
    const a = resident("Alice");
    const b = resident("Bob");
    const c = resident("Cara");
    const intent: SceneIntent = {
      sceneType: "chat",
      participants: [a.id, b.id],
      cause: { kind: "social" },
      urgency: 60,
      createdAtMs: NOW_MS,
    };
    const differentPairLog: SceneLogEntry[] = [
      { sceneType: "chat", participants: [a.id, c.id], atMs: NOW_MS - 1 },
    ];
    const differentTypeLog: SceneLogEntry[] = [
      { sceneType: "argument", participants: [a.id, b.id], atMs: NOW_MS - 1 },
    ];

    expect(filterScenesOnCooldown([intent], differentPairLog, NOW_MS)).toHaveLength(1);
    expect(filterScenesOnCooldown([intent], differentTypeLog, NOW_MS)).toHaveLength(1);
  });
});

describe("selectScenes consistency for multi-participant candidates", () => {
  it("selects a social scene when it wins both participants' slots", () => {
    const a = resident("Alice");
    const b = resident("Bob");
    const meet: SceneIntent = {
      sceneType: "meet",
      participants: [a.id, b.id],
      cause: { kind: "social" },
      urgency: 30,
      createdAtMs: NOW_MS,
    };

    expect(selectScenes([meet], { sceneLog: [], nowMs: NOW_MS })).toEqual([meet]);
  });

  it("drops a social scene entirely if one participant has a strictly better personal scene", () => {
    const a = resident("Alice");
    const b = resident("Bob");
    const meet: SceneIntent = {
      sceneType: "meet",
      participants: [a.id, b.id],
      cause: { kind: "social" },
      urgency: 30, // score = 30 * 0.5 = 15
      createdAtMs: NOW_MS,
    };
    const bHungry: SceneIntent = {
      sceneType: "hungry",
      participants: [b.id],
      cause: { kind: "need", need: "hunger", value: 90 },
      urgency: 90, // score = 90 * 1 = 90, wins b's slot over meet
      createdAtMs: NOW_MS,
    };

    const selected = selectScenes([meet, bHungry], { sceneLog: [], nowMs: NOW_MS });

    // meet loses b's slot to bHungry, so it must be dropped entirely -
    // it cannot appear "only for a" since b would then be in two scenes at once.
    expect(selected).toEqual([bHungry]);
  });

  it("still selects a's best personal scene when the social scene is dropped for b", () => {
    const a = resident("Alice");
    const b = resident("Bob");
    const meet: SceneIntent = {
      sceneType: "meet",
      participants: [a.id, b.id],
      cause: { kind: "social" },
      urgency: 30,
      createdAtMs: NOW_MS,
    };
    const bHungry: SceneIntent = {
      sceneType: "hungry",
      participants: [b.id],
      cause: { kind: "need", need: "hunger", value: 90 },
      urgency: 90,
      createdAtMs: NOW_MS,
    };
    const aTired: SceneIntent = {
      sceneType: "tired",
      participants: [a.id],
      cause: { kind: "need", need: "energy", value: 10 },
      urgency: 90, // score = 90*0.8 = 72, wins a's slot over meet's 15
      createdAtMs: NOW_MS,
    };

    const selected = selectScenes([meet, bHungry, aTired], { sceneLog: [], nowMs: NOW_MS });

    expect(selected).toHaveLength(2);
    expect(selected).toEqual(expect.arrayContaining([bHungry, aTired]));
    expect(selected).not.toEqual(expect.arrayContaining([meet]));
  });
});
