// IndexedDB persistence (thin `idb` wrapper). Everything the app needs to
// survive app kill and device reboot lives here: coin balance, occurrences,
// overrides, customization, timer state, parent PIN hash.

import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { PlanOverride } from '../config/types';
import type { Occurrence } from '../engine/machine';
import type { TimerState } from '../engine/timer';

export interface Settings {
  avatar: string;
  theme: string;
}

interface KvShape {
  balance: number;
  overrides: Record<string, PlanOverride>;
  settings: Settings;
  timer: TimerState;
  pinHash: string;
}

interface HaleyDB extends DBSchema {
  kv: { key: string; value: unknown };
  occurrences: { key: string; value: Occurrence };
}

const DB_NAME = 'haley-routine-coins';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<HaleyDB>> | undefined;

function db(): Promise<IDBPDatabase<HaleyDB>> {
  if (!dbPromise) {
    dbPromise = openDB<HaleyDB>(DB_NAME, DB_VERSION, {
      upgrade(d) {
        d.createObjectStore('kv');
        d.createObjectStore('occurrences', { keyPath: 'id' });
      },
      // Don't hold the database hostage if another context needs to
      // upgrade or delete it — close and reconnect on next use.
      blocking() {
        const p = dbPromise;
        dbPromise = undefined;
        void p?.then((d) => d.close());
      },
      terminated() {
        dbPromise = undefined;
      },
    });
  }
  return dbPromise;
}

export async function kvGet<K extends keyof KvShape>(key: K): Promise<KvShape[K] | undefined> {
  return (await (await db()).get('kv', key)) as KvShape[K] | undefined;
}

export async function kvSet<K extends keyof KvShape>(key: K, value: KvShape[K]): Promise<void> {
  await (await db()).put('kv', value, key);
}

export async function loadOccurrences(): Promise<Occurrence[]> {
  try {
    return await (await db()).getAll('occurrences');
  } catch {
    // Defensive: a corrupt store must never crash the app.
    return [];
  }
}

export async function saveOccurrence(occ: Occurrence): Promise<void> {
  await (await db()).put('occurrences', occ);
}

/**
 * Ask the browser to make our storage persistent (not evictable under
 * pressure). Called on startup; failures are non-fatal.
 */
export async function requestPersistentStorage(): Promise<boolean> {
  try {
    if (navigator.storage?.persist) {
      return await navigator.storage.persist();
    }
  } catch {
    /* ignore */
  }
  return false;
}

/** SHA-256 hex — the PIN is stored hashed, never in plain text. */
export async function hashPin(pin: string): Promise<string> {
  const data = new TextEncoder().encode(`haley-pin:${pin}`);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
