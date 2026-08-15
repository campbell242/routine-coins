import { describe, expect, it } from 'vitest';
import type { PlanConfig, PlanResolved } from '../../config/types';
import { resolvePlan } from '../overrides';
import {
  ackSentBack,
  allRequiredDone,
  approve,
  closeForToday,
  isReadyForReview,
  occurrenceId,
  requestReview,
  sendBack,
  startOccurrence,
  suggestedAward,
  toggleItem,
  TransitionError,
  type Occurrence,
} from '../machine';
import { canStartNow, planStateNow, type OccurrenceMap } from '../scheduler';
import { planStreak } from '../streaks';
import { adjust, award, LedgerError, redeem } from '../ledger';
import {
  fiveMoreMinutes,
  pauseTimer,
  reconcileTimer,
  remainingFraction,
  remainingMs,
  resumeTimer,
  startTimer,
} from '../timer';

const T0 = new Date(2026, 7, 11, 7, 0).getTime(); // Tue Aug 11 2026 07:00 local

const morningCfg: PlanConfig = {
  id: 'morning',
  name: 'Morning Routine',
  enabled: true,
  schedule: { days: [1, 2, 3, 4, 5] },
  windowStart: '06:30',
  windowEnd: '08:30',
  baseAward: 40,
  items: [
    { id: 'a', label: 'Brush teeth', kind: 'required', attestation: 'child' },
    { id: 'b', label: 'Get dressed', kind: 'required', attestation: 'child' },
    { id: 'x', label: 'Read', kind: 'bonus', bonus: 15, attestation: 'child' },
    { id: 'y', label: 'Desk', kind: 'bonus', bonus: 10, attestation: 'child' },
  ],
};

const nightCfg: PlanConfig = {
  id: 'nighttime',
  name: 'Nighttime Routine',
  enabled: true,
  schedule: { days: [0, 1, 2, 3, 4, 5, 6] },
  windowStart: '20:00',
  baseAward: 40,
  items: [
    { id: 'p', label: 'PJs', kind: 'required', attestation: 'child' },
    { id: 'lo', label: 'Lights out by 8:45', kind: 'bonus', bonus: 10, attestation: 'parent-morning' },
  ],
};

const morning: PlanResolved = resolvePlan(morningCfg, undefined);
const night: PlanResolved = resolvePlan(nightCfg, undefined);

function approvedOcc(plan: PlanResolved, dk: string): Occurrence {
  let occ = startOccurrence(plan, dk, T0);
  for (const item of plan.items.filter((i) => i.kind === 'required')) {
    occ = toggleItem(occ, item.id, 'child', T0);
  }
  occ = requestReview(occ, T0);
  return approve(occ, 40, T0);
}

describe('occurrence state machine', () => {
  it('walks the happy path and pays base + completed bonuses', () => {
    let occ = startOccurrence(morning, '2026-08-11', T0);
    expect(occ.status).toBe('in_progress');
    expect(isReadyForReview(occ)).toBe(false);

    occ = toggleItem(occ, 'a', 'child', T0 + 1000);
    occ = toggleItem(occ, 'b', 'child', T0 + 2000);
    expect(allRequiredDone(occ)).toBe(true);
    expect(occ.finishedAt).toBe(T0 + 2000);
    expect(isReadyForReview(occ)).toBe(true);

    occ = toggleItem(occ, 'x', 'child', T0 + 3000); // +15 bonus
    expect(suggestedAward(occ)).toBe(55);

    occ = requestReview(occ, T0 + 4000);
    expect(occ.status).toBe('review_requested');
    expect(() => toggleItem(occ, 'y', 'child', T0)).toThrow(TransitionError);

    const done = approve(occ, 55, T0 + 5000);
    expect(done.status).toBe('approved');
    expect(done.award).toBe(55);
    expect(() => approve(done, 1, T0)).toThrow(TransitionError);
  });

  it('send back preserves checked items; ack returns to in_progress', () => {
    let occ = startOccurrence(morning, '2026-08-11', T0);
    occ = toggleItem(occ, 'a', 'child', T0);
    occ = toggleItem(occ, 'b', 'child', T0);
    occ = requestReview(occ, T0);
    occ = sendBack(occ, 'Bed needs one more try', T0);
    expect(occ.status).toBe('sent_back');
    expect(occ.checks['a'].checked).toBe(true);
    expect(occ.checks['b'].checked).toBe(true);
    expect(occ.sentBackNote).toBe('Bed needs one more try');

    occ = ackSentBack(occ);
    expect(occ.status).toBe('in_progress');
    // child can fix and re-request
    occ = requestReview(occ, T0 + 1);
    expect(occ.status).toBe('review_requested');
    expect(occ.sentBackNote).toBeUndefined();
  });

  it('parent may approve despite incomplete required items', () => {
    let occ = startOccurrence(morning, '2026-08-11', T0);
    occ = toggleItem(occ, 'a', 'child', T0); // one of two required
    expect(allRequiredDone(occ)).toBe(false);
    expect(() => requestReview(occ, T0)).toThrow(TransitionError); // child gate holds
    const done = approve(occ, 40, T0); // parent capability
    expect(done.status).toBe('approved');
  });

  it('close for today resolves with no award', () => {
    const occ = startOccurrence(morning, '2026-08-11', T0);
    const closed = closeForToday(occ, T0);
    expect(closed.status).toBe('closed');
    expect(closed.award).toBeUndefined();
  });

  it('child cannot check parent-verified items; parent can, and they add bonus', () => {
    let occ = startOccurrence(night, '2026-08-11', T0);
    expect(() => toggleItem(occ, 'lo', 'child', T0)).toThrow(TransitionError);
    occ = toggleItem(occ, 'p', 'child', T0);
    // overnight item never gates the child's "ready" state
    expect(isReadyForReview(occ)).toBe(true);
    occ = requestReview(occ, T0);
    occ = toggleItem(occ, 'lo', 'parent', T0 + 1000); // next-morning verify
    expect(suggestedAward(occ)).toBe(50);
  });

  it('snapshots isolate occurrences from config changes', () => {
    const occ = startOccurrence(morning, '2026-08-11', T0);
    // simulate a config edit while the occurrence is unresolved
    morningCfg.items[0].label = 'CHANGED';
    expect(occ.snapshot.items[0].label).toBe('Brush teeth');
    morningCfg.items[0].label = 'Brush teeth';
  });
});

