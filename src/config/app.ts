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

/** The avatar catalog — every profile picks its starting one by `id`. */
export const AVATARS: AvatarDef[] = [
  { id: 'steve', name: 'Steve', src: 'assets/av-steve.png' },
  { id: 'alex', name: 'Alex', src: 'assets/av-alex.png' },
  { id: 'creeper', name: 'Creeper', src: 'assets/av-creeper.png' },
  { id: 'axolotl', name: 'Axolotl', src: 'assets/av-axolotl.png' },
  { id: 'cat', name: 'Cat', src: 'assets/av-cat.png' },
  { id: 'panda', name: 'Panda', src: 'assets/av-panda.png' },
  { id: 'fox', name: 'Fox', src: 'assets/av-fox.png' },
  { id: 'bee', name: 'Bee', src: 'assets/av-bee.png' },
];
