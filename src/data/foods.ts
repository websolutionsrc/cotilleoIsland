import type { FoodEffect, NeedsDelta } from "@/core/needs";
import foodsJson from "./foods.json";

export const FOOD_CATEGORIES = ["meal", "snack", "drink", "treat"] as const;

export type FoodCategory = (typeof FOOD_CATEGORIES)[number];

export interface FoodItem extends FoodEffect {
  id: string;
  name: string;
  category: FoodCategory;
}

export type FoodCatalogValidationResult =
  | { ok: true; value: FoodItem[] }
  | { ok: false; errors: string[] };

const NEEDS_DELTA_KEYS = ["hunger", "mood", "energy", "social_need", "boredom"] as const;

type RawRecord = Record<string, unknown>;

function isRecord(value: unknown): value is RawRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isFoodCategory(value: unknown): value is FoodCategory {
  return typeof value === "string" && FOOD_CATEGORIES.includes(value as FoodCategory);
}

function validateNeedsDelta(value: unknown, path: string, errors: string[]): NeedsDelta | null {
  if (!isRecord(value)) {
    errors.push(`${path}.needsDelta debe ser un objeto`);
    return null;
  }

  const delta: NeedsDelta = {};
  for (const [key, rawDelta] of Object.entries(value)) {
    if (!NEEDS_DELTA_KEYS.includes(key as (typeof NEEDS_DELTA_KEYS)[number])) {
      errors.push(`${path}.needsDelta.${key} no es una necesidad válida`);
      continue;
    }
    if (typeof rawDelta !== "number" || !Number.isFinite(rawDelta) || !Number.isInteger(rawDelta)) {
      errors.push(`${path}.needsDelta.${key} debe ser un entero finito`);
      continue;
    }
    if (rawDelta < -100 || rawDelta > 100) {
      errors.push(`${path}.needsDelta.${key} debe estar entre -100 y 100`);
      continue;
    }
    delta[key as keyof NeedsDelta] = rawDelta;
  }

  if (Object.keys(delta).length === 0) {
    errors.push(`${path}.needsDelta debe tener al menos un efecto`);
    return null;
  }

  return delta;
}

export function validateFoodCatalog(input: unknown): FoodCatalogValidationResult {
  const errors: string[] = [];
  const items: FoodItem[] = [];
  const ids = new Set<string>();

  if (!Array.isArray(input)) {
    return { ok: false, errors: ["El catálogo de comidas debe ser un array"] };
  }

  input.forEach((rawItem, index) => {
    const path = `foods[${index}]`;
    if (!isRecord(rawItem)) {
      errors.push(`${path} debe ser un objeto`);
      return;
    }

    const { id, name, category, needsDelta } = rawItem;
    if (typeof id !== "string" || id.trim().length === 0) {
      errors.push(`${path}.id debe ser texto no vacío`);
      return;
    }
    if (ids.has(id)) {
      errors.push(`${path}.id duplicado: ${id}`);
    }
    ids.add(id);

    if (typeof name !== "string" || name.trim().length === 0) {
      errors.push(`${path}.name debe ser texto no vacío`);
      return;
    }

    if (!isFoodCategory(category)) {
      errors.push(`${path}.category debe ser una categoría válida`);
      return;
    }

    const validatedDelta = validateNeedsDelta(needsDelta, path, errors);
    if (validatedDelta === null) return;

    items.push({
      id,
      name,
      category,
      needsDelta: validatedDelta,
    });
  });

  return errors.length > 0 ? { ok: false, errors } : { ok: true, value: items };
}

const catalogValidation = validateFoodCatalog(foodsJson);
if (!catalogValidation.ok) {
  throw new Error(`Catálogo de comidas inválido: ${catalogValidation.errors.join("; ")}`);
}

export const FOOD_CATALOG: readonly FoodItem[] = catalogValidation.value;
