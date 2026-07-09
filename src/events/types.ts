import type { ResidentId } from "@/core/ids";
import type { Needs } from "@/core/needs";

export type SoloSceneType = "hungry" | "tired" | "bored" | "lonely" | "quirk";

// Escenas sociales (F4): siempre 2 participantes. Comparten nombre con
// `RelationshipAction` (src/relationships/status.ts) por diseño - el mapeo es
// 1:1 (ver src/events/resolve-social.ts) y TS lo comprueba por exhaustividad.
export type SocialSceneType =
  | "meet"
  | "chat"
  | "argument"
  | "reconcile"
  | "flirt"
  | "confess"
  | "propose";

export type SceneType = SoloSceneType | SocialSceneType;

export const SOCIAL_SCENE_TYPES: readonly SocialSceneType[] = [
  "meet",
  "chat",
  "argument",
  "reconcile",
  "flirt",
  "confess",
  "propose",
];

export function isSocialSceneType(sceneType: SceneType): sceneType is SocialSceneType {
  return (SOCIAL_SCENE_TYPES as readonly SceneType[]).includes(sceneType);
}

export type SceneCause =
  | { kind: "need"; need: keyof Needs; value: number }
  | { kind: "quirk"; quirkId: string }
  | { kind: "social" };

export interface SceneIntent {
  sceneType: SceneType;
  // [0] = protagonista (o primero del par, orden estable a<b); [1] = contraparte
  // en escenas sociales. Las escenas "solo" siempre llevan 1 elemento.
  participants: ResidentId[];
  cause: SceneCause;
  urgency: number;
  createdAtMs: number;
}

export interface SceneLogEntry {
  sceneType: SceneType;
  participants: ResidentId[];
  atMs: number;
}

export interface SceneStats {
  scenesResolved: number;
}

export const SCENE_LOG_CAP = 20;
