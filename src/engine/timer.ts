// Countdown timer. A RUNNING timer stores an absolute end timestamp; the
// display always derives from (endAt − now), so it survives backgrounding,
// app kill and screen-off. Minute-level entry only. A running timer cannot be
// extended — "+5 more min" exists only from the expired state.

export type TimerState =
  | { phase: 'idle' }
  | { phase: 'running'; endAt: number; totalMin: number }
  | { phase: 'paused'; remainingMs: number; totalMin: number }
  | { phase: 'expired'; totalMin: number; expiredAt: number };

export const TIMER_IDLE: TimerState = { phase: 'idle' };

export class TimerError extends Error {}

export function startTimer(minutes: number, now: number): TimerState {
  const min = Math.round(minutes);
  if (!Number.isFinite(minutes) || min < 1) throw new TimerError('start: invalid minutes');
  return { phase: 'running', endAt: now + min * 60_000, totalMin: min };
}

export function pauseTimer(state: TimerState, now: number): TimerState {
  if (state.phase !== 'running') throw new TimerError('pause: not running');
  // A tap that lands in the window between the real end moment and the next
  // UI tick must not strand a "paused at 00:00" timer — the truth is expired.
  const reconciled = reconcileTimer(state, now);
  if (reconciled.phase === 'expired') return reconciled;
  return { phase: 'paused', remainingMs: Math.max(0, state.endAt - now), totalMin: state.totalMin };
}

export function resumeTimer(state: TimerState, now: number): TimerState {
  if (state.phase !== 'paused') throw new TimerError('resume: not paused');
  return { phase: 'running', endAt: now + state.remainingMs, totalMin: state.totalMin };
}

export function cancelTimer(): TimerState {
  return TIMER_IDLE;
}

/** "Done!" on the expired screen. */
export function acknowledgeExpired(state: TimerState): TimerState {
  if (state.phase !== 'expired') throw new TimerError('acknowledge: not expired');
  return TIMER_IDLE;
}

/** "+5 more min" from the expired screen — a fresh 5-minute timer. */
export function fiveMoreMinutes(state: TimerState, now: number): TimerState {
  if (state.phase !== 'expired') throw new TimerError('fiveMore: not expired');
  return startTimer(5, now);
}

/**
 * Reconcile with the clock. If a running timer's end has passed — including
 * while the app was killed — it becomes expired (expiredAt = the real end
 * moment, so reopening shows the expired state immediately).
 */
export function reconcileTimer(state: TimerState, now: number): TimerState {
  if (state.phase === 'running' && now >= state.endAt) {
    return { phase: 'expired', totalMin: state.totalMin, expiredAt: state.endAt };
  }
  return state;
}

export function remainingMs(state: TimerState, now: number): number {
  switch (state.phase) {
    case 'running':
      return Math.max(0, state.endAt - now);
    case 'paused':
      return state.remainingMs;
    default:
      return 0;
  }
}

/** Fraction of the timer still remaining, 0..1 (drives the shrinking bar). */
export function remainingFraction(state: TimerState, now: number): number {
  if (state.phase === 'idle' || state.phase === 'expired') return 0;
  const total = state.totalMin * 60_000;
  return total <= 0 ? 0 : Math.min(1, remainingMs(state, now) / total);
}
