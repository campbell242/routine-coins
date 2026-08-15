// The coin award moment (mockup 1m): advancement toast, coins arcing into the
// counter, +N pop, XP bar with the new segment flashing bright before it
// settles. Short and non-blocking — one tap back to Home.

import { useEffect } from 'react';
import { CHILD_NAME, REDEMPTION_THRESHOLD } from '../../config/app';
import { fmtCoins } from '../../lib/dates';
import { playAwardJingle } from '../../lib/audio';
import { store, useAppState } from '../../store/hooks';
import { ChildStrips } from '../components/chrome';
import { CoinCount, PixelButton, XPBar, useTheme } from '../components/core';

const FLYERS = [
  { size: 22, left: '18%', top: '24%', rot: '-12deg', dx: '30vw', dy: '38vh' },
  { size: 16, right: '20%', top: '20%', rot: '15deg', dx: '-18vw', dy: '42vh' },
  { size: 18, left: '26%', bottom: '26%', rot: '8deg', dx: '22vw', dy: '12vh' },
  { size: 14, right: '24%', bottom: '30%', rot: '-20deg', dx: '-14vw', dy: '16vh' },
] as const;

export function Award() {
  const { award } = useAppState();
  const theme = useTheme();

  useEffect(() => {
    playAwardJingle();
  }, []);

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
            Routine complete!
          </div>
          <div style={{ fontSize: 13, color: '#4a463a', fontWeight: 600 }}>
            {award.planName} · approved
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
        {FLYERS.map((f, i) => (
          <img
            key={i}
            src="assets/coin.png"
            alt=""
            className="coin-fly"
            style={{
              position: 'absolute',
              width: f.size,
              height: f.size,
              left: 'left' in f ? f.left : undefined,
              right: 'right' in f ? f.right : undefined,
              top: 'top' in f ? f.top : undefined,
              bottom: 'bottom' in f ? f.bottom : undefined,
              transform: `rotate(${f.rot})`,
              ['--rot' as string]: f.rot,
              ['--dx' as string]: f.dx,
              ['--dy' as string]: f.dy,
              animationDelay: `${0.35 + i * 0.12}s`,
            }}
          />
        ))}
        <img src="assets/coin.png" alt="" className="pop-in" style={{ width: 72, height: 72 }} />
        <div className="px pop-in" style={{ fontSize: 64, color: '#b07d00', lineHeight: 1 }}>
          +{award.amount}
        </div>
        <div className="px" style={{ fontSize: 20, color: theme.accentText }}>
          Great job, {CHILD_NAME}!
        </div>
        {award.streak > 0 && (
          <div style={{ fontSize: 13, color: '#6b675c', fontWeight: 600 }}>
            Streak: {award.streak} {award.streak === 1 ? 'day' : 'days in a row'}!
          </div>
        )}
      </div>

      <div style={{ padding: '0 18px 8px', flex: 'none' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <CoinCount balance={award.balanceAfter} />
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
