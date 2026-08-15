import { useState } from 'react';
import {
  TIMER_CUSTOM_DEFAULT,
  TIMER_CUSTOM_MAX,
  TIMER_CUSTOM_MIN,
  TIMER_PRESETS,
} from '../../config/app';
import { remainingFraction, remainingMs } from '../../engine/timer';
import { fmtCountdown } from '../../lib/dates';
import { primeAudio } from '../../lib/audio';
import { store, useAppState } from '../../store/hooks';
import { ChildStrips, SubHeader, TabBar, useNowFast } from '../components/chrome';
import { PixelButton, SectionRule } from '../components/core';

function IdleTimer() {
  const [custom, setCustom] = useState(TIMER_CUSTOM_DEFAULT);
  const start = (min: number) => {
    primeAudio(); // user gesture → alarm can sound later
    store.timerStart(min);
  };
  return (
    <div className="screen" style={{ background: '#f3eee1', color: '#2b2b24' }}>
      <ChildStrips />
      <SubHeader title="Timer" />
      <div className="screen-scroll">
        <div style={{ flex: 1, padding: '20px 18px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="px" style={{ fontSize: 17, color: '#8a8578' }}>
            HOW LONG?
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {TIMER_PRESETS.map((min) => (
              <PixelButton key={min} style={{ fontSize: 30, padding: '24px 8px' }} onClick={() => start(min)}>
                {min}
                <div style={{ fontSize: 14, marginTop: 2 }}>MIN</div>
              </PixelButton>
            ))}
          </div>
          <SectionRule label="OR PICK YOUR OWN" />
          <div style={{ display: 'flex', gap: 10, alignItems: 'stretch' }}>
            <div
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                background: '#fffdf6',
                border: '3px solid #2b2b24',
                padding: 12,
              }}
            >
              <span className="px" style={{ fontSize: 34 }}>
                {custom}
              </span>
              <span style={{ fontSize: 14, fontWeight: 700, color: '#6b675c' }}>
                {custom === 1 ? 'minute' : 'minutes'}
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <PixelButton
                variant="stone"
                small
                style={{ width: 56, fontSize: 22, padding: 6 }}
                onClick={() => setCustom((c) => Math.min(TIMER_CUSTOM_MAX, c + 1))}
              >
                +
              </PixelButton>
              <PixelButton
                variant="stone"
                small
                style={{ width: 56, fontSize: 22, padding: 6 }}
                onClick={() => setCustom((c) => Math.max(TIMER_CUSTOM_MIN, c - 1))}
              >
                −
              </PixelButton>
            </div>
          </div>
          <PixelButton style={{ fontSize: 24, padding: 17 }} onClick={() => start(custom)}>
            Start ▶
          </PixelButton>
        </div>
      </div>
      <TabBar active="timer" />
    </div>
  );
}

function RunningTimer() {
  const { timer } = useAppState();
  const now = useNowFast();
  if (timer.phase !== 'running' && timer.phase !== 'paused') return null;
  const ms = remainingMs(timer, now);
  const frac = remainingFraction(timer, now);
  const paused = timer.phase === 'paused';
  return (
    <div className="screen" style={{ background: '#20241a', color: '#fff' }}>
      <ChildStrips />
      <SubHeader
        title="Timer"
        titleColor="#a8e07f"
        dark
        onBack={() => store.navigate({ name: 'home' })}
      />
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 18,
          padding: 20,
        }}
      >
        <div className="px" style={{ fontSize: 15, color: '#8a8578', letterSpacing: 2 }}>
          {timer.totalMin} MINUTE TIMER{paused ? ' · PAUSED' : ''}
        </div>
        <div className="px" style={{ fontSize: 110, lineHeight: 1, opacity: paused ? 0.55 : 1 }}>
          {fmtCountdown(ms)}
        </div>
        <div style={{ width: '100%', height: 16, border: '3px solid #4a4f3e', background: '#14170f', padding: 2 }}>
          <div
            style={{
              height: '100%',
              width: `${frac * 100}%`,
              background:
                'repeating-linear-gradient(90deg,transparent 0 16px,rgba(0,0,0,.25) 16px 19px),linear-gradient(#b4f06a,#7fe237 45%,#59c01c)',
            }}
          />
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, padding: '0 18px 22px' }}>
        {paused ? (
          <PixelButton
            variant="gold"
            style={{ fontSize: 22, padding: 17, borderColor: '#0d0f0a' }}
            onClick={() => store.timerResume()}
          >
            Resume ▶
          </PixelButton>
        ) : (
          <PixelButton
            variant="gold"
            style={{ fontSize: 22, padding: 17, borderColor: '#0d0f0a' }}
            onClick={() => store.timerPause()}
          >
            Pause ⏸
          </PixelButton>
        )}
        <PixelButton
          variant="stone"
          style={{ fontSize: 22, padding: 17, borderColor: '#0d0f0a' }}
          onClick={() => store.timerCancel()}
        >
          Cancel
        </PixelButton>
      </div>
    </div>
  );
}

function ExpiredTimer() {
  const { timer } = useAppState();
  if (timer.phase !== 'expired') return null;
  return (
    <div className="screen expired-flash" style={{ background: '#20241a', color: '#fff' }}>
      <div className="expired-strip" style={{ height: 12, background: '#f8c53a', flex: 'none' }} />
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 18,
          padding: 20,
        }}
      >
        <img src="assets/coin.png" alt="" className="pop-in" style={{ width: 56, height: 56 }} />
        <div className="px" style={{ fontSize: 52, color: '#f8c53a', textAlign: 'center', lineHeight: 1.1 }}>
          TIME'S
          <br />
          UP!
        </div>
        <div className="px" style={{ fontSize: 40, color: '#8a8578' }}>
          00:00
        </div>
        <div style={{ fontSize: 14, color: '#cfc8b2', fontWeight: 600 }}>
          Your {timer.totalMin} minute timer is done.
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, padding: '0 18px 26px' }}>
        <PixelButton style={{ fontSize: 22, padding: 17, borderColor: '#0d0f0a' }} onClick={() => store.timerDone()}>
          Done!
        </PixelButton>
        <PixelButton
          variant="stone"
          style={{ fontSize: 22, padding: 17, borderColor: '#0d0f0a' }}
          onClick={() => store.timerFiveMore()}
        >
          +5 more min
        </PixelButton>
      </div>
    </div>
  );
}

export function TimerScreen() {
  const { timer } = useAppState();
  if (timer.phase === 'expired') return <ExpiredTimer />;
  if (timer.phase === 'running' || timer.phase === 'paused') return <RunningTimer />;
  return <IdleTimer />;
}
