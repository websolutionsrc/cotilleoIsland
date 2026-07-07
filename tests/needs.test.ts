import { describe, expect, it } from "vitest";
import {
  applyFoodEffect,
  clampNeedValue,
  decayNeeds,
  DEFAULT_NEEDS,
  HUNGER_REQUEST_THRESHOLD,
  HUNGER_URGENT_THRESHOLD,
  LOW_MOOD_THRESHOLD,
  NEEDS_KEYS,
  needsToStatus,
  normalizeNeeds,
  type Needs,
} from "@/core/needs";

function withNeeds(overrides: Partial<Needs>): Needs {
  return { ...DEFAULT_NEEDS, ...overrides };
}

describe("needs core", () => {
  it("mantiene los defaults dentro del rango 0-100", () => {
    for (const key of NEEDS_KEYS) {
      expect(DEFAULT_NEEDS[key]).toBeGreaterThanOrEqual(0);
      expect(DEFAULT_NEEDS[key]).toBeLessThanOrEqual(100);
      expect(Number.isInteger(DEFAULT_NEEDS[key])).toBe(true);
    }
  });

  it("clampa y redondea valores individuales", () => {
    expect(clampNeedValue(-10)).toBe(0);
    expect(clampNeedValue(120)).toBe(100);
    expect(clampNeedValue(42.6)).toBe(43);
  });

  it("normaliza needs parciales sin mutar defaults", () => {
    expect(normalizeNeeds({ hunger: 120, mood: -3 })).toEqual({
      ...DEFAULT_NEEDS,
      hunger: 100,
      mood: 0,
    });
    expect(DEFAULT_NEEDS.hunger).toBe(20);
  });

  it("no cambia con elapsedMs cero o negativo salvo normalizar", () => {
    const needs = withNeeds({ hunger: 20.4, mood: 70 });
    expect(decayNeeds(needs, 0)).toEqual(withNeeds({ hunger: 20, mood: 70 }));
    expect(decayNeeds(needs, -1000)).toEqual(withNeeds({ hunger: 20, mood: 70 }));
  });

  it("decae necesidades con el tiempo", () => {
    const result = decayNeeds(DEFAULT_NEEDS, 60 * 60 * 1000);
    expect(result.hunger).toBeGreaterThan(DEFAULT_NEEDS.hunger);
    expect(result.social_need).toBeGreaterThan(DEFAULT_NEEDS.social_need);
    expect(result.boredom).toBeGreaterThan(DEFAULT_NEEDS.boredom);
    expect(result.mood).toBeLessThan(DEFAULT_NEEDS.mood);
    expect(result.energy).toBeLessThan(DEFAULT_NEEDS.energy);
  });

  it("aplica comida como delta puro y clampa resultados", () => {
    const result = applyFoodEffect(withNeeds({ hunger: 25, mood: 98 }), {
      needsDelta: { hunger: -40, mood: 10 },
    });
    expect(result.hunger).toBe(0);
    expect(result.mood).toBe(100);
  });

  it("deriva status de hambre y ánimo sin persistirlo", () => {
    expect(
      needsToStatus(withNeeds({ hunger: HUNGER_REQUEST_THRESHOLD, mood: 50 })),
    ).toEqual({
      wantsFood: true,
      urgentlyNeedsFood: false,
      lowMood: false,
    });

    expect(
      needsToStatus(withNeeds({ hunger: HUNGER_URGENT_THRESHOLD, mood: LOW_MOOD_THRESHOLD })),
    ).toEqual({
      wantsFood: true,
      urgentlyNeedsFood: true,
      lowMood: true,
    });
  });
});
