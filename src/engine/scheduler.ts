// Scheduling: which plan is actionable now, what unlocks next, and the
// blocking rule — an unresolved occurrence (even from a past day) belongs to
// its start date and blocks the plan's next occurrence until a parent
// resolves it. There is no midnight auto-reset.

import type { PlanResolved } from '../config/types';
import { addDays, dateKey, fromDateKey, minutesOfDay, parseHM, weekdayOf } from '../lib/dates';
import { isResolved, occurrenceId, type Occurrence } from './machine';

export type OccurrenceMap = Record<string, Occurrence>;

export function isScheduledOn(plan: PlanResolved, d: Date): boolean {
  return plan.schedule.days.includes(weekdayOf(d));
}

/** The single unresolved occurrence for a plan, if any (blocking rule ⇒ ≤ 1). */
export function unresolvedOccurrence(plan: PlanResolved, occs: OccurrenceMap): Occurrence | undefined {
  let found: Occurrence | undefined;
  for (const occ of Object.values(occs)) {
    if (occ.planId === plan.id && !isResolved(occ)) {
      if (!found || occ.dateKey < found.dateKey) found = occ; // oldest first
    }
  }
  return found;
}

export type PlanToday =
  /** An unresolved occurrence exists (today's or a stale one) — it is the actionable thing. */
  | { kind: 'active'; occ: Occurrence }
  /** Scheduled today, window open, not started yet. */
  | { kind: 'due' }
  /** Scheduled today but the window hasn't opened. */
  | { kind: 'upcoming'; at: string }
  /** Done for today, or not scheduled today. */
  | { kind: 'none' };

export function planStateNow(plan: PlanResolved, occs: OccurrenceMap, now: Date): PlanToday {
  if (!plan.enabled) {
    // Disabled plans never start new occurrences, but a leftover unresolved
    // occurrence is still surfaced so a parent can resolve it (degrade, don't crash).
    const open = unresolvedOccurrence(plan, occs);
    return open ? { kind: 'active', occ: open } : { kind: 'none' };
  }
  const open = unresolvedOccurrence(plan, occs);
  if (open) return { kind: 'active', occ: open };

  const todayKey = dateKey(now);
  const todays = occs[occurrenceId(plan.id, todayKey)];
  if (todays && isResolved(todays)) return { kind: 'none' }; // resolved today → done

  if (!isScheduledOn(plan, now)) return { kind: 'none' };
  if (minutesOfDay(now) < parseHM(plan.windowStart)) {
    return { kind: 'upcoming', at: plan.windowStart };
  }
  return { kind: 'due' };
}

/** May the child start a new occurrence of this plan right now? */
export function canStartNow(plan: PlanResolved, occs: OccurrenceMap, now: Date): boolean {
  return planStateNow(plan, occs, now).kind === 'due';
}

export interface NextUnlock {
  plan: PlanResolved;
  date: Date;
  windowStart: string;
  isToday: boolean;
}

/** The next time this plan unlocks (today later, or a future scheduled day). */
export function nextUnlock(plan: PlanResolved, occs: OccurrenceMap, now: Date): NextUnlock | undefined {
  if (!plan.enabled) return undefined;
  // A blocked plan (unresolved occurrence pending parent resolution) has no
  // honest unlock time — its card is the actionable thing, not a promise.
  if (unresolvedOccurrence(plan, occs)) return undefined;
  for (let i = 0; i < 8; i++) {
    const d = addDays(now, i);
    if (!isScheduledOn(plan, d)) continue;
    const dk = dateKey(d);
    const existing = occs[occurrenceId(plan.id, dk)];
    if (existing) continue; // already ran (or running) that day
    if (i === 0 && minutesOfDay(now) >= parseHM(plan.windowStart)) continue; // already open today
    return { plan, date: fromDateKey(dk), windowStart: plan.windowStart, isToday: i === 0 };
  }
  return undefined;
}

/** Earliest upcoming unlock across plans — the Home hint line. */
export function earliestUnlock(plans: PlanResolved[], occs: OccurrenceMap, now: Date): NextUnlock | undefined {
  const candidates = plans
    .map((p) => nextUnlock(p, occs, now))
    .filter((u): u is NextUnlock => u !== undefined);
  candidates.sort((a, b) => {
    const at = a.date.getTime() + parseHM(a.windowStart) * 60_000;
    const bt = b.date.getTime() + parseHM(b.windowStart) * 60_000;
    return at - bt;
  });
  return candidates[0];
}
