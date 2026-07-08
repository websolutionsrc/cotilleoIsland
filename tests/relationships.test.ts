import { describe, expect, it } from "vitest";
import {
  orderedPair,
  makeDefaultRelationship,
  findRelationship,
  getRelationship,
  upsertRelationship,
} from "@/relationships/key";
import { chemistry } from "@/relationships/chemistry";
import {
  nextRelationshipStatus,
  FRIENDSHIP_FRIEND_THRESHOLD,
  FRIENDSHIP_BESTIE_THRESHOLD,
  CONFESS_FRIENDSHIP_MIN,
  CONFESS_CHEMISTRY_MIN,
  PROPOSE_FRIENDSHIP_MIN,
  PROPOSE_CHEMISTRY_MIN,
} from "@/relationships/status";
import { decayRelationship } from "@/relationships/decay";
import { applyRelationshipAction } from "@/relationships/apply";
import type { Relationship } from "@/relationships/types";
import { DEFAULT_PERSONALITY, type Personality } from "@/core/personality";
import type { ResidentId } from "@/core/ids";

const ALICE = "resident_alice_1" as ResidentId;
const BOB = "resident_bob_2" as ResidentId;

function withTraits(overrides: Partial<Personality>): Personality {
  return { ...DEFAULT_PERSONALITY, ...overrides };
}

function relationship(overrides: Partial<Relationship> = {}): Relationship {
  return { ...makeDefaultRelationship(ALICE, BOB), ...overrides };
}

describe("orderedPair / key helpers", () => {
  it("orders ids lexicographically regardless of call order", () => {
    expect(orderedPair(ALICE, BOB)).toEqual(orderedPair(BOB, ALICE));
  });

  it("makeDefaultRelationship starts as strangers with zeroed values", () => {
    const rel = makeDefaultRelationship(BOB, ALICE);
    expect(rel.status).toBe("strangers");
    expect(rel.friendship).toBe(0);
    expect(rel.tension).toBe(0);
    expect(rel.romance).toBe(0);
    expect(rel.lastInteractionAtMs).toBeNull();
    // Normalized regardless of argument order.
    const [a, b] = orderedPair(BOB, ALICE);
    expect(rel.a).toBe(a);
    expect(rel.b).toBe(b);
  });

  it("findRelationship returns null when the pair has never interacted", () => {
    expect(findRelationship([], ALICE, BOB)).toBeNull();
  });

  it("getRelationship falls back to the default (strangers) relationship", () => {
    const rel = getRelationship([], ALICE, BOB);
    expect(rel.status).toBe("strangers");
  });

  it("findRelationship matches regardless of argument order", () => {
    const stored = relationship({ friendship: 42 });
    expect(findRelationship([stored], BOB, ALICE)?.friendship).toBe(42);
  });

  it("upsertRelationship inserts when missing and replaces when present", () => {
    const stored = relationship({ friendship: 10 });
    const inserted = upsertRelationship([], stored);
    expect(inserted).toHaveLength(1);

    const updated = { ...stored, friendship: 20 };
    const replaced = upsertRelationship(inserted, updated);
    expect(replaced).toHaveLength(1);
    expect(replaced[0].friendship).toBe(20);
  });
});

describe("chemistry", () => {
  it("is 0-100 and deterministic for identical inputs", () => {
    const rel = relationship();
    const value = chemistry(DEFAULT_PERSONALITY, DEFAULT_PERSONALITY, rel);
    expect(value).toBe(chemistry(DEFAULT_PERSONALITY, DEFAULT_PERSONALITY, rel));
    expect(value).toBeGreaterThanOrEqual(0);
    expect(value).toBeLessThanOrEqual(100);
  });

  it("increases with higher mutual romanticism", () => {
    const low = chemistry(
      withTraits({ romanticism: 10 }),
      withTraits({ romanticism: 10 }),
      relationship(),
    );
    const high = chemistry(
      withTraits({ romanticism: 90 }),
      withTraits({ romanticism: 90 }),
      relationship(),
    );
    expect(high).toBeGreaterThan(low);
  });

  it("rewards similar weirdness/sociability over very different ones", () => {
    const similar = chemistry(
      withTraits({ weirdness: 50, sociability: 50 }),
      withTraits({ weirdness: 55, sociability: 45 }),
      relationship(),
    );
    const different = chemistry(
      withTraits({ weirdness: 5, sociability: 5 }),
      withTraits({ weirdness: 95, sociability: 95 }),
      relationship(),
    );
    expect(similar).toBeGreaterThan(different);
  });

  it("is reduced by tension in the relationship", () => {
    const calm = chemistry(DEFAULT_PERSONALITY, DEFAULT_PERSONALITY, relationship({ tension: 0 }));
    const tense = chemistry(DEFAULT_PERSONALITY, DEFAULT_PERSONALITY, relationship({ tension: 80 }));
    expect(tense).toBeLessThan(calm);
  });

  it("never goes below 0 even with extreme tension", () => {
    const value = chemistry(
      withTraits({ romanticism: 0, weirdness: 0, sociability: 0, kindness: 0 }),
      withTraits({ romanticism: 0, weirdness: 100, sociability: 100, kindness: 0 }),
      relationship({ tension: 100 }),
    );
    expect(value).toBe(0);
  });
});

