// App-level configuration (single household, single child, single device).

/**
 * The child's name — the single place to change it. Used in every greeting
 * and parent-area string, the browser-tab title, and the PWA install name
 * (vite.config.ts templates index.html and generates the manifest from it).
 */
export const CHILD_NAME = 'Haley';

/** App display names derived from the child's name. */
export const APP_NAME = `${CHILD_NAME}'s Routine & Coins`;
export const APP_SHORT_NAME = CHILD_NAME;
export const APP_DESCRIPTION = `Routines, timers and Minecoin rewards for ${CHILD_NAME}.`;

/** Coin goal / redemption threshold. The XP bar is full at this value. */
export const REDEMPTION_THRESHOLD = 1720;

/** Out-of-the-box parent PIN; changeable in Parent → Settings. */
export const DEFAULT_PIN = '1234';

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

export const DEFAULT_AVATAR = 'axolotl';
