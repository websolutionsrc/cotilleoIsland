// Paleta de colores para el placeholder de avatar (Fase 1: sin sprites reales
// todavía, solo un círculo teñido). Vive en la capa de UI porque es un detalle
// de render, no de dominio.

const PALETTE: Record<string, number> = {
  warm_01: 0xe8a55c,
  warm_02: 0xe07a5f,
  cool_01: 0x5c8ae8,
  cool_02: 0x3d5a80,
  fresh_01: 0x81b29a,
  fresh_02: 0x4caf7d,
};

const DEFAULT_COLOR = 0xcccccc;

/** Devuelve un color hex (0xRRGGBB) para una clave de avatar. Con fallback. */
export function colorForAvatar(colorKey: string): number {
  return PALETTE[colorKey] ?? DEFAULT_COLOR;
}
