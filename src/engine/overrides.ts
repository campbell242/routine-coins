// Parent-editable values resolve as: local override if present, otherwise
// configuration default. Overrides are stored separately from configuration
// and therefore survive configuration updates.

import type { PlanConfig, PlanOverride, PlanResolved } from '../config/types';

export type OverrideMap = Record<string, PlanOverride | undefined>;

export function resolvePlan(config: PlanConfig, override: PlanOverride | undefined): PlanResolved {
  return {
    id: config.id,
    name: config.name,
    enabled: config.enabled,
    schedule: config.schedule,
    windowStart: override?.windowStart ?? config.windowStart,
    windowEnd: override?.windowEnd ?? config.windowEnd,
    baseAward: override?.baseAward ?? config.baseAward,
    items: config.items,
  };
}

export function resolveAll(configs: PlanConfig[], overrides: OverrideMap): PlanResolved[] {
  return configs.map((c) => resolvePlan(c, overrides[c.id]));
}
