import type { ResidentId } from "@/core/ids";
import type { Needs } from "@/core/needs";

export type SceneType = "hungry" | "tired" | "bored" | "lonely" | "quirk";

export type SceneCause =
  | { kind: "need"; need: keyof Needs; value: number }
  | { kind: "quirk"; quirkId: string };

export interface SceneIntent {
  sceneType: SceneType;
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

