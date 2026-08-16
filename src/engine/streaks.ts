// Schedule-aware streaks, keyed to each occurrence's START date.
//
// Walking backward over the plan's *scheduled* days (so a weekday-only plan's
// streak survives weekends):
//   • approved  → counts, keep walking
//   • excused (parent: sleepover etc.) → skipped like a non-scheduled day
//   • unresolved (still pending a parent) → doesn't count yet, doesn't break
//   • closed, or the day passed with no occurrence → the chain ends
// Today (and a pending day) never breaks the chain — a streak only ever
// quietly stops growing; there is no failure messaging anywhere (tone rule).

import type { PlanResolved } from '../config/types';
import { addDays, dateKey, fromDateKey } from '../lib/dates';
import { isScheduledOn, type OccurrenceMap } from './scheduler';
import { occurrenceId } from './machine';

const MAX_LOOKBACK_DAYS = 400;

export function planStreak(plan: PlanResolved, occs: OccurrenceMap, todayKey: string): number {
  let streak = 0;
  let d = fromDateKey(todayKey);
  for (let i = 0; i < MAX_LOOKBACK_DAYS; i++, d = addDays(d, -1)) {
    if (!isScheduledOn(plan, d)) continue; // gap days (e.g. weekends) are skipped
    const dk = dateKey(d);
    const occ = occs[occurrenceId(plan.id, dk)];
    if (occ?.status === 'approved') {
      streak++;
      continue;
    }
    if (occ?.status === 'excused') continue; // parent-excused night — skip, don't count, don't break
    if (dk === todayKey) continue; // today just isn't done yet
    if (occ && occ.status !== 'closed') continue; // pending parent resolution — not broken yet
    break; // closed or missed → chain ends here
  }
  return streak;
}

/** The number shown on Home: the best current streak across enabled plans. */
export function displayStreak(plans: PlanResolved[], occs: OccurrenceMap, todayKey: string): number {
  let best = 0;
  for (const plan of plans) {
    if (!plan.enabled) continue;
    best = Math.max(best, planStreak(plan, occs, todayKey));
  }
  return best;
}
