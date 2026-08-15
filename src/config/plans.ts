import type { PlanConfig } from './types';

// The two initial plans. To add another routine (say, a Saturday chores
// routine), append a PlanConfig here — nothing else changes.

export const morningRoutine: PlanConfig = {
  id: 'morning',
  name: 'Morning Routine',
  enabled: true,
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

export const nighttimeRoutine: PlanConfig = {
  id: 'nighttime',
  name: 'Nighttime Routine',
  enabled: true,
  schedule: { days: [0, 1, 2, 3, 4, 5, 6] }, // every day
  windowStart: '20:00',
  baseAward: 40,
  items: [
    { id: 'n-teeth', label: 'Brush teeth', hint: 'Two whole minutes!', kind: 'required', attestation: 'child', icon: 'toothbrush' },
    { id: 'n-pjs', label: 'PJs on', hint: 'Comfy ones ready for bed', kind: 'required', attestation: 'child', icon: 'shirt' },
    { id: 'n-tidy', label: 'Five-minute tidy', hint: 'Toys and clothes off the floor', kind: 'required', attestation: 'child', icon: 'broom' },
    { id: 'n-clothes', label: 'Lay out tomorrow’s clothes', hint: 'Pick your favorites', kind: 'required', attestation: 'child', icon: 'basket' },
    { id: 'n-read', label: 'Read 10 minutes in bed', hint: 'Any book you like', kind: 'bonus', bonus: 15, attestation: 'child', icon: 'book' },
    // Final bedtime items — happen after the phone leaves Haley's room.
    // A parent attests to them, normally the next morning, in one session
    // that both verifies these and approves the routine.
    { id: 'n-lightsout', label: 'Lights out by 8:45', kind: 'bonus', bonus: 10, attestation: 'parent-morning', icon: 'lantern' },
    { id: 'n-stayedinbed', label: 'Stayed in bed after lights out', kind: 'bonus', bonus: 10, attestation: 'parent-morning', icon: 'bed' },
  ],
};

export const allPlans: PlanConfig[] = [morningRoutine, nighttimeRoutine];

export function getPlanConfig(planId: string): PlanConfig | undefined {
  return allPlans.find((p) => p.id === planId);
}
