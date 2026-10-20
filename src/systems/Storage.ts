/** Acesso ao localStorage que nunca lança erro (modo privado, storage bloqueado, cota cheia). */
export const Storage = {
  get<T>(key: string, fallback: T): T {
    try {
      const raw = window.localStorage.getItem(key);
      return raw === null ? fallback : (JSON.parse(raw) as T);
    } catch {
      return fallback;
    }
  },
  set(key: string, value: unknown): boolean {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch {
      return false;
    }
  },
  remove(key: string): void {
    try {
      window.localStorage.removeItem(key);
    } catch {
      /* ignorado */
    }
  },
  has(key: string): boolean {
    try {
      return window.localStorage.getItem(key) !== null;
    } catch {
      return false;
    }
  },
};
