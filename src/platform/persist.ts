import Storage from 'expo-sqlite/kv-store';

const KEY = 'multi-timer/data';

/** Read the saved JSON (SQLite key-value store on the phone). */
export function loadRaw(): string | null {
  try {
    return Storage.getItemSync(KEY);
  } catch {
    return null;
  }
}

export function saveRaw(json: string): void {
  try {
    // Synchronous so the last change is saved even if the app is killed right after.
    Storage.setItemSync(KEY, json);
  } catch {
    // Nothing else to do: the next change will try again.
  }
}

export const isDemo = false;
