import type { PlanConfig } from './types';

// Plans are configuration. To add another routine (say, a Saturday chores
// routine), append a PlanConfig here — nothing else changes.

// Disabled while the family focuses on nights only — flip `enabled` to bring
// it back. Item IDs stay reserved forever (checks are keyed to them).
export const morningRoutine: PlanConfig = {
  id: 'morning',
  name: 'Morning Routine',
  enabled: false,
  schedule: { days: [1, 2, 3, 4, 5] }, // weekdays
  windowStart: '06:30',
  windowEnd: '08:30',
  baseAward: 40,
  items: [
    { id: 'm-teeth', label: 'Brush teeth', hint: 'Two whole minutes!', kind: 'required', attestation: 'child', icon: 'toothbrush' },
    { id: 'm-dressed', label: 'Get dressed', hint: 'Clothes are on your chair', kind: 'required', attestation: 'child', icon: 'shirt' },
    { id: 'm-bed', label: 'Make your bed', hint: 'Covers up, pillow on top', kind: 'required', attestation: 'child', icon: 'bed' },
    { id: 'm-backpack', label: 'Pack backpack', hint: 'Homework folder + water bottle', kind: 'required', attestation: 'child', icon: 'backpack' },
    { id: 'm-read', label: 'Read 10 minutes', hint: 'Any book you like', kind: 'bonus', bonus: 15, attestation: 'child', icon: 'book' },
    { id: 'm-desk', label: 'Tidy your desk', hint: 'Clear surface, pencils in the cup', kind: 'bonus', bonus: 10, attestation: 'child', icon: 'broom' },
  ],
};

// The real family routine (locked 2026-08-16): opens 7:00 PM, worth exactly
// 344/night — base 204 + sleep 100 + Stormy 20 + lunch 20. Five perfect
// nights = 1,720 = one redemption. Times live in hints only; the app never
// auto-evaluates or auto-fails a time. Old item IDs (n-teeth, n-pjs, n-tidy,
// n-clothes, n-read, n-lightsout, n-stayedinbed) are retired — never reuse.
export const nighttimeRoutine: PlanConfig = {
  id: 'nighttime',
  name: 'Nighttime Routine',
  enabled: true,
  schedule: { days: [0, 1, 2, 3, 4, 5, 6] }, // every night
  windowStart: '19:00',
  baseAward: 204,
  items: [
    { id: 'n-snack', label: 'Snack time', hint: 'Kitchen closes at 8:00!', kind: 'required', attestation: 'child', icon: 'cookie' },
    { id: 'n-change', label: 'Change into clean clothes', hint: 'Fresh underwear — and set up your brush for morning', kind: 'required', attestation: 'child', icon: 'shirt' },
    { id: 'n-teethfloss', label: 'Brush + floss teeth', hint: 'Around 8:15 — floss too!', kind: 'required', attestation: 'child', icon: 'toothbrush' },
    { id: 'n-parentread', label: 'Reading with Mom or Dad', hint: '8:30–9:00 — no reading time after 9:00', kind: 'required', attestation: 'child', icon: 'book' },
    // The natural handoff: she checks this in Mom & Dad's room and hands the
    // phone over for review on the spot.
    { id: 'n-phone', label: 'Phone to Mom & Dad’s room', hint: 'On the charger before 9:30', kind: 'required', attestation: 'child', icon: 'door' },
    // Happens after the phone leaves her room — a parent confirms it the
    // next morning. Mandatory in spirit; its own +100 makes the consequence
    // automatic without wiping out credit for the rest of the night.
    { id: 'n-sleep', label: 'In bed, lights out, stay in bed', hint: '9:30 — go to bed early if you want more reading', kind: 'bonus', bonus: 100, attestation: 'parent-morning', icon: 'lantern' },
    { id: 'n-stormy', label: 'Feed Stormy', hint: 'Dinner for the rat!', kind: 'bonus', bonus: 20, attestation: 'child', icon: 'bone' },
    { id: 'n-lunch', label: 'Pack lunch + water bottle', hint: 'Ready for tomorrow', kind: 'bonus', bonus: 20, attestation: 'child', icon: 'apple' },
  ],
};

export const allPlans: PlanConfig[] = [morningRoutine, nighttimeRoutine];

export function getPlanConfig(planId: string): PlanConfig | undefined {
  return allPlans.find((p) => p.id === planId);
}
