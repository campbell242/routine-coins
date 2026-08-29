// App-wide configuration — identical for every child on every phone.
//
// Anything specific to one child (name, coin goal, PIN, starting avatar,
// storage identity) lives in `profile.ts`; the routines themselves live in
// `plans.ts`. Keep this file free of per-child values so a second profile
// never has to touch it.

/** Parent session ends after this much inactivity (Amendment 2). */
export const PARENT_SESSION_IDLE_MS = 3 * 60 * 1000;

/** Timer presets in minutes (real spec values). */
export const TIMER_PRESETS = [5, 10, 15, 30];

export const TIMER_CUSTOM_DEFAULT = 10;
export const TIMER_CUSTOM_MIN = 1;
export const TIMER_CUSTOM_MAX = 90;

export interface AvatarDef {
  id: string;
  name: string;
  src: string;
}

/**
 * The avatar catalog — every profile picks its starting one by `id`.
 *
 * Eight slots; grid position carries no meaning. Design v10 swapped three
 * generic avatars for Haley's own pets (`RETIRED_AVATARS` below). Shadow is a
 * full-body sitting cat while the rest are heads — deliberate, since her
 * silhouette is what makes her recognisable, and the square frames centre the
 * art either way. All are 32x32 flat pixel art rendered through the global
 * `image-rendering: pixelated` rule.
 */
export const AVATARS: AvatarDef[] = [
  { id: 'steve', name: 'Steve', src: 'assets/av-steve.png' },
  { id: 'shadow', name: 'Shadow', src: 'assets/av-shadow.png' },
  { id: 'creeper', name: 'Creeper', src: 'assets/av-creeper.png' },
  { id: 'axolotl', name: 'Axolotl', src: 'assets/av-axolotl.png' },
  { id: 'bear', name: 'Bear', src: 'assets/av-bear.png' },
  { id: 'panda', name: 'Panda', src: 'assets/av-panda.png' },
  { id: 'fox', name: 'Fox', src: 'assets/av-fox.png' },
  { id: 'stormy', name: 'Stormy', src: 'assets/av-stormy.png' },
];

/**
 * Avatars dropped from the picker in design v10, mapped to the pet that took
 * their slot. Their PNGs are still shipped (the Home empty state still uses
 * `av-bee.png` as decoration), but nothing picks them any more. A phone whose
 * saved settings still name one gets the replacement instead of an id that
 * matches no slot, which would leave the picker showing nothing selected.
 */
const RETIRED_AVATARS: Record<string, string> = {
  cat: 'bear',
  alex: 'shadow',
  bee: 'stormy',
};

/** Map a stored avatar id onto one that still exists in the catalog. */
export function resolveAvatarId(id: string): string {
  return RETIRED_AVATARS[id] ?? id;
}