describe('overrides', () => {
  it('override wins over default, per field, and survives independently', () => {
    const resolved = resolvePlan(morningCfg, { baseAward: 60 });
    expect(resolved.baseAward).toBe(60);
    expect(resolved.windowStart).toBe('06:30'); // untouched field keeps default
    const occ = startOccurrence(resolved, '2026-08-11', T0);
    expect(occ.snapshot.baseAward).toBe(60);
  });
});

describe('scheduler + blocking', () => {
  it('unresolved occurrence blocks the next one until parent resolution', () => {
    const tue = new Date(2026, 7, 11, 7, 0);
    const wed = new Date(2026, 7, 12, 7, 0);
    const occs: OccurrenceMap = {};

    expect(canStartNow(morning, occs, tue)).toBe(true);
    const occ = startOccurrence(morning, '2026-08-11', tue.getTime());
    occs[occ.id] = occ;

    // Wednesday: Tuesday's occurrence is still unresolved → blocked, and the
    // stale occurrence (belonging to its start date) is what's actionable.
    const st = planStateNow(morning, occs, wed);
    expect(st.kind).toBe('active');
    if (st.kind === 'active') expect(st.occ.dateKey).toBe('2026-08-11');
    expect(canStartNow(morning, occs, wed)).toBe(false);

    // Parent resolves it Wednesday → Wednesday's occurrence may start.
    occs[occ.id] = closeForToday(occ, wed.getTime());
    expect(canStartNow(morning, occs, wed)).toBe(true);
  });

  it('respects window start and schedule days', () => {
    const tueEarly = new Date(2026, 7, 11, 6, 0); // before 06:30
    const sat = new Date(2026, 7, 15, 9, 0); // Saturday
    expect(planStateNow(morning, {}, tueEarly)).toEqual({ kind: 'upcoming', at: '06:30' });
    expect(planStateNow(morning, {}, sat)).toEqual({ kind: 'none' });
  });

  it('resolved today → done for today', () => {
    const tue = new Date(2026, 7, 11, 9, 0);
    const occs: OccurrenceMap = {};
    const done = approvedOcc(morning, '2026-08-11');
    occs[done.id] = done;
    expect(planStateNow(morning, occs, tue)).toEqual({ kind: 'none' });
  });

  it('disabled plan never starts but still surfaces an unresolved leftover', () => {
    const disabled: PlanResolved = { ...morning, enabled: false };
    const tue = new Date(2026, 7, 11, 7, 0);
    expect(planStateNow(disabled, {}, tue)).toEqual({ kind: 'none' });
    const leftover = startOccurrence(morning, '2026-08-10', T0);
    const st = planStateNow(disabled, { [leftover.id]: leftover }, tue);
    expect(st.kind).toBe('active');
  });
});

