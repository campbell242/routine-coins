import { describe, expect, it } from 'vitest';
import { PROFILE_ID } from '../../config/profile';
import { backupFileName, buildBackup, parseBackup, BACKUP_FORMAT } from '../backup';
import type { Occurrence } from '../../engine/machine';

const AT = '2026-08-17T03:15:00.000Z';

const occ: Occurrence = {
  id: 'nighttime:2026-08-16',
  planId: 'nighttime',
  dateKey: '2026-08-16',
  status: 'approved',
  snapshot: {
    planId: 'nighttime',
    name: 'Nighttime Routine',
    baseAward: 204,
    windowStart: '19:00',
    items: [{ id: 'n-snack', label: 'Snack time', kind: 'required', attestation: 'child' }],
    takenAt: 1,
  },
  checks: { 'n-snack': { checked: true, at: 1, by: 'child' } },
  startedAt: 1,
  award: 344,
};

const contents = {
  balance: 1240,
  occurrences: [occ],
  overrides: { nighttime: { baseAward: 204 } },
  settings: { avatar: 'fox', theme: 'nether', sound: false },
  pendingAwards: [
    { occId: 'bonus:1', kind: 'bonus' as const, planName: 'Bonus coins', amount: 50, balanceBefore: 1190, balanceAfter: 1240, streak: 0 },
  ],
};

describe('backup file', () => {
  it('round-trips everything worth keeping', () => {
    const file = buildBackup(contents, AT);
    const parsed = parseBackup(JSON.stringify(file));
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.file.balance).toBe(1240);
    expect(parsed.file.occurrences).toHaveLength(1);
    expect(parsed.file.occurrences[0].award).toBe(344);
    expect(parsed.file.overrides).toEqual({ nighttime: { baseAward: 204 } });
    expect(parsed.file.settings.avatar).toBe('fox');
    expect(parsed.file.settings.sound).toBe(false);
    expect(parsed.file.pendingAwards).toHaveLength(1); // an uncollected celebration survives
    expect(parsed.counts).toEqual({ occurrences: 1, pendingAwards: 1 });
  });

  it('never carries the PIN hash or a running timer', () => {
    const json = JSON.stringify(buildBackup(contents, AT));
    expect(json).not.toContain('pinHash');
    expect(json).not.toContain('timer');
  });

  it('names the file by profile and date', () => {
    expect(backupFileName(AT)).toBe(`${PROFILE_ID}-coins-backup-2026-08-17.json`);
  });

  it('refuses anything that is not one of our backups', () => {
    for (const bad of ['', 'not json', '[]', '"a string"', '{}', JSON.stringify({ format: 1 })]) {
      expect(parseBackup(bad).ok).toBe(false);
    }
  });

  it('refuses another profile, and a newer format', () => {
    const other = { ...buildBackup(contents, AT), profileId: 'someone-else' };
    const otherResult = parseBackup(JSON.stringify(other));
    expect(otherResult.ok).toBe(false);
    if (!otherResult.ok) expect(otherResult.reason).toMatch(/different profile/i);

    const future = { ...buildBackup(contents, AT), format: BACKUP_FORMAT + 1 };
    const futureResult = parseBackup(JSON.stringify(future));
    expect(futureResult.ok).toBe(false);
    if (!futureResult.ok) expect(futureResult.reason).toMatch(/newer version/i);
  });

  it('refuses a missing or negative balance rather than guessing', () => {
    const noBalance = { ...buildBackup(contents, AT) } as Record<string, unknown>;
    delete noBalance.balance;
    expect(parseBackup(JSON.stringify(noBalance)).ok).toBe(false);
    expect(parseBackup(JSON.stringify({ ...buildBackup(contents, AT), balance: -5 })).ok).toBe(false);
  });

  it('drops one broken night instead of losing the whole backup', () => {
    const file = buildBackup({ ...contents, occurrences: [occ, { id: 'junk' } as unknown as Occurrence] }, AT);
    const parsed = parseBackup(JSON.stringify(file));
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.counts.occurrences).toBe(1);
    expect(parsed.file.occurrences[0].id).toBe(occ.id);
  });

  it('tolerates a file with no overrides, settings or pending awards', () => {
    const minimal = { format: 1, profileId: PROFILE_ID, exportedAt: AT, balance: 0, occurrences: [] };
    const parsed = parseBackup(JSON.stringify(minimal));
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.file.overrides).toEqual({});
    expect(parsed.file.pendingAwards).toEqual([]);
    expect(parsed.file.settings.avatar).toBeTruthy();
  });
});
