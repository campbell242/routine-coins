import { useEffect } from 'react';
import { AVATARS } from '../../config/app';
import { CHILD_NAME, REDEMPTION_THRESHOLD } from '../../config/profile';
import {
  isReadyForReview,
  requiredChildItems,
  requiredDoneCount,
  valuedItems,
  type Occurrence,
} from '../../engine/machine';
import { earliestUnlock, planStateNow, type PlanToday } from '../../engine/scheduler';
import { displayStreak } from '../../engine/streaks';
import { dateKey, fmtClock, fmtCoins, fmtDateLong, fmtHM, fromDateKey } from '../../lib/dates';
import { store, useAppState } from '../../store/hooks';
import { isStreakMilestone } from '../../store/store';
import { ChildStrips, TabBar, TimerPill } from '../components/chrome';
import { Chip, CoinCount, PixelButton, Strip, XPBar, useTheme, type ChipKind } from '../components/core';
import type { PlanResolved } from '../../config/types';

// Which pip count each plan's card last showed (module-level: survives
// navigation, resets with the app). Pips that turned green since the card
// was last seen flip in with scaleX (spec §1's 200ms beat happens on the
// routine screen, where the pips aren't visible — so the flip plays the
// first time she sees the card again, once, never on plain revisits).
const seenPips = new Map<string, string>(); // planId → '0101…' done-mask
let lastShownStreak: number | undefined; // streak count Home last rendered

function cardChip(state: PlanToday): { kind: ChipKind; label: string } | undefined {
  if (state.kind === 'due') return undefined; // not started yet — no status chip
  if (state.kind !== 'active') return undefined;
  const occ = state.occ;
  if (occ.status === 'review_requested') return { kind: 'waiting', label: 'WAITING' };
  if (occ.status === 'sent_back') return { kind: 'sentback', label: 'SENT BACK' };
  if (isReadyForReview(occ)) return { kind: 'ready', label: 'READY' };
  return { kind: 'progress', label: 'IN PROGRESS' };
}

