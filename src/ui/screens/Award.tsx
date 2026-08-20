// The coin award moment (mockup 1m): advancement toast, coins arcing into the
// counter, +N pop, XP bar with the new segment flashing bright before it
// settles. Short and non-blocking — one tap back to Home.

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { CHILD_NAME, REDEMPTION_THRESHOLD } from '../../config/profile';
import { fmtCoins } from '../../lib/dates';
import { playAwardJingle, playRedemptionFanfare } from '../../lib/audio';
import { store, useAppState } from '../../store/hooks';
import { ChildStrips, TimerPill } from '../components/chrome';
import { CoinCount, PixelButton, XPBar, useTheme } from '../components/core';

// Reward release (spec §2): 8 coins spawn at the big coin — staggered 60ms
// from 350ms — and arc down INTO the balance counter, shrinking to 0.38, so
// they read as becoming the number. Spawn offsets fan them out slightly;
// each coin's flight vector is corrected for its own offset so every one
// lands on the counter's coin. Last landing ≈ 350+7×60+550 ≈ 1370ms, just
// ahead of the XP glow at 1400ms.
const FLYERS = [
  { size: 20, sx: -16, sy: -10, rot: '-12deg' },
  { size: 15, sx: 18, sy: -14, rot: '15deg' },
  { size: 18, sx: -30, sy: 6, rot: '8deg' },
  { size: 14, sx: 30, sy: 2, rot: '-20deg' },
  { size: 16, sx: -6, sy: -22, rot: '22deg' },
  { size: 15, sx: 10, sy: 14, rot: '-6deg' },
  { size: 18, sx: -22, sy: -2, rot: '4deg' },
  { size: 14, sx: 24, sy: -8, rot: '-16deg' },
] as const;

/** True when the device asks for reduced motion (checked once per mount). */
function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