describe("nextRelationshipStatus", () => {
  const lowCtx = { friendship: 0, chemistry: 0 };

  it("meet: strangers -> acquaintances, no-op otherwise", () => {
    expect(nextRelationshipStatus("strangers", "meet", lowCtx)).toBe("acquaintances");
    expect(nextRelationshipStatus("friends", "meet", lowCtx)).toBe("friends");
  });

  it("chat promotes acquaintances -> friends -> besties only past thresholds", () => {
    expect(
      nextRelationshipStatus("acquaintances", "chat", { friendship: FRIENDSHIP_FRIEND_THRESHOLD - 1, chemistry: 0 }),
    ).toBe("acquaintances");
    expect(
      nextRelationshipStatus("acquaintances", "chat", { friendship: FRIENDSHIP_FRIEND_THRESHOLD, chemistry: 0 }),
    ).toBe("friends");
    expect(
      nextRelationshipStatus("friends", "chat", { friendship: FRIENDSHIP_BESTIE_THRESHOLD - 1, chemistry: 0 }),
    ).toBe("friends");
    expect(
      nextRelationshipStatus("friends", "chat", { friendship: FRIENDSHIP_BESTIE_THRESHOLD, chemistry: 0 }),
    ).toBe("besties");
  });

  it("argument sends friends/besties/dating/partners to fighting, ignores strangers/acquaintances", () => {
    for (const status of ["friends", "besties", "dating", "partners"] as const) {
      expect(nextRelationshipStatus(status, "argument", lowCtx)).toBe("fighting");
    }
    for (const status of ["strangers", "acquaintances"] as const) {
      expect(nextRelationshipStatus(status, "argument", lowCtx)).toBe(status);
    }
  });

  it("reconcile lands on friends or besties by current friendship, never restores dating/partners directly", () => {
    expect(
      nextRelationshipStatus("fighting", "reconcile", { friendship: FRIENDSHIP_BESTIE_THRESHOLD - 1, chemistry: 0 }),
    ).toBe("friends");
    expect(
      nextRelationshipStatus("fighting", "reconcile", { friendship: FRIENDSHIP_BESTIE_THRESHOLD, chemistry: 0 }),
    ).toBe("besties");
    expect(nextRelationshipStatus("friends", "reconcile", lowCtx)).toBe("friends");
  });

  it("flirt never changes status", () => {
    for (const status of ["strangers", "friends", "dating", "fighting"] as const) {
      expect(nextRelationshipStatus(status, "flirt", { friendship: 100, chemistry: 100 })).toBe(status);
    }
  });

  it("confess requires friends/besties + both guards, otherwise no-op", () => {
    const guardMet = { friendship: CONFESS_FRIENDSHIP_MIN, chemistry: CONFESS_CHEMISTRY_MIN };
    expect(nextRelationshipStatus("friends", "confess", guardMet)).toBe("dating");
    expect(nextRelationshipStatus("besties", "confess", guardMet)).toBe("dating");
    expect(nextRelationshipStatus("acquaintances", "confess", guardMet)).toBe("acquaintances");
    expect(
      nextRelationshipStatus("friends", "confess", { friendship: CONFESS_FRIENDSHIP_MIN - 1, chemistry: 100 }),
    ).toBe("friends");
    expect(
      nextRelationshipStatus("friends", "confess", { friendship: 100, chemistry: CONFESS_CHEMISTRY_MIN - 1 }),
    ).toBe("friends");
  });

  it("propose requires dating + both guards, otherwise no-op", () => {
    const guardMet = { friendship: PROPOSE_FRIENDSHIP_MIN, chemistry: PROPOSE_CHEMISTRY_MIN };
    expect(nextRelationshipStatus("dating", "propose", guardMet)).toBe("partners");
    expect(nextRelationshipStatus("friends", "propose", guardMet)).toBe("friends");
    expect(
      nextRelationshipStatus("dating", "propose", { friendship: PROPOSE_FRIENDSHIP_MIN - 1, chemistry: 100 }),
    ).toBe("dating");
  });
});

