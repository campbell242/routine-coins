// Screen chrome: bottom tab bar, sub-screen header, running-timer pill,
// toasts, and modals.

import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { fmtClock, fmtCountdown } from '../../lib/dates';
import { remainingMs } from '../../engine/timer';
import { primeAudio } from '../../lib/audio';
import { store, useAppState } from '../../store/hooks';
import { PixelButton, Strip, useTheme } from './core';

export type Tab = 'home' | 'timer' | 'me';

/** Three persistent bottom tabs. Active = gold, inactive = stone, ≥56px tall. */
export function TabBar({ active }: { active: Tab }) {
  const tabs: { id: Tab; label: string }[] = [
    { id: 'home', label: 'HOME' },
    { id: 'timer', label: 'TIMER' },
    { id: 'me', label: 'ME' },
  ];
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr 1fr',
        gap: 8,
        padding: '10px 12px',
        paddingBottom: 'calc(10px + env(safe-area-inset-bottom))',
        background: '#e7e0cd',
        borderTop: '3px solid #2b2b24',
        flex: 'none',
      }}
    >
      {tabs.map((t) => {
        const isActive = t.id === active;
        return (
          <button
            key={t.id}
            className={isActive ? 'bevel bevel-gold' : 'bevel bevel-stone'}
            style={{
              fontSize: 17,
              padding: '15px 4px',
              boxShadow: isActive
                ? 'inset 0 3px 0 rgba(255,255,255,.5), inset 0 -5px 0 rgba(0,0,0,.18)'
                : 'inset 0 3px 0 rgba(255,255,255,.35), inset 0 -5px 0 rgba(0,0,0,.28)',
            }}
            onClick={() => {
              primeAudio();
              store.navigate({ name: t.id });
            }}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

/** Sub-screen header: optional ‹ back, title, clock top-right. */
export function SubHeader({
  title,
  onBack,
  dark = false,
  titleColor,
}: {
  title: string;
  onBack?: () => void;
  dark?: boolean;
  titleColor?: string;
}) {
  const { nowMs } = useAppState();
  const clock = fmtClock(new Date(nowMs));
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '12px 16px',
        borderBottom: dark ? undefined : '3px solid #2b2b24',
        background: dark ? undefined : '#fffdf6',
        flex: 'none',
      }}
    >
      {onBack && (
        <button
          onClick={onBack}
          aria-label="Back"
          style={{
            width: 'auto',
            minWidth: 44,
            minHeight: 44,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0 6px',
            margin: '-10px -6px', // ≥44px hit area without changing the layout
          }}
        >
          <span className="px" style={{ fontSize: 20, color: '#8a8578' }}>
            ‹
          </span>
        </button>
      )}
      <span className="px" style={{ fontSize: 23, color: titleColor }}>
        {title}
      </span>
      {/* Design v3: 24px, no AM/PM; ink on light headers, light gray on the
          dark timer screen. (Home keeps its big 74px clock with AM/PM.) */}
      <span className="px" style={{ marginLeft: 'auto', fontSize: 24, color: dark ? '#8a8578' : '#2b2b24' }}>
        {clock.time}
      </span>
    </div>
  );
}

/**
 * A running timer pins a dark pill above content on every child screen.
 * Tapping it opens the Timer screen.
 */
export function TimerPill() {
  const { timer, nowMs } = useAppState();
  if (timer.phase === 'idle') return null;
  const label =
    timer.phase === 'expired'
      ? "TIME'S UP!"
      : timer.phase === 'paused'
        ? `TIMER · ${fmtCountdown(remainingMs(timer, nowMs))} · paused`
        : `TIMER · ${fmtCountdown(remainingMs(timer, nowMs))}`;
  return (
    <button
      onClick={() => {
        primeAudio();
        store.navigate({ name: 'timer' });
      }}
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: '#20241a',
        color: '#fff',
        padding: '9px 16px',
        flex: 'none',
        width: '100%',
      }}
    >
      <span className="px" style={{ fontSize: 17, color: timer.phase === 'expired' ? '#f8c53a' : '#fff' }}>
        {label}
      </span>
      <span className="px" style={{ color: '#a8e07f', fontSize: 14 }}>
        tap to open ›
      </span>
    </button>
  );
}

/** Advancement toasts — slide in from the top, self-dismiss, never block taps. */
export function Toasts() {
  const { toasts } = useAppState();
  if (toasts.length === 0) return null;
  return (
    <div className="toast-wrap">
      {toasts.map((t) => (
        <div key={t.id} className="toast">
          <img src="assets/coin.png" alt="" style={{ width: 34, height: 34 }} />
          <div>
            <div className="px" style={{ fontSize: 17, color: '#b07d00' }}>
              {t.title}
            </div>
            {t.subtitle && <div style={{ fontSize: 13, color: '#4a463a', fontWeight: 600 }}>{t.subtitle}</div>}
          </div>
        </div>
      ))}
    </div>
  );
}

/** Pixel-styled modal shell. */
export function Modal({ title, onClose, children }: { title?: string; onClose?: () => void; children: ReactNode }) {
  return (
    <div className="modal-scrim" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        {title && (
          <div className="px" style={{ fontSize: 20, marginBottom: 12, color: '#2b2b24' }}>
            {title}
          </div>
        )}
        {children}
      </div>
    </div>
  );
}

/**
 * Extra-confirmation modal for destructive parent actions (redemption,
 * manual subtraction, close for today). Calm styling — never alarming.
 */
export function ConfirmModal({
  title,
  body,
  confirmLabel,
  onConfirm,
  onCancel,
}: {
  title: string;
  body?: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Modal title={title} onClose={onCancel}>
      {body && <div style={{ fontSize: 14, fontWeight: 600, color: '#4a463a', marginBottom: 14 }}>{body}</div>}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <PixelButton variant="stone" small style={{ fontSize: 17, padding: 13 }} onClick={onCancel}>
          Cancel
        </PixelButton>
        <PixelButton variant="iron" small style={{ fontSize: 17, padding: 13 }} onClick={onConfirm}>
          {confirmLabel}
        </PixelButton>
      </div>
    </Modal>
  );
}

/** Themed header strips at the top of child screens. */
export function ChildStrips({ withUnder = false }: { withUnder?: boolean }) {
  const theme = useTheme();
  return (
    <>
      <Strip style={theme.strip} height={12} />
      {withUnder && <Strip style={theme.stripUnder} height={8} />}
    </>
  );
}

/** Live 1-second ticker for countdown displays. */
export function useNowFast(): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const h = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(h);
  }, []);
  return now;
}
