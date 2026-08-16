// Core design-system pieces shared by every screen: texture strips, bevel
// buttons, inventory-slot checkboxes, status chips, XP bar, coin count.
// Exact colors/sizes come from the design handoff (design/README.md + mockups).

import type { CSSProperties, ReactNode } from 'react';
import type { StripStyle, ThemeVariant } from '../../config/themes';
import { getTheme } from '../../config/themes';
import { REDEMPTION_THRESHOLD } from '../../config/profile';
import { fmtCoins } from '../../lib/dates';
import { useAppState } from '../../store/hooks';

export function useTheme(): ThemeVariant {
  const { settings } = useAppState();
  return getTheme(settings.theme);
}

/** Thin texture/solid strip — trim only, never behind text. */
export function Strip({ style, height, size = 16 }: { style: StripStyle; height: number; size?: number }) {
  return (
    <div
      style={{
        height,
        flex: 'none',
        background: style.image ? `url('${style.image}')` : style.color,
        backgroundSize: style.image ? `${size}px` : undefined,
      }}
    />
  );
}

type BevelVariant =
  | 'primary'
  | 'gold'
  | 'stone'
  | 'slate'
  | 'iron'
  | 'disabled'
  | 'key'
  | 'keyDim'
  /**
   * Parent-zone pair (design v7): raised bright stone = live/ON, recessed
   * dark iron = OFF. A disabled `parentOn` renders as `parentOff`, so
   * "not available" and "off" are one look across the whole parent area.
   */
  | 'parentOn'
  | 'parentOff';

export function PixelButton({
  variant = 'primary',
  small = false,
  disabled = false,
  onClick,
  style,
  children,
}: {
  variant?: BevelVariant;
  /** Compact inset scale for steppers/small chips. */
  small?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  style?: CSSProperties;
  children: ReactNode;
}) {
  const theme = useTheme();
  const cls = ['bevel'];
  const extra: CSSProperties = {};
  const parentZone = variant === 'parentOn' || variant === 'parentOff';
  if ((disabled || variant === 'disabled') && parentZone) {
    // The parent zone has its own "not available": recessed dark iron.
    cls.push('bevel-parent-off');
  } else if (disabled || variant === 'disabled') {
    cls.push('bevel-disabled');
  } else {
    switch (variant) {
      case 'primary':
        // Themed accent — Overworld renders the classic grass green.
        extra.background = theme.primary;
        extra.color = theme.primaryText;
        extra.textShadow = theme.primaryTextShadow;
        extra.boxShadow = small
          ? `inset 0 3px 0 ${theme.primaryInsetTop}, inset 0 -4px 0 ${theme.primaryInsetBottom}`
          : `inset 0 4px 0 ${theme.primaryInsetTop}, inset 0 -6px 0 ${theme.primaryInsetBottom}`;
        break;
      case 'gold':
        cls.push('bevel-gold');
        break;
      case 'stone':
        cls.push('bevel-stone');
        break;
      case 'slate':
        cls.push('bevel-slate');
        break;
      case 'iron':
        cls.push('bevel-iron');
        break;
      case 'key':
        cls.push('bevel-key');
        break;
      case 'keyDim':
        cls.push('bevel-key-dim');
        break;
      case 'parentOn':
        cls.push('bevel-parent-on');
        break;
      case 'parentOff':
        cls.push('bevel-parent-off');
        break;
    }
  }
  if (small) cls.push('bevel-sm');
  return (
    <button className={cls.join(' ')} disabled={disabled} onClick={onClick} style={{ ...extra, ...style }}>
      {children}
    </button>
  );
}

/**
 * Parent-zone Cancel (design v7): never a filled button — plain underlined
 * text, full-width tap target. A filled Cancel is the brightest thing in a
 * modal, so the eye lands on the way out before the choice.
 */
export function ParentCancel({
  onClick,
  label = 'Cancel',
  style,
}: {
  onClick: () => void;
  label?: string;
  style?: CSSProperties;
}) {
  return (
    <button className="parent-cancel" onClick={onClick} style={{ fontSize: 17, ...style }}>
      {label}
    </button>
  );
}

/**
 * An editable value in the parent area — the number/time plus its pencil.
 * Slate, never green: slate is the parent's second colour, the material
 * "Send back" is made of (design v7).
 */
export function EditValue({ children }: { children: ReactNode }) {
  return (
    <span className="px" style={{ color: '#3f5f78' }}>
      {children}
    </span>
  );
}

/** Fixed grass-green button — for surfaces that never theme (parent area). */
export function GreenButton({
  onClick,
  style,
  children,
}: {
  onClick?: () => void;
  style?: CSSProperties;
  children: ReactNode;
}) {
  return (
    <button className="bevel" onClick={onClick} style={{ background: '#57a636', ...style }}>
      {children}
    </button>
  );
}

