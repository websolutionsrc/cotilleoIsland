// Descripción del avatar de un residente. En Fase 1 son solo claves de string
// (referencias a piezas de un futuro editor/atlas); el render actual es un
// placeholder (ver src/ui) que solo usa `color` para teñir una figura simple.

export interface Avatar {
  face: string;
  hair: string;
  eyes: string;
  mouth: string;
  color: string;
}

/** Avatar por defecto para un residente nuevo, siguiendo el ejemplo de docs/data_model.md. */
export const DEFAULT_AVATAR: Avatar = {
  face: "round_01",
  hair: "short_01",
  eyes: "happy_01",
  mouth: "small_01",
  color: "warm_01",
};
