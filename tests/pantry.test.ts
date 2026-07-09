import { describe, expect, it } from "vitest";
import { addToPantry, pantryQuantity, removeFromPantry } from "@/core/pantry";

describe("addToPantry", () => {
  it("inserts a new entry when the item is not present", () => {
    const pantry = addToPantry([], "food_apple", 3);
    expect(pantry).toEqual([{ itemId: "food_apple", qty: 3 }]);
  });

  it("accumulates quantity for an existing item", () => {
    const pantry = addToPantry([{ itemId: "food_apple", qty: 2 }], "food_apple", 3);
    expect(pantry).toEqual([{ itemId: "food_apple", qty: 5 }]);
  });

  it("is a no-op for zero or negative quantities", () => {
    expect(addToPantry([], "food_apple", 0)).toEqual([]);
    expect(addToPantry([], "food_apple", -1)).toEqual([]);
  });

  it("does not mutate the original array (pure)", () => {
    const original = [{ itemId: "food_apple", qty: 2 }];
    addToPantry(original, "food_apple", 3);
    expect(original).toEqual([{ itemId: "food_apple", qty: 2 }]);
  });
});

describe("removeFromPantry", () => {
  it("decrements quantity", () => {
    const pantry = removeFromPantry([{ itemId: "food_apple", qty: 5 }], "food_apple", 2);
    expect(pantry).toEqual([{ itemId: "food_apple", qty: 3 }]);
  });

  it("clamps at 0 and removes the entry entirely (no empty rows)", () => {
    const pantry = removeFromPantry([{ itemId: "food_apple", qty: 2 }], "food_apple", 5);
    expect(pantry).toEqual([]);
  });

  it("is a no-op for a missing item or non-positive quantity", () => {
    expect(removeFromPantry([], "food_apple", 1)).toEqual([]);
    expect(removeFromPantry([{ itemId: "food_apple", qty: 5 }], "food_apple", 0)).toEqual([
      { itemId: "food_apple", qty: 5 },
    ]);
  });
});

describe("pantryQuantity", () => {
  it("returns 0 for a missing item and the real quantity otherwise", () => {
    expect(pantryQuantity([], "food_apple")).toBe(0);
    expect(pantryQuantity([{ itemId: "food_apple", qty: 4 }], "food_apple")).toBe(4);
  });
});
