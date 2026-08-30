// The child profile: everything specific to ONE child on ONE phone.
//
// A profile is exactly two files — this one and `plans.ts` (the routines).
// Everything else in src/config/ is app-wide and identical for every child.
// Should a second child ever get the app, copying these two files, editing
// them, and deploying that build to its own URL is the whole job.

/**
 * Storage identity. The IndexedDB database is named after this, so two
 * children's apps served from the same origin never share coins or history
 * (IndexedDB is scoped per origin, NOT per path — a sub-path is not enough).
 *
 * NEVER change this once the app has run on a phone. The coins, routine
 * history and parent overrides all live in a database named after it; a new
 * value silently opens an empty one and looks like a factory reset.
 * CHILD_NAME below is the display name and is safe to change at any time —
 * that separation is the entire reason these are two constants.
 */
export const PROFILE_ID = 'haley';

/**
 * The child's name — the single place to change it. Used in every greeting
 * and parent-area string. The app's public identity (tab title, manifest
 * name/short_name/description) is deliberately NOT derived from it — those
 * are literal app-wide constants in app.ts.
 */
export const CHILD_NAME = 'Haley';

/** Coin goal / redemption threshold. The XP bar is full at this value. */
export const REDEMPTION_THRESHOLD = 1720;

/** Out-of-the-box parent PIN; changeable in Parent → Settings. */
export const DEFAULT_PIN = '1234';

/** Avatar this profile starts with — an `id` from AVATARS in app.ts. */
export const DEFAULT_AVATAR = 'axolotl';