export function Award() {
  const { award } = useAppState();
  const theme = useTheme();

  // Flight vector from the big coin to the balance counter's coin, measured
  // once the screen has laid out (t=0 is Haley's tap — screen enter).
  const bigCoinRef = useRef<HTMLImageElement | null>(null);
  const counterRef = useRef<HTMLDivElement | null>(null);
  const [flight, setFlight] = useState<{ dx: number; dy: number } | null>(null);

  useLayoutEffect(() => {
    const big = bigCoinRef.current;
    const counterImg = counterRef.current?.querySelector('img');
    if (!big || !counterImg) return;
    const b = big.getBoundingClientRect();
    const c = counterImg.getBoundingClientRect();
    setFlight({
      dx: c.left + c.width / 2 - (b.left + b.width / 2),
      dy: c.top + c.height / 2 - (b.top + b.height / 2),
    });
  }, []);

  // Crossing 1,720 upgrades the arpeggio to the redemption fanfare (the
  // arpeggio again an octave up at +0.90s) — the app's only big sound.
  const crossedGoal =
    award !== undefined &&
    award.balanceBefore < REDEMPTION_THRESHOLD &&
    award.balanceAfter >= REDEMPTION_THRESHOLD;
  useEffect(() => {
    if (crossedGoal) playRedemptionFanfare();
    else playAwardJingle();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // "+N rolls from 0" (spec §2): starts at 120ms and steps to the real
  // amount over 500ms, so the award registers as a NUMBER rather than a
  // picture. Reduced motion skips straight to the total.
  const amount = award?.amount ?? 0;
  const [rolled, setRolled] = useState<number | null>(null);
  useEffect(() => {
    if (amount <= 0) return;
    if (prefersReducedMotion()) return; // `rolled` stays null → final number
    const STEPS = 10; // 10 × 50ms = the 500ms roll, visibly stepped
    setRolled(0);
    const handles = [
      window.setTimeout(() => {
        for (let i = 1; i <= STEPS; i++) {
          handles.push(
            window.setTimeout(
              () => setRolled(i === STEPS ? null : Math.round((amount * i) / STEPS)),
              i * 50,
            ),
          );
        }
      }, 120),
    ];
    return () => handles.forEach((h) => window.clearTimeout(h));
  }, [amount]);

  // Each coin lands 550ms after its staggered spawn; every landing bumps the
  // counter's coin pip (spec §2).
  const [landings, setLandings] = useState(0);
  useEffect(() => {
    if (!flight || prefersReducedMotion()) return; // no flight → no landings
    const handles = FLYERS.map((_, i) =>
      window.setTimeout(() => setLandings((n) => n + 1), (0.35 + i * 0.06 + 0.55) * 1000),
    );
    return () => handles.forEach((h) => window.clearTimeout(h));
  }, [flight]);

  useEffect(() => {
    if (!award) store.navigate({ name: 'home' });
  }, [award]);
  if (!award) return null;

  const overGoal = award.balanceAfter >= REDEMPTION_THRESHOLD;

  return (
    <div
      className="screen"
      style={{ background: '#f3eee1', color: '#2b2b24', position: 'relative', overflow: 'hidden' }}
    >
      <ChildStrips withUnder />
      <TimerPill />
      <div
        style={{
          position: 'absolute',
          left: 16,
          right: 16,
          top: 34,
          display: 'flex',
          gap: 12,
          alignItems: 'center',
          background: '#efe9d8',
          border: '3px solid #20241a',
          boxShadow:
            'inset 0 3px 0 rgba(255,255,255,.7), inset 0 -4px 0 rgba(0,0,0,.1), 0 5px 0 rgba(32,36,26,.15)',
          padding: '12px 16px',
          zIndex: 2,
        }}
      >
        <img src="assets/coin.png" alt="" style={{ width: 34, height: 34 }} />
        <div>
          <div className="px" style={{ fontSize: 17, color: '#b07d00' }}>
            {award.kind === 'bonus' ? 'Bonus coins!' : 'Routine complete!'}
          </div>
          <div style={{ fontSize: 13, color: '#4a463a', fontWeight: 600 }}>
            {award.kind === 'bonus' ? 'From Mom & Dad' : `${award.planName} · approved`}
          </div>
        </div>
      </div>

      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 10,
          padding: 20,
          position: 'relative',
        }}
      >
        <span style={{ position: 'relative', display: 'inline-block' }}>
          {flight &&
            FLYERS.map((f, i) => (
              <img
                key={i}
                src="assets/coin.png"
                alt=""
                className="coin-fly"
                style={{
                  position: 'absolute',
                  width: f.size,
                  height: f.size,
                  left: `calc(50% - ${f.size / 2}px + ${f.sx}px)`,
                  top: `calc(50% - ${f.size / 2}px + ${f.sy}px)`,
                  ['--rot' as string]: f.rot,
                  // correct for this coin's spawn offset so it lands ON the counter
                  ['--dx' as string]: `${flight.dx - f.sx}px`,
                  ['--dy' as string]: `${flight.dy - f.sy}px`,
                  animationDelay: `${0.35 + i * 0.06}s`,
                }}
              />
            ))}
          <img ref={bigCoinRef} src="assets/coin.png" alt="" className="pop-in" style={{ width: 72, height: 72, display: 'block' }} />
        </span>
        <div className="px pop-in" style={{ fontSize: 64, color: '#b07d00', lineHeight: 1 }}>
          +{rolled ?? award.amount}
        </div>
        <div className="px fade-up-late" style={{ fontSize: 20, color: theme.accentText }}>
          Great job, {CHILD_NAME}!
        </div>
        {award.streak > 0 && (
          <div className="fade-up-late" style={{ fontSize: 13, color: '#6b675c', fontWeight: 600 }}>
            Streak: {award.streak} {award.streak === 1 ? 'day' : 'days in a row'}!
          </div>
        )}
      </div>

      <div style={{ padding: '0 18px 8px', flex: 'none' }}>
        <div ref={counterRef} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <CoinCount balance={award.balanceAfter} landings={landings} />
          <span className="px" style={{ marginLeft: 'auto', fontSize: 15, color: theme.accentText }}>
            +{award.amount} ▲
          </span>
        </div>
        <XPBar value={award.balanceAfter} newDelta={award.amount} />
        {overGoal && (
          <div style={{ fontSize: 11, color: '#8a6200', fontWeight: 600, marginTop: 4 }}>
            Past {fmtCoins(REDEMPTION_THRESHOLD)} — the bar stays full while your coins keep climbing!
          </div>
        )}
      </div>

      <div style={{ padding: '10px 18px 18px', flex: 'none' }}>
        <PixelButton style={{ fontSize: 22, padding: 16 }} onClick={() => store.navigate({ name: 'home' })}>
          Back to Home
        </PixelButton>
      </div>
    </div>
  );
}
