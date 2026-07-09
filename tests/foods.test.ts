import { describe, expect, it } from "vitest";
import { applyFoodEffect, DEFAULT_NEEDS, NEEDS_KEYS } from "@/core/needs";
import {
  FOOD_CATALOG,
  FOOD_CATEGORIES,
  validateFoodCatalog,
  type FoodItem,
} from "@/data/foods";

describe("food catalog", () => {
  it("carga un catálogo pequeño de comidas válidas", () => {
    expect(FOOD_CATALOG.length).toBeGreaterThanOrEqual(5);
    expect(FOOD_CATALOG.length).toBeLessThanOrEqual(8);

    for (const food of FOOD_CATALOG) {
      expect(food.id).toMatch(/^(food|drink)_/);
      expect(food.name.trim().length).toBeGreaterThan(0);
      expect(FOOD_CATEGORIES).toContain(food.category);
      expect(Object.keys(food.needsDelta).length).toBeGreaterThan(0);
      expect(Number.isInteger(food.price)).toBe(true);
      expect(food.price).toBeGreaterThanOrEqual(0);
    }
  });

  it("mantiene ids únicos", () => {
    const ids = FOOD_CATALOG.map((food) => food.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("define efectos solo sobre necesidades conocidas", () => {
    const validKeys = new Set<string>(NEEDS_KEYS);
    for (const food of FOOD_CATALOG) {
      for (const key of Object.keys(food.needsDelta)) {
        expect(validKeys.has(key)).toBe(true);
      }
    }
  });

  it("las comidas se pueden aplicar al core de necesidades", () => {
    const meal = FOOD_CATALOG.find((food) => food.category === "meal") as FoodItem;
    const result = applyFoodEffect({ ...DEFAULT_NEEDS, hunger: 80 }, meal);
    expect(result.hunger).toBeLessThan(80);
  });

  it("rechaza catálogos inválidos con errores acumulados", () => {
    const result = validateFoodCatalog([
      { id: "food_ok", name: "Ok", category: "meal", price: 10, needsDelta: { hunger: -10 } },
      { id: "food_ok", name: "", category: "space", price: 10, needsDelta: { magic: 10 } },
    ]);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.length).toBeGreaterThanOrEqual(2);
      expect(result.errors.join("\n")).toContain("duplicado");
    }
  });

  it("rechaza precios inválidos (faltantes, negativos o no enteros)", () => {
    const base = { id: "food_ok", name: "Ok", category: "meal", needsDelta: { hunger: -10 } };
    expect(validateFoodCatalog([base]).ok).toBe(false);
    expect(validateFoodCatalog([{ ...base, price: -1 }]).ok).toBe(false);
    expect(validateFoodCatalog([{ ...base, price: 1.5 }]).ok).toBe(false);
    expect(validateFoodCatalog([{ ...base, price: 10 }]).ok).toBe(true);
  });
});
