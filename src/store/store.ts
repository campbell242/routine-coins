// Application store: single source of truth for UI state. Wires the pure
// engine to persistence and navigation. React subscribes via
// useSyncExternalStore (see hooks.ts).

import { resolveAvatarId } from '../config/app';
import { allPlans, getPlanConfig } from '../config/plans';
import { DEFAULT_AVATAR, DEFAULT_PIN } from '../config/profile';
import { DEFAULT_THEME } from '../config/themes';
import type { PlanOverride, PlanResolved } from '../config/types';
import {
  ackSentBack,
  allRequiredDone,
  approve,
  cancelReview,
  closeForToday,
  excuseNight,
  isResolved,
  occurrenceId,
  requestReview,
  sendBack,
  startOccurrence,
  toggleItem,
  TransitionError,
  type Occurrence,
} from '../engine/machine';
import { bonusAward } from '../engine/awards';
import { adjust, award, redeem } from '../engine/ledger';
import { resolveAll, resolvePlan } from '../engine/overrides';
import { planStateNow, type OccurrenceMap } from '../engine/scheduler';
import { planStreak } from '../engine/streaks';
import {
  acknowledgeExpired,
  cancelTimer,
  fiveMoreMinutes,
  pauseTimer,
  reconcileTimer,
  resumeTimer,
  startTimer,
  TIMER_IDLE,
  type TimerState,
} from '../engine/timer';
import { dateKey } from '../lib/dates';
import {
  playAlarm,
  playAskParent,
  playCheckBlip,
  playLastRequired,
  playStreakMilestone,
  playTimerPause,
  playTimerStart,
  playPickBlip,
  setAudioPrefs,
  setQuietScale,
} from '../lib/audio';
import { setWakeLockWanted } from '../lib/wakeLock';
import {
  hashPin,
  kvGet,
  kvSet,
  loadOccurrences,
  replaceAllData,
  requestPersistentStorage,
  saveApproval,
  saveOccurrence,
  type PendingAward,
  type Settings,
} from '../persistence/db';
import { backupFileName, buildBackup, parseBackup, type ParseResult } from '../persistence/backup';

export type Route =
  | { name: 'home' }
  | { name: 'routine'; planId: string }
  | { name: 'timer' }
  | { name: 'me' }
  | { name: 'pin' }
  | { name: 'parent'; view: 'review' | 'settings'; reviewOccId?: string }
  | { name: 'handoff' }
  | { name: 'award' };

/**
 * Set when a parent enters the PIN pad from the routine screen's
 * "I'm the parent — review now" shortcut instead of Home's PARENTS chip.
 * The PIN is still required; the shortcut only changes where the unlocked
 * session lands (this occurrence's review) and where it hands the phone back
 * to (Haley's routine screen, not the parent area or Home).
 */
interface ParentShortcut {
  reviewOccId: string;
  returnRoute: Route;
}

/** The celebration payload the Award screen renders. */
export type AwardInfo = PendingAward;

export interface ToastData {
  id: number;
  title: string;
  subtitle?: string;
}

export interface AppState {
  ready: boolean;
  nowMs: number;
  route: Route;
  balance: number;
  occurrences: OccurrenceMap;
  overrides: Record<string, PlanOverride>;
  settings: Settings;
  timer: TimerState;
  toasts: ToastData[];
  award?: AwardInfo;
  /** Approved routines whose celebration Haley hasn't released yet. */
  pendingAwards: PendingAward[];
  parentUnlocked: boolean;
}

type Listener = () => void;

// Screens where timer expiry may yank navigation to the TIME'S UP screen.
// The award celebration is deliberately excluded — the chime still sounds and
// the timer pill takes over; the celebration isn't stolen mid-moment.
const CHILD_SCREENS = new Set(['home', 'routine', 'timer', 'me']);

/** Streak milestones: 7, 14, 30, then every 30 (spec §3). */
export function isStreakMilestone(streak: number): boolean {
  return streak === 7 || streak === 14 || (streak >= 30 && streak % 30 === 0);
}

function sanitizeOccurrences(list: Occurrence[]): OccurrenceMap {
  const map: OccurrenceMap = {};
  for (const occ of list) {
    // Defensive: persisted data referencing broken/old shapes must never crash.
    if (
      occ &&
      typeof occ.id === 'string' &&
      typeof occ.planId === 'string' &&
      typeof occ.dateKey === 'string' &&
      typeof occ.status === 'string' &&
      occ.snapshot &&
      Array.isArray(occ.snapshot.items) &&
      occ.checks &&
      typeof occ.checks === 'object'
    ) {
      map[occ.id] = occ;
    }
  }
  return map;
}