function RoutineCard({ plan, state }: { plan: PlanResolved; state: PlanToday }) {
  const theme = useTheme();
  const occ: Occurrence | undefined = state.kind === 'active' ? state.occ : undefined;

  const reqTotal = occ
    ? requiredChildItems(occ).length
    : plan.items.filter((i) => i.kind === 'required' && i.attestation === 'child').length;
  const reqDone = occ ? requiredDoneCount(occ) : 0;
  // "worth 204+": the plus means coin-valued items exist beyond the base —
  // bonuses or the coin-valued required sleep item.
  const hasBonus = occ
    ? valuedItems(occ).length > 0
    : plan.items.some((i) => i.bonus !== undefined);
  const base = occ ? occ.snapshot.baseAward : plan.baseAward;
  const windowEnd = occ ? occ.snapshot.windowEnd : plan.windowEnd;

  const today = dateKey(new Date(store.getState().nowMs));
  const stale = occ && occ.dateKey < today;
  const staleDay = stale
    ? new Date(occ.dateKey + 'T00:00').toLocaleDateString('en-US', { weekday: 'long' })
    : undefined;

  const parts: string[] = [];
  if (stale && staleDay) parts.push(`from ${staleDay}`);
  parts.push(`${reqDone} of ${reqTotal} done`);
  if (windowEnd && !stale) parts.push(`finish by ${fmtHM(windowEnd, false)}`);

  const chip = cardChip(state);
  const waiting = occ?.status === 'review_requested';
  const ready = occ !== undefined && isReadyForReview(occ);

  const segments = occ
    ? requiredChildItems(occ).map((i) => occ.checks[i.id]?.checked === true)
    : Array.from({ length: reqTotal }, () => false);

  // Pips greened since this card was last on screen get the one-time flip
  // (per-pip mask, so out-of-order checks flip the right pips).
  const mask = segments.map((d) => (d ? '1' : '0')).join('');
  const prevMask = seenPips.get(plan.id);
  useEffect(() => {
    seenPips.set(plan.id, mask);
  }, [plan.id, mask]);
  const newPips = segments
    .map((done, i) => (done && prevMask !== undefined && prevMask[i] === '0' ? i : -1))
    .filter((i) => i >= 0);

  let cta: JSX.Element;
  if (waiting) {
    cta = (
      <PixelButton variant="stone" style={{ fontSize: 20, padding: 16 }} onClick={() => store.navigate({ name: 'routine', planId: plan.id })}>
        Waiting for a parent…
      </PixelButton>
    );
  } else if (ready) {
    cta = (
      <PixelButton variant="gold" style={{ fontSize: 23, padding: 16 }} onClick={() => store.openRoutine(plan.id)}>
        Ask a parent ›
      </PixelButton>
    );
  } else {
    cta = (
      <PixelButton style={{ fontSize: 23, padding: 16 }} onClick={() => store.openRoutine(plan.id)}>
        {occ ? 'Keep going ›' : 'Start ›'}
      </PixelButton>
    );
  }

  return (
    <div style={{ background: '#fffdf6', border: '3px solid #2b2b24', boxShadow: '0 5px 0 rgba(43,43,36,.14)' }}>
      <Strip style={theme.strip} height={8} />
      <div style={{ padding: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <span className="px" style={{ fontSize: 24 }}>
            {occ ? occ.snapshot.name : plan.name}
          </span>
          {chip && (
            <span style={{ marginLeft: 'auto' }}>
              <Chip kind={chip.kind} fontSize={13}>
                {chip.label}
              </Chip>
            </span>
          )}
        </div>
        <div style={{ fontSize: 14, color: '#6b675c', fontWeight: 600, marginBottom: 12 }}>
          {parts.join(' · ')} · worth{' '}
          <b style={{ color: '#8a6200' }}>
            {base}
            {hasBonus ? '+' : ''} coins
          </b>
        </div>
        <div style={{ display: 'flex', gap: 5, marginBottom: 16 }}>
          {segments.map((done, i) => (
            // Static gray pip; green is an inset overlay so the flip's scaleX
            // never distorts the border (mirrors the §3a demo structure).
            <div
              key={i}
              style={{
                flex: 1,
                height: 12,
                background: '#d9d3c2',
                border: '2px solid #20241a',
                position: 'relative',
              }}
            >
              {done && (
                <div
                  className={newPips.includes(i) ? 'pip-flip' : undefined}
                  style={{
                    position: 'absolute',
                    inset: 0,
                    background: theme.primary,
                    ...(newPips.includes(i)
                      ? { animationDelay: `${newPips.indexOf(i) * 80}ms` }
                      : {}),
                  }}
                />
              )}
            </div>
          ))}
        </div>
        {cta}
      </div>
    </div>
  );
}

export function Home() {
  const state = useAppState();
  const now = new Date(state.nowMs);
  const clock = fmtClock(now);
  const plans = store.resolvedPlans();

  const planStates = plans
    .map((plan) => ({ plan, st: planStateNow(plan, state.occurrences, now) }))
    .filter(({ st }) => st.kind === 'active' || st.kind === 'due');

  const todayKey = dateKey(now);
  const streak = displayStreak(plans, state.occurrences, todayKey);

  // Streak extension (spec §3): the ★ pulses once when the count is higher
  // than this session last showed; milestones add the rising stars + gold
  // border flash. A broken streak animates nothing (the chip is absent).
  const prevStreak = lastShownStreak;
  useEffect(() => {
    lastShownStreak = streak;
  }, [streak]);
  const streakGrew = prevStreak !== undefined && streak > prevStreak;
  const streakMilestoneNow = streakGrew && isStreakMilestone(streak);
  const unlock = earliestUnlock(plans, state.occurrences, now);
  let unlockText: string | undefined;
  if (unlock) {
    const dayGap = Math.round((unlock.date.getTime() - fromDateKey(todayKey).getTime()) / 86_400_000);
    const when =
      dayGap === 0 ? 'at' : dayGap === 1 ? 'tomorrow at' : `${unlock.date.toLocaleDateString('en-US', { weekday: 'long' })} at`;
    unlockText = `${unlock.plan.name} ${when} ${fmtHM(unlock.windowStart)}`;
  }

  const approvedToday = Object.values(state.occurrences).some(
    (o) => o.status === 'approved' && o.dateKey === todayKey,
  );
  const nothingDue = planStates.length === 0;
  const greeting = nothingDue && approvedToday ? `All done, ${CHILD_NAME}!` : `Hi, ${CHILD_NAME}!`;

  const avatar = AVATARS.find((a) => a.id === state.settings.avatar) ?? AVATARS[0];
  const toGo = Math.max(0, REDEMPTION_THRESHOLD - state.balance);

  const hourFlavor = now.getHours() < 12 ? 'morning' : now.getHours() < 17 ? 'afternoon' : 'evening';

  return (
    <div className="screen" style={{ background: '#f3eee1', color: '#2b2b24' }}>
      <ChildStrips withUnder />
      <TimerPill />
      <div className="screen-scroll">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 18px 6px' }}>
          <div className="slot" style={{ width: 56, height: 56, flex: 'none' }}>
            <img src={avatar.src} alt="avatar" style={{ width: 42, height: 42 }} />
          </div>
          <div style={{ flex: 1 }}>
            <div className="px" style={{ fontSize: 22 }}>
              {greeting}
            </div>
            <div style={{ fontSize: 13, color: '#6b675c', fontWeight: 600 }}>{fmtDateLong(now)}</div>
          </div>
        </div>

        <div className="px" style={{ textAlign: 'center', fontSize: 74, lineHeight: 1, padding: '8px 0 2px' }}>
          {clock.time}
          <span style={{ fontSize: 26, color: '#8a8578' }}> {clock.period}</span>
        </div>

        <div style={{ padding: '12px 18px 4px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <CoinCount balance={state.balance} />
            <span style={{ marginLeft: 'auto', fontSize: 12, fontWeight: 700, color: toGo === 0 ? '#8a6200' : '#8a8578' }}>
              {toGo === 0 ? 'Goal reached! ★' : `${fmtCoins(toGo)} to go!`}
            </span>
          </div>
          <XPBar value={state.balance} />
        </div>

        <div style={{ flex: 1, padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* A reward approved while she was away (a parent verifying last
              night over breakfast, say) waits here rather than being lost —
              still hers to release, never played on her behalf. */}
          {state.pendingAwards.length > 0 && (
            <PixelButton
              variant="gold"
              style={{
                fontSize: 21,
                padding: 16,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
              }}
              onClick={() => store.collectAward()}
            >
              {/* idle: one steps(8) spin every 6s — it waits, it doesn't beg */}
              <img src="assets/coin.png" alt="" className="coin-idle" style={{ width: 24, height: 24 }} />
              {state.pendingAwards.length === 1
                ? 'Tap to see your coins!'
                : `Tap to see your coins! (${state.pendingAwards.length})`}
            </PixelButton>
          )}
          {planStates.map(({ plan, st }) => (
            <RoutineCard key={plan.id} plan={plan} state={st} />
          ))}

          {nothingDue && (
            <>
              <div
                style={{
                  background: '#fffdf6',
                  border: '3px solid #2b2b24',
                  padding: '22px 16px',
                  textAlign: 'center',
                  boxShadow: '0 5px 0 rgba(43,43,36,.14)',
                }}
              >
                <img src="assets/av-bee.png" alt="" style={{ width: 52, height: 52, marginBottom: 8 }} />
                <div className="px" style={{ fontSize: 24, marginBottom: 4 }}>
                  Nothing to do right now
                </div>
                <div style={{ fontSize: 14, color: '#6b675c', fontWeight: 600 }}>
                  {unlockText ? (
                    <>
                      {unlockText.replace(' at ', ' unlocks at ')}.
                      <br />
                      Enjoy your {hourFlavor}!
                    </>
                  ) : (
                    <>
                      All done for today.
                      <br />
                      See you tomorrow!
                    </>
                  )}
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <PixelButton variant="stone" style={{ fontSize: 18, padding: 14 }} onClick={() => store.navigate({ name: 'timer' })}>
                  Set a timer
                </PixelButton>
                <PixelButton variant="stone" style={{ fontSize: 18, padding: 14 }} onClick={() => store.navigate({ name: 'me' })}>
                  Change my look
                </PixelButton>
              </div>
            </>
          )}

          {(streak > 0 || unlockText || nothingDue) && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 12px',
                background: '#efe9d8',
                border: '3px solid #cfc8b2',
                position: 'relative',
              }}
            >
              {/* Milestone: gold border as a fading overlay + three rising stars */}
              {streakMilestoneNow && (
                <>
                  <span className="chip-gold-flash" />
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      className="px star-rise"
                      style={{
                        position: 'absolute',
                        top: -6,
                        left: `${16 + i * 22}px`,
                        fontSize: 10,
                        color: '#f8c53a',
                        pointerEvents: 'none',
                        animationDelay: `${i * 80}ms`,
                      }}
                    >
                      ★
                    </span>
                  ))}
                </>
              )}
              {streak > 0 && (
                <span className="px" style={{ fontSize: 16, color: '#8a8578' }}>
                  <span className={streakGrew ? 'star-pulse' : undefined}>★</span>{' '}
                  {streak} day streak
                </span>
              )}
              <span style={{ marginLeft: 'auto', fontSize: 12, color: '#8a8578', fontWeight: 700 }}>
                {nothingDue && streak > 0 && unlock?.isToday
                  ? `Keep it up ${hourFlavor === 'evening' ? 'tonight' : 'today'}!`
                  : unlockText ?? 'You’ve got this!'}
              </span>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '0 18px 10px' }}>
          <button
            onClick={() => store.navigate({ name: 'pin' })}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              width: 'auto',
              padding: '7px 12px',
              background: "url('assets/tx-iron.png')",
              backgroundSize: '12px',
              border: '3px solid #6b6b6b',
              boxShadow: 'inset 0 2px 0 rgba(255,255,255,.5), inset 0 -3px 0 rgba(0,0,0,.15)',
            }}
          >
            <span style={{ width: 8, height: 8, background: '#4a4a44', display: 'block' }} />
            <span className="px" style={{ fontSize: 13, color: '#4a4a44' }}>
              PARENTS
            </span>
          </button>
        </div>
      </div>
      <TabBar active="home" />
    </div>
  );
}
