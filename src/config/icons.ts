// Task icon pack (design/README.md "Task Icon Pack", screen 2a).
// 37 hand-drawn pixel PNGs in assets/icons/. Icons are decorative labels on
// checklist items — never buttons, never the only signal of meaning (the task
// text is always present). Referenced from item config by bare name
// (e.g. icon: 'toothbrush'); unknown names degrade gracefully to no icon.

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
  // School & chores
  backpack: 'backpack',
  pencil: 'homework',
  paper: 'worksheet',
  book: 'reading',
  broom: 'tidy up',
  trash: 'trash',
  flower: 'water plants',
  bone: 'feed pet',
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
