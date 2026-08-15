// Local-time date helpers. Days are local calendar days; an occurrence belongs
// to the local date on which it started, even if resolved after midnight.

import type { Weekday } from '../config/types';

/** 'YYYY-MM-DD' in local time. */
export function dateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function fromDateKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(d: Date, n: number): Date {
  const out = new Date(d);
  out.setDate(out.getDate() + n);
  return out;
}

/** Parse 'HH:MM' → minutes since local midnight. */
export function parseHM(hm: string): number {
  const [h, m] = hm.split(':').map(Number);
  return h * 60 + m;
}

export function minutesOfDay(d: Date): number {
  return d.getHours() * 60 + d.getMinutes();
}

export function weekdayOf(d: Date): Weekday {
  return d.getDay() as Weekday;
}

/** '6:30' or '8:00 PM' — 12h; includes AM/PM only when `withPeriod`. */
export function fmtHM(hm: string, withPeriod = true): string {
  const [h, m] = hm.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  const mm = String(m).padStart(2, '0');
  return withPeriod ? `${h12}:${mm} ${period}` : `${h12}:${mm}`;
}

/** Clock pieces for headers: { time: '7:42', period: 'AM' }. */
export function fmtClock(d: Date): { time: string; period: string } {
  const h = d.getHours();
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return { time: `${h12}:${String(d.getMinutes()).padStart(2, '0')}`, period };
}

/** 'Tuesday, Aug 15' */
export function fmtDateLong(d: Date): string {
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
}

/** 'Aug 14' */
export function fmtDateShort(d: Date): string {
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/** '8:05 AM' from an epoch ms timestamp. */
export function fmtTimeOfDay(ts: number): string {
  const { time, period } = fmtClock(new Date(ts));
  return `${time} ${period}`;
}

/** 'mm:ss' from milliseconds, floored at 0. */
export function fmtCountdown(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function fmtCoins(n: number): string {
  return n.toLocaleString('en-US');
}
