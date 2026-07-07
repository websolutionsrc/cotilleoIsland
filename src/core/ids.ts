// Ids tipados (branded strings) para evitar mezclar identificadores de distintas
// entidades por error de tipos (p.ej. pasar un ItemId donde se espera un ResidentId).

/** Branded string type: en runtime es un string normal, en compile-time es distinguible. */
export type Id<Brand extends string> = string & { readonly __brand: Brand };

export type ResidentId = Id<"ResidentId">;

const DIACRITICS_RANGE = /[̀-ͯ]/g;

/**
 * Genera un slug legible a partir de un texto (p.ej. el nombre de un residente),
 * siguiendo la convención de ids del data model (`resident_lina`).
 */
function slugify(text: string): string {
  return text
    .normalize("NFD")
    .replace(DIACRITICS_RANGE, "") // quita acentos/diacríticos
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

/** Sufijo corto y no determinista para evitar colisiones entre residentes homónimos. */
function randomSuffix(): string {
  return Math.random().toString(36).slice(2, 8);
}

/** Crea un `ResidentId` legible y (prácticamente) único a partir del nombre. */
export function createResidentId(name: string): ResidentId {
  const slug = slugify(name) || "sin_nombre";
  return `resident_${slug}_${randomSuffix()}` as ResidentId;
}
