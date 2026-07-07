import type { StoragePort } from "./storage-port";

/**
 * Implementación en memoria de `StoragePort`, para tests (Vitest en Node, sin
 * IndexedDB/DOM). Clona los valores en get/set (JSON) para imitar la
 * serialización real de un backend de storage y evitar falsos positivos por
 * aliasing de objetos entre el test y el storage.
 */
export class InMemoryStorage implements StoragePort {
  private readonly store = new Map<string, string>();

  async get<T>(key: string): Promise<T | null> {
    const raw = this.store.get(key);
    if (raw === undefined) return null;
    return JSON.parse(raw) as T;
  }

  async set<T>(key: string, value: T): Promise<void> {
    this.store.set(key, JSON.stringify(value));
  }

  async remove(key: string): Promise<void> {
    this.store.delete(key);
  }

  async keys(): Promise<string[]> {
    return Array.from(this.store.keys());
  }
}