/**
 * Settings as they come off disk (or out of a backup) may name an avatar the
 * catalog has since retired; point those at the avatar that took the slot.
 */
function normalizeSettings(settings: Settings | undefined): Settings {
  if (!settings) return { avatar: DEFAULT_AVATAR, theme: DEFAULT_THEME };
  const avatar = resolveAvatarId(settings.avatar);
  return avatar === settings.avatar ? settings : { ...settings, avatar };
}

class Store {
  private state: AppState = {
    ready: false,
    nowMs: Date.now(),
    route: { name: 'home' },
    balance: 0,
    occurrences: {},
    overrides: {},
    settings: { avatar: DEFAULT_AVATAR, theme: DEFAULT_THEME },
    timer: TIMER_IDLE,
    toasts: [],
    pendingAwards: [],
    parentUnlocked: false,
  };

  private listeners = new Set<Listener>();
  private pinHash = '';
  private parentShortcut: ParentShortcut | undefined;
  private toastSeq = 0;
  private tickHandle: number | undefined;

  subscribe = (fn: Listener): (() => void) => {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  };

  getState = (): AppState => this.state;

  private set(partial: Partial<AppState>): void {
    this.state = { ...this.state, ...partial };
    this.listeners.forEach((fn) => fn());
  }

  // ---------- boot ----------

  async init(): Promise<void> {
    void requestPersistentStorage();

    const [balance, overrides, settings, timer, pinHash, pendingAwards, occList] = await Promise.all([
      kvGet('balance'),
      kvGet('overrides'),
      kvGet('settings'),
      kvGet('timer'),
      kvGet('pinHash'),
      kvGet('pendingAwards'),
      loadOccurrences(),
    ]);

    if (pinHash) {
      this.pinHash = pinHash;
    } else {
      this.pinHash = await hashPin(DEFAULT_PIN);
      void kvSet('pinHash', this.pinHash);
    }

    const now = Date.now();
    let timerState = timer ?? TIMER_IDLE;
    const reconciled = reconcileTimer(timerState, now);
    if (reconciled !== timerState) {
      timerState = reconciled;
      void kvSet('timer', timerState);
    }

    this.set({
      ready: true,
      nowMs: now,
      balance: balance ?? 0,
      overrides: overrides ?? {},
      settings: normalizeSettings(settings),
      timer: timerState,
      pendingAwards: Array.isArray(pendingAwards) ? pendingAwards : [],
      occurrences: sanitizeOccurrences(occList),
      // If the alarm moment was missed while the app was killed, show the
      // expired state immediately on reopen.
      route: timerState.phase === 'expired' ? { name: 'timer' } : { name: 'home' },
    });

    this.startTicking();
    this.syncWakeLock();
    this.syncAudio();
  }

  /**
   * Push sound preferences and the quiet state into the audio layer.
   * Auto-quiet runs from the Nighttime Routine's configured window start
   * (override-resolved — never a hardcoded time) until midnight: the phone
   * is in her room. Reduced gain, never mute — ×0.5 inside the window, and
   * ×0.25 once tonight's routine has been handed over (asked for review or
   * settled), since past that point nothing is Haley acting. A sent-back
   * routine puts the phone back in her hands, so it returns to ×0.5. The
   * alarm is exempt and keeps its gain.
   */
  private syncAudio(): void {
    const s = this.state.settings;
    setAudioPrefs({ cues: s.sound !== false, alarm: s.alarmSound !== false });
    const night = this.resolvedPlan('nighttime');
    if (!night?.enabled) {
      setQuietScale(1);
      return;
    }
    const d = new Date(this.state.nowMs);
    const minutes = d.getHours() * 60 + d.getMinutes();
    const [h, m] = night.windowStart.split(':').map(Number);
    if (minutes < h * 60 + m) {
      setQuietScale(1);
      return;
    }
    const tonight = this.state.occurrences[occurrenceId(night.id, dateKey(d))];
    const handedOver =
      tonight !== undefined && tonight.status !== 'in_progress' && tonight.status !== 'sent_back';
    setQuietScale(handedOver ? 0.25 : 0.5);
  }

