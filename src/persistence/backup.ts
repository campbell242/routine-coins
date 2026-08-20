// Backup and restore: the one way data leaves this phone.
//
// There is no server and no sync, so a lost or wiped phone is a lost coin
// balance and a lost streak history. A backup is a single JSON file the
// parent saves wherever they like; a restore replaces everything on this
// phone with that file's contents.
//
// The build/parse pair here is pure and exhaustively validated, because the
// input is a file a human picked — it may be truncated, from another child,
// or not a backup at all. Nothing partial is ever applied: parse fully, then
// write in one transaction (see restoreBackup).

import { PROFILE_ID } from '../config/profile';
import type { PlanOverride } from '../config/types';
import type { Occurrence } from '../engine/machine';
import type { PendingAward, Settings } from './db';

/** Bump only for a shape change older builds could not read correctly. */
export const BACKUP_FORMAT = 1;

export interface BackupFile {
  format: number;
  /** Whose data this is — restoring another child's file is refused. */
  profileId: string;
  /** ISO timestamp, for the filename and the "last backed up" line. */
  exportedAt: string;
  balance: number;
  occurrences: Occurrence[];
  overrides: Record<string, PlanOverride>;
  settings: Settings;
  pendingAwards: PendingAward[];
}

export interface BackupContents {
  balance: number;
  occurrences: Occurrence[];
  overrides: Record<string, PlanOverride>;
  settings: Settings;
  pendingAwards: PendingAward[];
}

/**
 * The PIN hash and the running timer are deliberately NOT in a backup. The
 * hash is a 4-digit secret that would be brute-forceable offline by anyone
 * who found the file (including Haley); a restored phone keeps whatever PIN
 * it already has. A half-finished timer is not worth restoring.
 */
export function buildBackup(contents: BackupContents, exportedAt: string): BackupFile {
  return {
    format: BACKUP_FORMAT,
    profileId: PROFILE_ID,
    exportedAt,
    balance: contents.balance,
    occurrences: contents.occurrences,
    overrides: contents.overrides,
    settings: contents.settings,
    pendingAwards: contents.pendingAwards,
  };
}

export function backupFileName(exportedAt: string): string {
  return `${PROFILE_ID}-coins-backup-${exportedAt.slice(0, 10)}.json`;
}

export type ParseResult =
  | { ok: true; file: BackupFile; counts: { occurrences: number; pendingAwards: number } }
  | { ok: false; reason: string };

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/** An occurrence we can safely put back — mirrors the store's own guard. */
function isOccurrence(v: unknown): v is Occurrence {
  if (!isPlainObject(v)) return false;
  const snapshot = v.snapshot;
  return (
    typeof v.id === 'string' &&
    typeof v.planId === 'string' &&
    typeof v.dateKey === 'string' &&
    typeof v.status === 'string' &&
    isPlainObject(snapshot) &&
    Array.isArray(snapshot.items) &&
    isPlainObject(v.checks)
  );
}

/**
 * Validate a file the parent picked. Every failure returns a reason plain
 * enough to show in the parent area — the copy there explains mechanics and
 * stops.
 */
export function parseBackup(text: string): ParseResult {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, reason: 'That file is not a backup — it could not be read.' };
  }
  if (!isPlainObject(raw)) return { ok: false, reason: 'That file is not a backup.' };

  const format = raw.format;
  if (typeof format !== 'number' || !Number.isFinite(format)) {
    return { ok: false, reason: 'That file is not a backup — no format marker.' };
  }
  if (format > BACKUP_FORMAT) {
    return { ok: false, reason: 'That backup was made by a newer version of the app. Update first, then restore.' };
  }
  if (raw.profileId !== PROFILE_ID) {
    return { ok: false, reason: 'That backup belongs to a different profile.' };
  }
  if (typeof raw.balance !== 'number' || !Number.isFinite(raw.balance) || raw.balance < 0) {
    return { ok: false, reason: 'That backup has no readable coin balance.' };
  }
  if (!Array.isArray(raw.occurrences)) {
    return { ok: false, reason: 'That backup has no routine history.' };
  }

  // Drop individually broken records rather than refusing the whole file: a
  // backup missing one malformed night still restores the coins and the rest
  // of the history.
  const occurrences = raw.occurrences.filter(isOccurrence);
  const settings = isPlainObject(raw.settings) ? (raw.settings as unknown as Settings) : undefined;
  const file: BackupFile = {
    format,
    profileId: PROFILE_ID,
    exportedAt: typeof raw.exportedAt === 'string' ? raw.exportedAt : '',
    balance: Math.round(raw.balance),
    occurrences,
    overrides: isPlainObject(raw.overrides) ? (raw.overrides as Record<string, PlanOverride>) : {},
    settings: settings ?? { avatar: 'axolotl', theme: 'overworld' },
    pendingAwards: Array.isArray(raw.pendingAwards) ? (raw.pendingAwards as PendingAward[]) : [],
  };
  return {
    ok: true,
    file,
    counts: { occurrences: occurrences.length, pendingAwards: file.pendingAwards.length },
  };
}
