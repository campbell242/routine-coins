// Task icon pack (design/README.md "Task Icon Pack", screen 2a; additions in
// design/NEW_ICONS.md). 39 hand-drawn pixel PNGs in assets/icons/. Icons are
// decorative labels on checklist items — never buttons, never the only signal
// of meaning (the task text is always present). Referenced from item config by
// bare name (e.g. icon: 'toothbrush'); unknown names degrade gracefully to no
// icon. Note: rat + phone are drawn on a 2px block grid (the original 37 use
// 4px) — deliberate, per NEW_ICONS.md; render as-is, never resample.

export const TASK_ICONS: Record<string, string> = {
  // Hygiene & bathroom
  toothbrush: 'brush teeth',
  shower: 'shower / bath',
  towel: 'towel',
  comb: 'hairbrush',
  // Bedroom & clothes
  bed: 'bed',
  shirt: 'clothes',
  basket: 'laundry',
  lantern: 'lights out',
  door: 'door / leave',
  phone: 'phone / hand it in',
  // School & chores
  backpack: 'backpack',
  pencil: 'homework',
  paper: 'worksheet',
  book: 'reading',
  broom: 'tidy up',
  trash: 'trash',
  flower: 'water plants',
  bone: 'feed pet',
  rat: 'pet rat — Stormy',
  // Food & drink
  cookie: 'snack',
  apple: 'fruit',
  bowl: 'breakfast',
  cup: 'milk / drink',
  bottle: 'water',
  drumstick: 'protein',
  carrot: 'vegetables',
  // Time & day
  clock: 'clock',
  hourglass: 'timer',
  sun: 'morning',
  moon: 'night',
  star: 'streak',
  bell: 'reminder',
  // Fun & rewards
  heart: 'kindness',
  sword: 'screen time',
  pickaxe: 'big chore',
  shield: 'bonus quest',
  chest: 'reward chest',
  key: 'special unlock',
  orb: 'XP / bonus',
};

/** Asset path for a configured icon name; undefined for unknown/missing names. */
export function iconSrc(name: string | undefined): string | undefined {
  if (!name || !(name in TASK_ICONS)) return undefined;
  return `assets/icons/${name}.png`;
}
