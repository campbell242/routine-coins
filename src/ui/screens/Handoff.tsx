// The moment between approval and celebration. A parent has just approved,
// so the phone is still in their hand — this screen exists to move it, and to
// put the reward button under HALEY's thumb. Deliberately quiet: no coins
// flying, no jingle. All of that belongs to the next screen, released by her.

import { useEffect } from 'react';
import { CHILD_NAME } from '../../config/profile';
import { store, useAppState } from '../../store/hooks';
import { ChildStrips } from '../components/chrome';
import { PixelButton } from '../components/core';

export function Handoff() {
  const { pendingAwards } = useAppState();
  const next = pendingAwards[0];

  // Nothing waiting (collected in another tab, or a stale route) → Home.
  useEffect(() => {
    if (!next) store.navigate({ name: 'home' });
  }, [next]);
  if (!next) return null;

  return (
    <div className="screen" style={{ background: '#f3eee1', color: '#2b2b24' }}>
      <ChildStrips withUnder />
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 14,
          padding: 24,
          textAlign: 'center',
        }}
      >
        <img src="assets/coin.png" alt="" className="pop-in" style={{ width: 56, height: 56 }} />
        <div className="px" style={{ fontSize: 30, lineHeight: 1.1 }}>
          {/* A bonus has no routine to name — the coins ARE the news. */}
          {next.kind === 'bonus' ? 'Bonus coins!' : `${next.planName} approved!`}
        </div>
        <div style={{ fontSize: 15, color: '#6b675c', fontWeight: 600, maxWidth: 260 }}>
          Hand the phone back to {CHILD_NAME} — the coins are hers to collect.
        </div>
        {pendingAwards.length > 1 && (
          <div className="px" style={{ fontSize: 15, color: '#8a6200' }}>
            {pendingAwards.length} rewards waiting
          </div>
        )}
      </div>
      <div style={{ padding: '0 18px 24px', flex: 'none' }}>
        <PixelButton
          variant="gold"
          style={{
            fontSize: 24,
            padding: 18,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
          }}
          onClick={() => store.collectAward()}
        >
          <img src="assets/coin.png" alt="" style={{ width: 26, height: 26 }} />
          Tap to see your coins!
        </PixelButton>
        <div style={{ textAlign: 'center', fontSize: 12, color: '#8a8578', fontWeight: 700, marginTop: 8 }}>
          {CHILD_NAME}, this one&rsquo;s yours to press
        </div>
      </div>
    </div>
  );
}
