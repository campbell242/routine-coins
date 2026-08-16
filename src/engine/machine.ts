// The routine-occurrence state machine. This is the ONE place occurrence
// lifecycle transitions live; UI and store call these pure functions.
//
//   in_progress ──requestReview──▶ review_requested ──approve──▶ approved
//        ▲                              │        └────close────▶ closed
//        └──ackSentBack── sent_back ◀───┘ sendBack
//
// ("not started" is the absence of an occurrence; approve/close/sendBack are
// parent capabilities and are allowed from ANY unresolved status — a parent
// may approve despite an incomplete required item, close a stale occurrence,
// or send back something that was never formally submitted.)

import type { ItemConfig, PlanResolved, PlanSnapshot } from '../config/types';

export type OccurrenceStatus =
  | 'in_progress'
  | 'review_requested'
  | 'sent_back'
  | 'approved'
  | 'closed'
  /**
   * Parent-excused night (sleepover, travel, sick day): resolved with no
   * award, and the streak SKIPS the day like a non-scheduled one instead of
   * breaking. May be applied retroactively.
   */
  | 'excused';

export interface ItemCheck {
  checked: boolean;
  at: number;
  by: 'child' | 'parent';
}

export interface Occurrence {
  /** `${planId}:${dateKey}` — the dateKey is the occurrence's START date. */
  id: string;
  planId: string;
  dateKey: string;
  status: OccurrenceStatus;
  snapshot: PlanSnapshot;
  checks: Record<string, ItemCheck>;
  startedAt: number;
  /** First moment all required child-attested items were done. */
  finishedAt?: number;
  reviewRequestedAt?: number;
  sentBackNote?: string;
  sentBackAt?: number;
  resolvedAt?: number;
  /** Final coins awarded on approval. */
  award?: number;
}

export function occurrenceId(planId: string, dk: string): string {
  return `${planId}:${dk}`;
}

export function isResolved(occ: Occurrence): boolean {
  return occ.status === 'approved' || occ.status === 'closed' || occ.status === 'excused';
}

export function makeSnapshot(plan: PlanResolved, now: number): PlanSnapshot {
  return {
    planId: plan.id,
    name: plan.name,
    baseAward: plan.baseAward,
    windowStart: plan.windowStart,
    windowEnd: plan.windowEnd,
    // Deep-copy so later config edits can never reach into an active occurrence.
    items: plan.items.map((i) => ({ ...i })),
    takenAt: now,
  };
}

export function startOccurrence(plan: PlanResolved, dk: string, now: number): Occurrence {
  return {
    id: occurrenceId(plan.id, dk),
    planId: plan.id,
    dateKey: dk,
    status: 'in_progress',
    snapshot: makeSnapshot(plan, now),
    checks: {},
    startedAt: now,
  };
}

// ---------- derived helpers ----------

export function isChecked(occ: Occurrence, itemId: string): boolean {
  return occ.checks[itemId]?.checked === true;
}

/** Required items the CHILD can attest to (parent-verified items never gate her). */
export function requiredChildItems(occ: Occurrence): ItemConfig[] {
  return occ.snapshot.items.filter((i) => i.kind === 'required' && i.attestation === 'child');
}

export function requiredDoneCount(occ: Occurrence): number {
  return requiredChildItems(occ).filter((i) => isChecked(occ, i.id)).length;
}

export function allRequiredDone(occ: Occurrence): boolean {
  const req = requiredChildItems(occ);
  return req.every((i) => isChecked(occ, i.id));
}

/** Items a parent attests to later (e.g. overnight bedtime items). */
export function parentVerifyItems(occ: Occurrence): ItemConfig[] {
  return occ.snapshot.items.filter((i) => i.attestation === 'parent-morning');
}

export function bonusItems(occ: Occurrence): ItemConfig[] {
  return occ.snapshot.items.filter((i) => i.kind === 'bonus');
}

/** Suggested award = base + completed bonuses (parent may edit before approving). */
export function suggestedAward(occ: Occurrence): number {
  const bonus = bonusItems(occ)
    .filter((i) => isChecked(occ, i.id))
    .reduce((sum, i) => sum + (i.bonus ?? 0), 0);
  return occ.snapshot.baseAward + bonus;
}