describe('streaks (schedule-aware, keyed to start date)', () => {
  it('weekday-only streaks survive weekends', () => {
    const occs: OccurrenceMap = {};
    // approved Mon Aug 3 … Fri Aug 7, then Mon Aug 10
    for (const dk of ['2026-08-03', '2026-08-04', '2026-08-05', '2026-08-06', '2026-08-07', '2026-08-10']) {
      const occ = approvedOcc(morning, dk);
      occs[occ.id] = occ;
    }
    // Tuesday Aug 11, morning not done yet → 6, unbroken by the weekend
    expect(planStreak(morning, occs, '2026-08-11')).toBe(6);
    // approving today extends it
    const today = approvedOcc(morning, '2026-08-11');
    occs[today.id] = today;
    expect(planStreak(morning, occs, '2026-08-11')).toBe(7);
  });

  it('a pending (unresolved) day does not break the chain; closed/missed does', () => {
    const occs: OccurrenceMap = {};
    for (const dk of ['2026-08-06', '2026-08-07']) {
      const occ = approvedOcc(morning, dk);
      occs[occ.id] = occ;
    }
    // Monday Aug 10 still waiting for a parent
    let monday = startOccurrence(morning, '2026-08-10', T0);
    monday = toggleItem(monday, 'a', 'child', T0);
    monday = toggleItem(monday, 'b', 'child', T0);
    monday = requestReview(monday, T0);
    occs[monday.id] = monday;
    expect(planStreak(morning, occs, '2026-08-11')).toBe(2); // Thu+Fri hold

    // resolved after midnight, still keyed to Monday → chain repairs
    occs[monday.id] = approve(monday, 40, new Date(2026, 7, 11, 7, 30).getTime());
    expect(planStreak(morning, occs, '2026-08-11')).toBe(3);

    // a closed day ends the chain
    occs[occurrenceId(morning.id, '2026-08-10')] = closeForToday(monday, T0);
    expect(planStreak(morning, occs, '2026-08-11')).toBe(0);

    // a missed day (no occurrence at all) ends it too
    delete occs[occurrenceId(morning.id, '2026-08-10')];
    expect(planStreak(morning, occs, '2026-08-11')).toBe(0);
  });
});

describe('task icons', () => {
  it('resolves known names and degrades gracefully for unknown/missing ones', async () => {
    const { iconSrc, TASK_ICONS } = await import('../../config/icons');
    expect(Object.keys(TASK_ICONS)).toHaveLength(37);
    expect(iconSrc('toothbrush')).toBe('assets/icons/toothbrush.png');
    expect(iconSrc('lantern')).toBe('assets/icons/lantern.png');
    expect(iconSrc('creeper-tnt')).toBeUndefined(); // invented name → no icon
    expect(iconSrc(undefined)).toBeUndefined();
    expect(iconSrc('')).toBeUndefined();
  });
});

describe('coin ledger', () => {
  it('award / adjust / redeem with clamps and limits', () => {
    expect(award(100, 55)).toBe(155);
    expect(adjust(100, -150)).toBe(0); // never below zero
    expect(adjust(100, 25)).toBe(125);
    expect(redeem(1720, 1720)).toBe(0); // exactly the threshold
    expect(redeem(1900, 1720)).toBe(180); // remainder retained
    expect(() => redeem(1000, 1720)).toThrow(LedgerError); // over balance blocked
    expect(() => redeem(1000, 0)).toThrow(LedgerError);
    expect(() => award(100, -5)).toThrow(LedgerError);
  });
});

describe('timer', () => {
  it('stores an absolute end and derives display from it', () => {
    const t = startTimer(12, T0);
    expect(t).toEqual({ phase: 'running', endAt: T0 + 12 * 60_000, totalMin: 12 });
    expect(remainingMs(t, T0 + 3 * 60_000)).toBe(9 * 60_000);
    expect(remainingFraction(t, T0 + 3 * 60_000)).toBeCloseTo(0.75);
  });

  it('expires while "killed": reconcile on reopen shows expired immediately', () => {
    const t = startTimer(5, T0);
    const later = T0 + 60 * 60_000; // reopened an hour later
    const r = reconcileTimer(t, later);
    expect(r).toEqual({ phase: 'expired', totalMin: 5, expiredAt: T0 + 5 * 60_000 });
    // and +5 more min starts a fresh 5-minute timer
    const again = fiveMoreMinutes(r, later);
    expect(again).toEqual({ phase: 'running', endAt: later + 5 * 60_000, totalMin: 5 });
  });

  it('pause freezes remaining; resume re-anchors the absolute end', () => {
    const t = startTimer(10, T0);
    const p = pauseTimer(t, T0 + 4 * 60_000);
    expect(p).toEqual({ phase: 'paused', remainingMs: 6 * 60_000, totalMin: 10 });
    expect(reconcileTimer(p, T0 + 999 * 60_000)).toBe(p); // paused never expires
    const r = resumeTimer(p, T0 + 20 * 60_000);
    expect(r).toEqual({ phase: 'running', endAt: T0 + 26 * 60_000, totalMin: 10 });
  });

  it('rejects sub-minute entry', () => {
    expect(() => startTimer(0, T0)).toThrow();
  });

  it('pause tapped after the real end moment resolves to expired, not paused-at-zero', () => {
    const t = startTimer(5, T0);
    const p = pauseTimer(t, T0 + 5 * 60_000 + 300); // tap lands 300ms past the end
    expect(p).toEqual({ phase: 'expired', totalMin: 5, expiredAt: T0 + 5 * 60_000 });
  });
});
