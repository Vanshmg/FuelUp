/**
 * Adapters are the only code that knows WHERE data lives.
 * Today: the browser's localStorage. Later: swap in a Supabase adapter
 * without touching the rest of the app.
 */

export interface StorageAdapter {
  read(): string | null;
  write(value: string): void;
  /** Keep a copy of saved data we couldn't read, so it's never lost. */
  backup(value: string): void;
  readBackup(): string | null;
}

const STORAGE_KEY = "fuelup:v1";
const BACKUP_KEY = "fuelup:backup";

/** Browser storage. Never throws: private mode or a full disk just means no saving. */
export function localStorageAdapter(): StorageAdapter {
  return {
    read() {
      try {
        return window.localStorage.getItem(STORAGE_KEY);
      } catch {
        return null;
      }
    },
    write(value) {
      try {
        window.localStorage.setItem(STORAGE_KEY, value);
      } catch {
        // Storage full or blocked. The app keeps working from memory.
      }
    },
    backup(value) {
      try {
        window.localStorage.setItem(BACKUP_KEY, value);
      } catch {
        // Nothing more we can do; the app keeps working.
      }
    },
    readBackup() {
      try {
        return window.localStorage.getItem(BACKUP_KEY);
      } catch {
        return null;
      }
    },
  };
}

/** In-memory storage for tests and for server rendering (no window there). */
export function memoryAdapter(initial: string | null = null): StorageAdapter {
  let value = initial;
  let saved: string | null = null;
  return {
    read: () => value,
    write: (next) => {
      value = next;
    },
    backup: (next) => {
      saved = next;
    },
    readBackup: () => saved,
  };
}