/** In progress with every required item done → the gold "ask a parent" CTA. */
export function isReadyForReview(occ: Occurrence): boolean {
  return (occ.status === 'in_progress' || occ.status === 'sent_back') && allRequiredDone(occ);
}

// ---------- transitions (pure: return a new occurrence) ----------

export class TransitionError extends Error {}

function assertUnresolved(occ: Occurrence, action: string): void {
  if (isResolved(occ)) throw new TransitionError(`${action}: occurrence already resolved`);
}

/**
 * Toggle an item. The child may toggle her own items while the occurrence is
 * editable; a parent may toggle anything (including overnight items) while
 * the occurrence is unresolved.
 */
export function toggleItem(
  occ: Occurrence,
  itemId: string,
  by: 'child' | 'parent',
  now: number,
): Occurrence {
  assertUnresolved(occ, 'toggleItem');
  const item = occ.snapshot.items.find((i) => i.id === itemId);
  if (!item) throw new TransitionError(`toggleItem: unknown item ${itemId}`);
  if (by === 'child') {
    if (item.attestation !== 'child') {
      throw new TransitionError('toggleItem: item is parent-verified');
    }
    if (occ.status !== 'in_progress' && occ.status !== 'sent_back') {
      throw new TransitionError('toggleItem: checklist is waiting for a parent');
    }
  }
  const next: Occurrence = {
    ...occ,
    checks: {
      ...occ.checks,
      [itemId]: { checked: !isChecked(occ, itemId), at: now, by },
    },
  };
  // Stamp the first moment every required item is done (used for "Finished 8:05 AM").
  if (next.finishedAt === undefined && allRequiredDone(next)) {
    next.finishedAt = now;
  }
  return next;
}

/** Child taps "Ask a parent to check!". */
export function requestReview(occ: Occurrence, now: number): Occurrence {
  assertUnresolved(occ, 'requestReview');
  if (occ.status !== 'in_progress' && occ.status !== 'sent_back') {
    throw new TransitionError('requestReview: not in an editable state');
  }
  if (!allRequiredDone(occ)) {
    throw new TransitionError('requestReview: required items not done');
  }
  return {
    ...occ,
    status: 'review_requested',
    reviewRequestedAt: now,
    sentBackNote: undefined,
  };
}

/** Parent sends the routine back for another try. Checked items are preserved. */
export function sendBack(occ: Occurrence, note: string | undefined, now: number): Occurrence {
  assertUnresolved(occ, 'sendBack');
  return {
    ...occ,
    status: 'sent_back',
    sentBackNote: note?.trim() ? note.trim() : undefined,
    sentBackAt: now,
  };
}

/** Child taps "Fix it and ask again" on the sent-back banner (acknowledges the note). */
export function ackSentBack(occ: Occurrence): Occurrence {
  if (occ.status !== 'sent_back') throw new TransitionError('ackSentBack: not sent back');
  return { ...occ, status: 'in_progress' };
}

/**
 * Parent approves and awards `award` coins. Allowed from any unresolved
 * status — including approving despite incomplete required items.
 */
export function approve(occ: Occurrence, award: number, now: number): Occurrence {
  assertUnresolved(occ, 'approve');
  if (!Number.isFinite(award) || award < 0) {
    throw new TransitionError('approve: invalid award');
  }
  return { ...occ, status: 'approved', award: Math.round(award), resolvedAt: now };
}

/** Parent closes the routine for today. Neutral: no award, no blame. */
export function closeForToday(occ: Occurrence, now: number): Occurrence {
  assertUnresolved(occ, 'closeForToday');
  return { ...occ, status: 'closed', resolvedAt: now };
}

/**
 * Parent excuses the night (sleepover, travel…). No award; the streak skips
 * this date instead of breaking.
 */
export function excuseNight(occ: Occurrence, now: number): Occurrence {
  assertUnresolved(occ, 'excuseNight');
  return { ...occ, status: 'excused', resolvedAt: now };
}