/** Inventory-slot checkbox. Checked fill follows the theme accent. */
export function SlotCheck({
  checked,
  size,
  themed = true,
  lightUnchecked = false,
  onClick,
}: {
  checked: boolean;
  size: number;
  /** Parent-area checkboxes keep classic green regardless of theme. */
  themed?: boolean;
  /** Light unchecked fill (#fffdf6) — the verify-last-night treatment (1l). */
  lightUnchecked?: boolean;
  onClick?: () => void;
}) {
  const theme = useTheme();
  const fill = themed ? theme.primary : '#57a636';
  const dark = themed ? theme.checkedDark : '#2c5c1a';
  const light = themed ? theme.checkedLight : '#a8e07f';
  const checkColor = themed ? theme.primaryText : '#fff';
  const box = checked ? (
    <span
      style={{
        width: size,
        height: size,
        flex: 'none',
        background: fill,
        border: '3px solid',
        borderColor: `${dark} ${light} ${light} ${dark}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: "'Jersey 25', monospace",
        fontSize: size * 0.57,
        color: checkColor,
      }}
    >
      ✔
    </span>
  ) : (
    <span className={lightUnchecked ? 'slot slot-light' : 'slot'} style={{ width: size, height: size, flex: 'none' }} />
  );
  if (!onClick) return box;
  return (
    <button onClick={onClick} style={{ width: size, height: size, flex: 'none', display: 'block' }} aria-pressed={checked}>
      {box}
    </button>
  );
}

export type ChipKind = 'progress' | 'ready' | 'sentback' | 'waiting';

const CHIP_STYLES: Record<ChipKind, CSSProperties> = {
  progress: { borderColor: '#57a636', color: '#3d7a22', background: '#eaf5df' },
  ready: { borderColor: '#c8961e', color: '#8a6200', background: '#fdf3d4' },
  sentback: { borderColor: '#6d89a3', color: '#42607c', background: '#e8eef4' },
  waiting: { borderColor: '#9a9a9a', color: '#6b6b6b', background: '#efefec' },
};

/** Status chip — status colors are fixed across theme variants (semantics). */
export function Chip({ kind, children, fontSize = 14 }: { kind: ChipKind; children: ReactNode; fontSize?: number }) {
  return (
    <span
      className="px"
      style={{
        fontSize,
        padding: '4px 9px',
        border: '2px solid',
        whiteSpace: 'nowrap',
        ...CHIP_STYLES[kind],
      }}
    >
      {children}
    </span>
  );
}

/**
 * XP bar. Width = balance / 1,720, clamped at 100% — the bar stays full past
 * 1,720 while the number keeps climbing. XP green never changes with theme.
 */
export function XPBar({
  value,
  height = 20,
  newDelta = 0,
  dark = false,
}: {
  value: number;
  height?: number;
  /** Freshly-awarded coins rendered as a bright segment that settles (~1.5s). */
  newDelta?: number;
  dark?: boolean;
}) {
  const beforePct = Math.min(100, ((value - newDelta) / REDEMPTION_THRESHOLD) * 100);
  const deltaPct = Math.min(100 - beforePct, (newDelta / REDEMPTION_THRESHOLD) * 100);
  return (
    <div
      style={{
        height,
        border: `3px solid ${dark ? '#4a4f3e' : '#20241a'}`,
        background: dark ? '#14170f' : '#2f2f28',
        padding: 2,
        display: 'flex',
      }}
    >
      <div
        style={{
          height: '100%',
          width: `${beforePct}%`,
          background:
            'repeating-linear-gradient(90deg,transparent 0 16px,rgba(0,0,0,.25) 16px 19px),linear-gradient(#b4f06a,#7fe237 45%,#59c01c)',
        }}
      />
      {deltaPct > 0 && (
        <div
          className="xp-new-segment"
          style={{
            height: '100%',
            width: `${deltaPct}%`,
            background:
              'repeating-linear-gradient(90deg,transparent 0 16px,rgba(0,0,0,.25) 16px 19px),linear-gradient(#b4f06a,#7fe237 45%,#59c01c)',
          }}
        />
      )}
    </div>
  );
}

/** Coin icon + "1,240 / 1,720". */
export function CoinCount({
  balance,
  coinSize = 28,
  fontSize = 24,
  subSize = 15,
  landings = 0,
}: {
  balance: number;
  coinSize?: number;
  fontSize?: number;
  subSize?: number;
  /**
   * Award screen only: bumped once per arriving coin. Each increment remounts
   * the coin pip so its 120ms scale reaction replays — the counter answers
   * every landing (spec §2).
   */
  landings?: number;
}) {
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <img
        key={landings}
        src="assets/coin.png"
        alt="coins"
        className={landings > 0 ? 'coin-land' : undefined}
        style={{ width: coinSize, height: coinSize }}
      />
      <span className="px" style={{ fontSize }}>
        {fmtCoins(balance)}{' '}
        <span style={{ fontSize: subSize, color: '#8a8578' }}>/ {fmtCoins(REDEMPTION_THRESHOLD)}</span>
      </span>
    </span>
  );
}

/** Section rule with a small pixel label: ── BONUS COINS ── */
export function SectionRule({ label, color = '#8a8578' }: { label: string; color?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
      <div style={{ flex: 1, height: 3, background: '#cfc8b2' }} />
      <span className="px" style={{ fontSize: 15, color }}>
        {label}
      </span>
      <div style={{ flex: 1, height: 3, background: '#cfc8b2' }} />
    </div>
  );
}
