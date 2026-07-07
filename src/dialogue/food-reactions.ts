import type { Needs } from "@/core/needs";
import type { Resident } from "@/core/resident";
import type { FoodItem } from "@/data/foods";

export interface FoodReactionContext {
  resident: Resident;
  food: FoodItem;
  beforeNeeds: Needs;
  afterNeeds: Needs;
}

export function foodReactionFor(context: FoodReactionContext): string {
  const hungerDelta = context.beforeNeeds.hunger - context.afterNeeds.hunger;
  const moodDelta = context.afterNeeds.mood - context.beforeNeeds.mood;
  const name = context.resident.name;
  const foodName = context.food.name.toLowerCase();

  if (hungerDelta >= 40 && moodDelta >= 5) {
    return `${name}: Justo lo que necesitaba. Ese ${foodName} me ha arreglado el día.`;
  }
  if (hungerDelta >= 40) {
    return `${name}: Uf, ya puedo pensar en otra cosa que no sea comer.`;
  }
  if (moodDelta >= 8) {
    return `${name}: No tenía tanta hambre, pero esto me ha puesto de buen humor.`;
  }
  if (hungerDelta <= 5) {
    return `${name}: Gracias, aunque creo que esto era más antojo que comida.`;
  }
  return `${name}: Gracias por el ${foodName}. Mucho mejor.`;
}
