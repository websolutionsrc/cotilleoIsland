import type { RelationshipStatus } from "./types";

/**
 * Acciones que pueden disparar una transicion de `status`. Coinciden con los
 * `sceneType` sociales de F4.3 salvo `flirt`, que solo empuja `romance` (no
 * cambia el status por si sola: el hito romantico real es `confess`).
 */
export type RelationshipAction =
  | "meet"
  | "chat"
  | "argument"
  | "reconcile"
  | "flirt"
  | "confess"
  | "propose";

export const FRIENDSHIP_FRIEND_THRESHOLD = 30;
export const FRIENDSHIP_BESTIE_THRESHOLD = 70;
export const CONFESS_FRIENDSHIP_MIN = 50;
export const CONFESS_CHEMISTRY_MIN = 60;
export const PROPOSE_FRIENDSHIP_MIN = 70;
export const PROPOSE_CHEMISTRY_MIN = 70;

export interface StatusTransitionContext {
  /** `friendship` de la relacion DESPUES de aplicar el delta de la accion. */
  friendship: number;
  /** `chemistry(a, b, relationship)` evaluado con la relacion actual. */
  chemistry: number;
}

/**
 * Calcula el siguiente `status` tras resolver una escena social. Determinista,
 * sin efectos secundarios. `status` SOLO cambia por una de estas transiciones
 * explicitas (nunca por cruce pasivo de umbral de friendship/romance - regla
 * #0 de engine_design_f3-f5.md: es un hito con memoria, no un bucket).
 *
 * Diagrama completo en engine_design_f3-f5.md #3.2. Decision de implementacion
 * (no explicita en el diseno original): `reconcile` siempre aterriza en
 * friends/besties segun el `friendship` actual, tanto si se venia de una pelea
 * de amigos como de pareja - la reconciliacion romantica exige un nuevo
 * `confess`, pero como `romance`/`friendship` no se borran, suele ser rapida.
 */
export function nextRelationshipStatus(
  current: RelationshipStatus,
  action: RelationshipAction,
  ctx: StatusTransitionContext,
): RelationshipStatus {
  switch (action) {
    case "meet":
      return current === "strangers" ? "acquaintances" : current;

    case "chat": {
      if (current === "acquaintances" && ctx.friendship >= FRIENDSHIP_FRIEND_THRESHOLD) {
        return "friends";
      }
      if (current === "friends" && ctx.friendship >= FRIENDSHIP_BESTIE_THRESHOLD) {
        return "besties";
      }
      return current;
    }

    case "argument": {
      const canFight =
        current === "friends" || current === "besties" || current === "dating" || current === "partners";
      return canFight ? "fighting" : current;
    }

    case "reconcile": {
      if (current !== "fighting") return current;
      return ctx.friendship >= FRIENDSHIP_BESTIE_THRESHOLD ? "besties" : "friends";
    }

    case "flirt":
      return current; // solo empuja `romance`; no es un hito de status.

    case "confess": {
      const eligible = current === "friends" || current === "besties";
      const meetsGuard = ctx.friendship >= CONFESS_FRIENDSHIP_MIN && ctx.chemistry >= CONFESS_CHEMISTRY_MIN;
      return eligible && meetsGuard ? "dating" : current;
    }

    case "propose": {
      const meetsGuard = ctx.friendship >= PROPOSE_FRIENDSHIP_MIN && ctx.chemistry >= PROPOSE_CHEMISTRY_MIN;
      return current === "dating" && meetsGuard ? "partners" : current;
    }
  }
}
