import { describe, expect, it } from "vitest";
import { DEFAULT_NEEDS } from "@/core/needs";
import { FOOD_CATALOG } from "@/data/foods";
import { foodReactionFor } from "@/dialogue/food-reactions";
import { createResident } from "@/residents/factory";

const resident = createResident({ name: "Lina" });
const tortilla = FOOD_CATALOG.find((food) => food.id === "food_tortilla") ?? FOOD_CATALOG[0];

describe("foodReactionFor", () => {
  it("genera una reacción intensa cuando baja mucho el hambre y sube el ánimo", () => {
    const reaction = foodReactionFor({
      resident,
      food: tortilla,
      beforeNeeds: { ...DEFAULT_NEEDS, hunger: 90, mood: 40 },
      afterNeeds: { ...DEFAULT_NEEDS, hunger: 30, mood: 50 },
    });

    expect(reaction).toContain("Lina:");
    expect(reaction).toContain("arreglado el día");
  });

  it("genera una reacción de ánimo cuando el efecto principal es mood", () => {
    const reaction = foodReactionFor({
      resident,
      food: tortilla,
      beforeNeeds: { ...DEFAULT_NEEDS, hunger: 20, mood: 40 },
      afterNeeds: { ...DEFAULT_NEEDS, hunger: 15, mood: 50 },
    });

    expect(reaction).toContain("buen humor");
  });

  it("genera fallback agradecido para una comida normal", () => {
    const reaction = foodReactionFor({
      resident,
      food: tortilla,
      beforeNeeds: { ...DEFAULT_NEEDS, hunger: 60, mood: 60 },
      afterNeeds: { ...DEFAULT_NEEDS, hunger: 35, mood: 63 },
    });

    expect(reaction).toContain("Gracias");
  });
});
