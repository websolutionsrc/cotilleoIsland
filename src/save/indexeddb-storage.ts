import localforage from "localforage";
import type { StoragePort } from "./storage-port";

/**
 * Implementación real de `StoragePort` sobre IndexedDB vía localForage.
 * Vive en src/save y solo se usa desde src/main.ts (la capa de runtime);
 * el resto de la lógica del juego nunca depende de esta clase directamente.
 */
export class IndexedDbStorage implements StoragePort {
  private readonly instance: LocalForage;

  constructor(storeName = "cotilleo-island") {
    this.instance = localforage.createInstance({
      name: "cotilleo-island",
      storeName,
      description: "Guardado local de Cotilleo Island (residentes, SaveState).",
    });
  }

  async get<T>(key: string): Promise<T | null> {
    const value = await this.instance.getItem<T>(key);
    return value ?? null;
  }

  async set<T>(key: string, value: T): Promise<void> {
    await this.instance.setItem(key, value);
  }

  async remove(key: string): Promise<void> {
    await this.instance.removeItem(key);
  }

  async keys(): Promise<string[]> {
    return this.instance.keys();
  }
}
