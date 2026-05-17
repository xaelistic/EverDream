type StoredValue = { value?: string };

/** Mirrors Cursor/host storage API; falls back to localStorage for Vite dev. */
export function ensureBrowserStorage() {
  if (typeof window === 'undefined') return;

  const memory = new Map<string, string>();

  const wrap = {
    async get(key: string): Promise<StoredValue | null> {
      try {
        const v = localStorage.getItem(`ed.${key}`);
        if (v !== null) return { value: v };
      } catch {
        /* ignore */
      }
      const m = memory.get(key);
      return m !== undefined ? { value: m } : null;
    },
    async set(key: string, value: string): Promise<void> {
      try {
        localStorage.setItem(`ed.${key}`, value);
      } catch {
        memory.set(key, value);
      }
    },
    async delete(key: string): Promise<void> {
      try {
        localStorage.removeItem(`ed.${key}`);
      } catch {
        /* ignore */
      }
      memory.delete(key);
    },
  };

  const w = window as Window & {
    storage?: typeof wrap;
    currentRecognition?: SpeechRecognition;
  };

  if (!w.storage) {
    w.storage = wrap;
  }
}
