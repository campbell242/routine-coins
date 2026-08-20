// Building a celebration the child will collect later.
//
// Two things produce one: approving a routine (see store.parentApprove) and a
// parent handing out coins for something wonderful. Both bank the coins at the
// PARENT's tap and defer only the party — see DECISIONS.md on why the award
// itself is never deferred.

import type { PendingAward } from '../persistence/db';
import { adjust } from './ledger';

/**
 * A spontaneous "you did something wonderful" award. No occurrence exists, so
 * the id is synthetic — unique per award, so two bonuses in one sitting queue
 * as two moments instead of collapsing into one.
 *
 * `streak: 0` is deliberate: a bonus does not extend her streak, so the award
 * screen must not print a streak line (or fire a milestone) that would imply
 * it did.
 */
export function bonusAward(amount: number, balanceBefore: number, now: number): PendingAward {
  return {
    occId: `bonus:${now}`,
    kind: 'bonus',
    planName: 'Bonus coins',
    amount: Math.round(amount),
    balanceBefore,
    balanceAfter: adjust(balanceBefore, amount),
    streak: 0,
  };
}
