// Puerto de persistencia clave-valor. El SaveSystem depende solo de esta
// interfaz (inyección de dependencias), nunca de una implementación concreta.
// Esto permite testear SaveSystem con InMemoryStorage sin IndexedDB/DOM.

export interface StoragePort {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T): Promise<void>;
  remove(key: string): Promise<void>;
  keys(): Promise<string[]>;
}
