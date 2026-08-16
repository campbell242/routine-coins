// IndexedDB persistence (thin `idb` wrapper). Everything the app needs to
// survive app kill and device reboot lives here: coin balance, occurrences,
// overrides, customization, timer state, parent PIN hash.

import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import { PROFILE_ID } from '../config/profile';
import type { PlanOverride } from '../config/types';
import type { Occurrence } from '../engine/machine';
import type { TimerState } from '../engine/timer';

export interface Settings {
  avatar: string;
  theme: string;
}

/**
 * A celebration the child has not collected yet. Approval banks the coins
 * immediately (see saveApproval); this is only the party waiting to be
 * released by HER tap, not the parent's. Persisted because a parent may
 * approve last night's routine while she is at school — the moment has to
 * survive the app closing.
 */
export interface PendingAward {
  occId: string;
  planName: string;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  streak: number;
}

interface KvShape {
  balance: number;
  overrides: Record<string, PlanOverride>;
  settings: Settings;
  timer: TimerState;
  pinHash: string;
  /** Oldest first — one entry per approved-but-uncollected routine. */
  pendingAwards: PendingAward[];
}

interface HaleyDB extends DBSchema {
  kv: { key: string; value: unknown };
  occurrences: { key: string; value: Occurrence };
}

/**
 * Named after the profile, because IndexedDB is scoped per ORIGIN, not per
 * path: two children's apps served from one origin (e.g. two GitHub Pages
 * projects under the same user) would otherwise share one database and one
 * coin balance. Changing PROFILE_ID silently opens an empty database — see
 * the warning on it, and the test pinning this exact string.
 */
export const DB_NAME = `${PROFILE_ID}-routine-coins`;
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
 * Approval writes the resolved occurrence and the new balance in ONE
 * transaction, so a kill mid-approval can never award coins without
 * resolving (or resolve without awarding).
 */
export async function saveApproval(occ: Occurrence, balance: number): Promise<void> {
  const d = await db();
  const tx = d.transaction(['kv', 'occurrences'], 'readwrite');
  void tx.objectStore('occurrences').put(occ);
  void tx.objectStore('kv').put(balance, 'balance');
  await tx.done;
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