describe("decayRelationship", () => {
  const ONE_DAY_MS = 24 * 60 * 60 * 1000;

  it("is a no-op with no elapsed time or no prior interaction", () => {
    const rel = relationship({ friendship: 50, tension: 50, lastInteractionAtMs: 0 });
    expect(decayRelationship(rel, 0, 0)).toEqual(rel);
    expect(decayRelationship({ ...rel, lastInteractionAtMs: null }, 999_999_999, 999_999_999)).toEqual({
      ...rel,
      lastInteractionAtMs: null,
    });
  });

  it("does not decay friendship within the grace period (gate is absolute time since interaction)", () => {
    const rel = relationship({ friendship: 50, lastInteractionAtMs: 0 });
    // nowMs still inside the 3-day grace window since lastInteractionAtMs.
    expect(decayRelationship(rel, ONE_DAY_MS, ONE_DAY_MS).friendship).toBe(50);
  });

  it("tension always decays (no grace), friendship decays the full tick once past grace", () => {
    const rel = relationship({ friendship: 50, tension: 50, lastInteractionAtMs: 0 });
    const fiveDaysMs = 5 * ONE_DAY_MS;
    // Single tick spanning the whole 5 days since interaction: past grace (>=3 days),
    // so friendship decays for the FULL elapsed tick (approximate by design - see decay.ts).
    const decayed = decayRelationship(rel, fiveDaysMs, fiveDaysMs);
    expect(decayed.friendship).toBe(50 - 5); // 5 elapsed days * 1/day
    expect(decayed.tension).toBe(50 - 10); // 5 elapsed days * 2/day, no grace
  });

  it("does not double-decay across successive small ticks (idempotent tick model)", () => {
    let rel = relationship({ friendship: 50, lastInteractionAtMs: 0 });
    // Advance past grace first (day 0 -> day 4, still within grace at day 3 boundary
    // handled by the tick below), then apply two 1-day ticks past the grace boundary.
    rel = decayRelationship(rel, 4 * ONE_DAY_MS, 4 * ONE_DAY_MS); // past grace: decays 4 days worth
    const afterFirstTick = rel.friendship;
    rel = decayRelationship(rel, ONE_DAY_MS, 5 * ONE_DAY_MS); // one more day, from day 4 to day 5
    expect(rel.friendship).toBe(afterFirstTick - 1);
  });

  it("clamps at the relationship minimum", () => {
    const rel = relationship({ friendship: 1, tension: 1, lastInteractionAtMs: 0 });
    const farFuture = 100 * ONE_DAY_MS;
    const decayed = decayRelationship(rel, farFuture, farFuture);
    expect(decayed.friendship).toBe(0);
    expect(decayed.tension).toBe(0);
  });
});

describe("applyRelationshipAction", () => {
  const participants = { a: DEFAULT_PERSONALITY, b: DEFAULT_PERSONALITY };

  it("applies the fixed delta for the action and stamps lastInteractionAtMs", () => {
    const rel = relationship();
    const result = applyRelationshipAction(rel, "chat", participants, 1_000);
    expect(result.friendship).toBe(10);
    expect(result.tension).toBe(0); // clamped at 0, delta was -5
    expect(result.lastInteractionAtMs).toBe(1_000);
  });

  it("does not mutate the original relationship (pure)", () => {
    const rel = relationship({ friendship: 5 });
    applyRelationshipAction(rel, "chat", participants, 1_000);
    expect(rel.friendship).toBe(5);
  });

  it("promotes status end-to-end when repeated chats cross thresholds", () => {
    let rel = relationship({ status: "acquaintances", friendship: FRIENDSHIP_FRIEND_THRESHOLD - 10 });
    rel = applyRelationshipAction(rel, "chat", participants, 1_000);
    expect(rel.status).toBe("friends");
  });

  it("confess promotes to dating only when the post-delta guards are met", () => {
    const highRomance = { a: withTraits({ romanticism: 90 }), b: withTraits({ romanticism: 90 }) };
    const rel = relationship({ status: "besties", friendship: CONFESS_FRIENDSHIP_MIN - 5 });
    const result = applyRelationshipAction(rel, "confess", highRomance, 1_000);
    // friendship after delta: (CONFESS_FRIENDSHIP_MIN - 5) + 5 = CONFESS_FRIENDSHIP_MIN, guard met.
    expect(result.friendship).toBe(CONFESS_FRIENDSHIP_MIN);
    expect(result.status).toBe("dating");
  });

  it("argument moves a couple to fighting without erasing romance", () => {
    const rel = relationship({ status: "partners", romance: 80 });
    const result = applyRelationshipAction(rel, "argument", participants, 1_000);
    expect(result.status).toBe("fighting");
    expect(result.romance).toBe(80);
  });
});
