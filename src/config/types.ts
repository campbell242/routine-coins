// Configuration schema for the plan engine (Amendment 1: configuration-driven).
// Plans are data. Adding a new routine (e.g. a Saturday routine) means adding a
// PlanConfig to src/config/plans.ts — no engine or UI changes.

/** 0 = Sunday … 6 = Saturday (JS Date.getDay convention). */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface ScheduleConfig {
  /** Days of the week this plan occurs on. */
  days: Weekday[];
}

export type Attestation =
  /** The child checks this item herself. */
  | 'child'
  /**
   * Happens after the phone leaves the child's room (e.g. "lights out by 8:45").
   * Never auto-evaluated: a parent attests to it, typically the next morning.
   */
  | 'parent-morning';

export interface ItemConfig {
  /** Stable ID — never reuse or renumber; checks are keyed to it. */
  id: string;
  label: string;
  hint?: string;
  kind: 'required' | 'bonus';
  /** Coin value for bonus items. */
  bonus?: number;
  attestation: Attestation;
  /**
   * Optional task icon by bare name from the design's icon pack — see
   * src/config/icons.ts (TASK_ICONS) for the full list of valid names.
   * Decorative only; unknown or missing names render no icon (never an error).
   */
  icon?: string;
}

export interface PlanConfig {
  /** Stable ID — occurrences and overrides are keyed to it. */
  id: string;
  name: string;
  /** Disabled plans never produce new occurrences; old data degrades gracefully. */
  enabled: boolean;
  schedule: ScheduleConfig;
  /** 'HH:MM' 24h — when the routine unlocks for the day. */
  windowStart: string;
  /**
   * 'HH:MM' 24h — advisory "finish by" target. Display only: never
   * auto-evaluated, never auto-failed (spec: time-conditioned items and
   * windows are child-attested or parent-verified).
   */
  windowEnd?: string;
  /** Default base award; parents can override (override wins, survives config updates). */
  baseAward: number;
  items: ItemConfig[];
}

/** Parent-editable values. Stored separately so they survive config updates. */
export interface PlanOverride {
  baseAward?: number;
  windowStart?: string;
  windowEnd?: string;
}

/** A plan with overrides resolved (override if present, else config default). */
export interface PlanResolved {
  id: string;
  name: string;
  enabled: boolean;
  schedule: ScheduleConfig;
  windowStart: string;
  windowEnd?: string;
  baseAward: number;
  items: ItemConfig[];
}

/**
 * Frozen copy of the resolved configuration taken when an occurrence starts.
 * Config changes while an occurrence is unresolved do not affect it.
 */
export interface PlanSnapshot {
  planId: string;
  name: string;
  baseAward: number;
  windowStart: string;
  windowEnd?: string;
  items: ItemConfig[];
  takenAt: number;
}