  private startTicking(): void {
    if (this.tickHandle !== undefined) return;
    this.tickHandle = window.setInterval(() => this.tick(), 1000);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') this.tick();
    });
  }

  private tick(): void {
    const now = Date.now();
    const reconciled = reconcileTimer(this.state.timer, now);
    if (reconciled !== this.state.timer) {
      this.applyExpiry(reconciled, now);
      return;
    }
    this.set({ nowMs: now });
    this.syncAudio();
  }

  /**
   * The expiry moment: persist, sound the alarm, and surface the expired
   * screen if Haley is anywhere in the child area.
   */
  private applyExpiry(expired: TimerState, now: number): void {
    void kvSet('timer', expired);
    const onChildScreen = CHILD_SCREENS.has(this.state.route.name);
    this.set({
      nowMs: now,
      timer: expired,
      route: onChildScreen ? { name: 'timer' } : this.state.route,
    });
    playAlarm();
    this.syncWakeLock();
  }

  private syncWakeLock(): void {
    setWakeLockWanted(this.state.timer.phase === 'running');
  }

  // ---------- selectors ----------

  resolvedPlans(): PlanResolved[] {
    return resolveAll(allPlans, this.state.overrides);
  }

  resolvedPlan(planId: string): PlanResolved | undefined {
    const cfg = getPlanConfig(planId);
    return cfg ? resolvePlan(cfg, this.state.overrides[planId]) : undefined;
  }

  /** Unresolved occurrences a parent can act on, most urgent first. */
  reviewQueue(): Occurrence[] {
    const occs = Object.values(this.state.occurrences).filter((o) => !isResolved(o));
    const rank = (o: Occurrence) => (o.status === 'review_requested' ? 0 : 1);
    occs.sort((a, b) => rank(a) - rank(b) || a.dateKey.localeCompare(b.dateKey));
    return occs;
  }

  // ---------- navigation ----------

  navigate(route: Route): void {
    // Leaving the parent area ends the parent session (Amendment 2).
    const leavingParent = this.state.route.name === 'parent' && route.name !== 'parent';
    this.set({
      route,
      parentUnlocked: leavingParent ? false : this.state.parentUnlocked,
    });
  }

  /**
   * Routine-screen shortcut: a parent standing next to Haley goes straight to
   * the PIN pad and, once unlocked, straight to this occurrence's review —
   * no trip back to Home for the PARENTS chip. Not a bypass: the PIN pad is
   * the same one, and the session still starts only on a correct PIN.
   */
  parentReviewShortcut(occId: string): void {
    this.parentShortcut = { reviewOccId: occId, returnRoute: this.state.route };
    this.navigate({ name: 'pin' });
  }

  /** ✕ on the PIN pad — back where the parent came from, shortcut abandoned. */
  cancelPin(): void {
    this.navigate(this.takeShortcut()?.returnRoute ?? { name: 'home' });
  }

  private takeShortcut(): ParentShortcut | undefined {
    const shortcut = this.parentShortcut;
    this.parentShortcut = undefined;
    return shortcut;
  }

  // ---------- toasts ----------

  toast(title: string, subtitle?: string): void {
    const id = ++this.toastSeq;
    this.set({ toasts: [...this.state.toasts, { id, title, subtitle }] });
    window.setTimeout(() => {
      this.set({ toasts: this.state.toasts.filter((t) => t.id !== id) });
    }, 3200);
  }

  // ---------- occurrences ----------

  private putOccurrence(occ: Occurrence): void {
    this.set({ occurrences: { ...this.state.occurrences, [occ.id]: occ } });
    void saveOccurrence(occ);
  }

  /** Home CTA: open the plan's active occurrence, starting one if due. */
  openRoutine(planId: string): void {
    const plan = this.resolvedPlan(planId);
    if (!plan) return;
    const st = planStateNow(plan, this.state.occurrences, new Date(this.state.nowMs));
    if (st.kind === 'due') {
      const occ = startOccurrence(plan, dateKey(new Date(this.state.nowMs)), this.state.nowMs);
      this.putOccurrence(occ);
    } else if (st.kind !== 'active') {
      return; // nothing actionable (defensive)
    }
    this.navigate({ name: 'routine', planId });
  }

  /** The occurrence the routine screen should show for a plan. */
  activeOccurrence(planId: string): Occurrence | undefined {
    const open = Object.values(this.state.occurrences)
      .filter((o) => o.planId === planId && !isResolved(o))
      .sort((a, b) => a.dateKey.localeCompare(b.dateKey));
    return open[0];
  }

  childToggleItem(occId: string, itemId: string): void {
    const before = this.state.occurrences[occId];
    this.mutateOccurrence(occId, (occ) => toggleItem(occ, itemId, 'child', this.state.nowMs));
    const after = this.state.occurrences[occId];
    if (!before || !after || after === before) return; // rejected/no-op toggle

    // Sound is HERS: only a successful check makes a cue; unchecking is
    // silent (spec). The run's position derives from the occurrence's checked
    // count, so it resets with the routine and walks back down on unchecks.
    const nowChecked = after.checks[itemId]?.checked === true;
    if (!nowChecked) return;
    if (allRequiredDone(after) && !allRequiredDone(before)) {
      playLastRequired(); // G5 → C6: "that's the set"
    } else {
      const count = Object.values(after.checks).filter((c) => c.checked).length;
      playCheckBlip(count - 1);
    }
  }

  // Parent actions are silent, end to end (spec).
  parentToggleItem(occId: string, itemId: string): void {
    this.mutateOccurrence(occId, (occ) => toggleItem(occ, itemId, 'parent', this.state.nowMs));
  }

  childRequestReview(occId: string): void {
    const before = this.state.occurrences[occId];
    this.mutateOccurrence(occId, (occ) => requestReview(occ, this.state.nowMs));
    if (this.state.occurrences[occId] !== before) {
      playAskParent(); // handing over, not celebrating — the only descending cue
    }
  }

  /** "Keep going instead" — she takes an early ask back to finish an item. */
  childCancelReview(occId: string): void {
    this.mutateOccurrence(occId, (occ) => cancelReview(occ));
  }

  childAckSentBack(occId: string): void {
    this.mutateOccurrence(occId, (occ) => ackSentBack(occ));
  }

  private mutateOccurrence(occId: string, fn: (occ: Occurrence) => Occurrence): void {
    const occ = this.state.occurrences[occId];
    if (!occ) return;
    try {
      this.putOccurrence(fn(occ));
    } catch (e) {
      if (!(e instanceof TransitionError)) throw e;
      // Invalid transitions are ignored defensively (e.g. double-tap races).
    }
  }

  // ---------- parent actions ----------

  async verifyPin(pin: string): Promise<boolean> {
    const ok = (await hashPin(pin)) === this.pinHash;
    if (ok) {
      this.set({ parentUnlocked: true });
      // The shortcut lands on its own routine's review; the PARENTS chip keeps
      // its usual landing (oldest pending review, else settings). A shortcut
      // whose occurrence vanished meanwhile falls back to that same landing.
      const shortcutOccId = this.parentShortcut?.reviewOccId;
      const direct = shortcutOccId ? this.state.occurrences[shortcutOccId] : undefined;
      if (direct && !isResolved(direct)) {
        this.navigate({ name: 'parent', view: 'review', reviewOccId: direct.id });
      } else {
        const pending = this.reviewQueue();
        this.navigate({ name: 'parent', view: pending.length > 0 ? 'review' : 'settings' });
      }
    }
    return ok;
  }

  /** LOCK — ends the session and hands the phone back where it came from. */
  lock(): void {
    this.set({ parentUnlocked: false });
    this.navigate(this.takeShortcut()?.returnRoute ?? { name: 'home' });
  }

  async setPin(pin: string): Promise<void> {
    this.pinHash = await hashPin(pin);
    void kvSet('pinHash', this.pinHash);
  }

  parentApprove(occId: string, amount: number): void {
    const occ = this.state.occurrences[occId];
    if (!occ || isResolved(occ)) return;
    let approved: Occurrence;
    try {
      approved = approve(occ, amount, this.state.nowMs);
    } catch {
      return;
    }
    const balanceBefore = this.state.balance;
    const balanceAfter = award(balanceBefore, approved.award ?? 0);
    this.set({
      occurrences: { ...this.state.occurrences, [approved.id]: approved },
      balance: balanceAfter,
    });
    // One transaction: resolving and awarding can never be split by a kill.
    void saveApproval(approved, balanceAfter);

    const plan = this.resolvedPlan(occ.planId);
    const streak = plan
      ? planStreak(plan, { ...this.state.occurrences, [approved.id]: approved }, dateKey(new Date(this.state.nowMs)))
      : 0;

    // The celebration is NOT played here. Approving banks the coins; the
    // party belongs to Haley, and waits for her tap (see collectAward).
    // Queued rather than replacing, so approving two routines in one sitting
    // can't silently swallow one of her moments.
    const pendingAwards = [
      ...this.state.pendingAwards.filter((p) => p.occId !== approved.id),
      {
        occId: approved.id,
        kind: 'routine' as const,
        planName: occ.snapshot.name,
        amount: approved.award ?? 0,
        balanceBefore,
        balanceAfter,
        streak,
      },
    ];
    this.set({ pendingAwards });
    void kvSet('pendingAwards', pendingAwards);

    // The handoff screen is child-facing, so this leaves the parent area and
    // ends the session — and it already hands the phone back, so the
    // shortcut's return route is spent rather than followed.
    this.takeShortcut();
    this.navigate({ name: 'handoff' });
  }

  /**
   * Haley's tap releases the celebration the parent's approval queued up.
   * The coins were already hers; this is the moment, and it is hers to open.
   */
  collectAward(): void {
    const [next, ...rest] = this.state.pendingAwards;
    if (!next) {
      this.navigate({ name: 'home' });
      return;
    }
    this.set({ award: next, pendingAwards: rest });
    void kvSet('pendingAwards', rest);
    this.navigate({ name: 'award' });
    if (isStreakMilestone(next.streak)) {
      // Let the award moment's own "Routine complete!" card land first.
      window.setTimeout(() => {
        this.toast(`★ ${next.streak} day streak!`, 'Amazing! Keep it going!');
        playStreakMilestone(); // milestones only — never the daily extension
      }, 2600);
    }
  }

  parentSendBack(occId: string, note: string | undefined): void {
    this.mutateOccurrence(occId, (occ) => sendBack(occ, note, this.state.nowMs));
    // Hand the phone back: to Haley's routine screen (now showing the
    // sent-back banner) when the parent came in through the shortcut,
    // otherwise Home as before.
    this.navigate(this.takeShortcut()?.returnRoute ?? { name: 'home' });
  }

  parentCloseToday(occId: string): void {
    this.mutateOccurrence(occId, (occ) => closeForToday(occ, this.state.nowMs));
    // Stay in the parent area — there may be more to review or settings to visit.
    this.navigate({ name: 'parent', view: this.reviewQueue().length > 0 ? 'review' : 'settings' });
  }

  /**
   * Excuse a night (sleepover, travel…): the streak skips that date; no
   * coins. Works retroactively — if nobody opened the app that night, an
   * already-excused occurrence is created for the date. No-op if the date
   * was already resolved.
   */
  parentExcuseNight(planId: string, dk: string): void {
    const existing = this.state.occurrences[occurrenceId(planId, dk)];
    if (existing) {
      if (isResolved(existing)) return; // already resolved — nothing to excuse
      this.mutateOccurrence(existing.id, (occ) => excuseNight(occ, this.state.nowMs));
      return;
    }
    const plan = this.resolvedPlan(planId);
    if (!plan) return;
    const occ = excuseNight(startOccurrence(plan, dk, this.state.nowMs), this.state.nowMs);
    this.putOccurrence(occ);
  }

  /**
   * Manual balance change from parent settings. A SUBTRACTION is silent and
   * stays put — nothing negative ever celebrates (tone rule). An ADDITION is
   * a reward, so it takes the same route an approval does: the coins land
   * here, at the parent's tap, and the celebration is queued for Haley and
   * released by her own tap on the handoff screen.
   */
  parentAdjustBalance(delta: number): void {
    const balanceBefore = this.state.balance;
    const next = adjust(balanceBefore, delta);
    this.set({ balance: next });
    void kvSet('balance', next);
    if (delta <= 0) return;

    const pendingAwards = [...this.state.pendingAwards, bonusAward(delta, balanceBefore, this.state.nowMs)];
    this.set({ pendingAwards });
    void kvSet('pendingAwards', pendingAwards);
    // Child-facing from here, so this ends the parent session — same as
    // approving, and it is what puts the phone back in her hands.
    this.takeShortcut();
    this.navigate({ name: 'handoff' });
  }

  /** Returns false if the redemption is invalid (e.g. exceeds balance). */
  parentRedeem(amount: number): boolean {
    try {
      const next = redeem(this.state.balance, amount);
      this.set({ balance: next });
      void kvSet('balance', next);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Everything worth keeping, as one JSON file: coins, the whole routine
   * history (which is what streaks are derived from), parent overrides,
   * her avatar and theme, and any uncollected celebration. No PIN hash and
   * no running timer — see backup.ts.
   */
  buildBackupFile(): { name: string; json: string } {
    const exportedAt = new Date(this.state.nowMs).toISOString();
    const file = buildBackup(
      {
        balance: this.state.balance,
        occurrences: Object.values(this.state.occurrences),
        overrides: this.state.overrides,
        settings: this.state.settings,
        pendingAwards: this.state.pendingAwards,
      },
      exportedAt,
    );
    return { name: backupFileName(exportedAt), json: JSON.stringify(file, null, 2) };
  }

  /** Validate a picked file without touching anything (drives the confirm copy). */
  inspectBackup(text: string): ParseResult {
    return parseBackup(text);
  }

  /**
   * Replace this phone's data with a backup's. Destructive and confirmed by
   * the caller; the write itself is one transaction, and the in-memory state
   * is refreshed from the same contents so the UI can't disagree with disk.
   */
  async restoreBackup(text: string): Promise<{ ok: boolean; reason?: string }> {
    const parsed = parseBackup(text);
    if (!parsed.ok) return { ok: false, reason: parsed.reason };
    const { balance, occurrences, overrides, pendingAwards } = parsed.file;
    const settings = normalizeSettings(parsed.file.settings);
    try {
      await replaceAllData({ balance, occurrences, overrides, settings, pendingAwards });
    } catch {
      return { ok: false, reason: 'The restore could not be saved. Nothing was changed.' };
    }
    this.set({
      balance,
      occurrences: sanitizeOccurrences(occurrences),
      overrides,
      settings,
      pendingAwards,
      timer: TIMER_IDLE,
      award: undefined,
    });
    this.syncAudio();
    this.syncWakeLock();
    return { ok: true };
  }

  setOverride(planId: string, patch: PlanOverride): void {
    const current = this.state.overrides[planId] ?? {};
    const merged: PlanOverride = { ...current, ...patch };
    const overrides = { ...this.state.overrides, [planId]: merged };
    this.set({ overrides });
    void kvSet('overrides', overrides);
  }

  /** "Base award (each routine)" — one parent setting, applied to every plan. */
  setBaseAwardAll(value: number): void {
    const overrides = { ...this.state.overrides };
    for (const plan of allPlans) {
      overrides[plan.id] = { ...(overrides[plan.id] ?? {}), baseAward: value };
    }
    this.set({ overrides });
    void kvSet('overrides', overrides);
  }

  // ---------- customization ----------

  /** Parent settings toggles. Setting them makes no sound (parent action). */
  setSoundPrefs(prefs: { sound?: boolean; alarmSound?: boolean }): void {
    const settings = { ...this.state.settings, ...prefs };
    this.set({ settings });
    void kvSet('settings', settings);
    this.syncAudio();
  }

  setAvatar(avatar: string): void {
    playPickBlip();
    const settings = { ...this.state.settings, avatar };
    this.set({ settings });
    void kvSet('settings', settings);
  }

  setTheme(theme: string): void {
    playPickBlip();
    const settings = { ...this.state.settings, theme };
    this.set({ settings });
    void kvSet('settings', settings);
  }

  // ---------- timer ----------

  private setTimer(next: TimerState): void {
    this.set({ timer: next });
    void kvSet('timer', next);
    this.syncWakeLock();
  }

  timerStart(minutes: number): void {
    this.setTimer(startTimer(minutes, Date.now()));
    playTimerStart();
  }

  timerPause(): void {
    const now = Date.now();
    try {
      const next = pauseTimer(this.state.timer, now);
      if (next.phase === 'expired') {
        // The tap landed after the real end moment — deliver the alarm, not a pause.
        this.applyExpiry(next, now);
        return;
      }
      this.setTimer(next);
      playTimerPause(); // resume stays silent — it already started once
    } catch {
      /* stale tap */
    }
  }

  timerResume(): void {
    try {
      this.setTimer(resumeTimer(this.state.timer, Date.now()));
    } catch {
      /* stale tap */
    }
  }

  timerCancel(): void {
    this.setTimer(cancelTimer());
  }

  timerDone(): void {
    try {
      this.setTimer(acknowledgeExpired(this.state.timer));
    } catch {
      /* stale tap */
    }
  }

  timerFiveMore(): void {
    try {
      this.setTimer(fiveMoreMinutes(this.state.timer, Date.now()));
    } catch {
      /* stale tap */
    }
  }
}

export const store = new Store();
