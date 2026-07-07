import type { ResidentId } from "@/core/ids";

export type RandomSource = () => number;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function mulberry32(seed: number): RandomSource {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashString(input: string): number {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function dayBucket(nowMs: number): number {
  return Math.floor(nowMs / MS_PER_DAY);
}

export function seedForResidentDay(residentId: ResidentId, nowMs: number): number {
  return (hashString(residentId) ^ dayBucket(nowMs)) >>> 0;
}

