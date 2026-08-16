import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { DB_NAME, hashPin, kvGet, kvSet, loadOccurrences, saveOccurrence } from '../db';
import { startOccurrence } from '../../engine/machine';
import { resolvePlan } from '../../engine/overrides';
import { morningRoutine } from '../../config/plans';

describe('database identity', () => {
  // Pinned deliberately. Everything Haley has earned lives in a database
  // with this exact name; if a refactor or a PROFILE_ID edit changes it, the
  // app opens an empty database and her phone looks factory-reset. Changing
  // this literal is a data migration, never a rename — fail loudly first.
  it('is the name real installs already use', () => {
    expect(DB_NAME).toBe('haley-routine-coins');
  });
});

describe('persistence round-trip (survives "app kill")', () => {
  it('kv values and occurrences read back exactly as written', async () => {
    await kvSet('balance', 1240);
    await kvSet('overrides', { morning: { baseAward: 60 } });
    await kvSet('settings', { avatar: 'fox', theme: 'ocean' });
    await kvSet('timer', { phase: 'running', endAt: 123456789, totalMin: 12 });

    expect(await kvGet('balance')).toBe(1240);
    expect(await kvGet('overrides')).toEqual({ morning: { baseAward: 60 } });
    expect(await kvGet('settings')).toEqual({ avatar: 'fox', theme: 'ocean' });
    expect(await kvGet('timer')).toEqual({ phase: 'running', endAt: 123456789, totalMin: 12 });

    const occ = startOccurrence(resolvePlan(morningRoutine, undefined), '2026-08-11', Date.now());
    await saveOccurrence(occ);
    const all = await loadOccurrences();
    expect(all.find((o) => o.id === occ.id)).toEqual(occ);
  });

  it('missing keys read as undefined; PIN hash is stable and not the PIN', async () => {
    expect(await kvGet('pinHash')).toBeUndefined();
    const h = await hashPin('1234');
    expect(h).toHaveLength(64);
    expect(h).not.toContain('1234');
    expect(await hashPin('1234')).toBe(h);
    expect(await hashPin('4321')).not.toBe(h);
  });
});
