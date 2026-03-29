/**
 * Stats section data.
 *
 * Values are derived from coach data where possible to maintain a single
 * source of truth (see ADR-0017). Only "100% Personalized" and the coach
 * count are static — everything else is computed from coaches.ts.
 *
 * @see ~/components/sections/Stats.astro
 * @see ~/utils/counter.ts — parseCounterValue() for counter animation values
 */

import { coachesExpanded, getTotalExperience } from './coaches';

/** Individual stat item with value and label */
type Stat = {
  /** The numeric/text value displayed prominently */
  value: string;
  /** Description label below the value */
  label: string;
};

/** Configuration for the stats section */
type StatsSection = {
  /** Section headline */
  headline: string;
  /** Stats to display (typically 4 for best layout) */
  stats: readonly Stat[];
};

const experience = getTotalExperience();

const statsSection: StatsSection = {
  headline: 'Proven Track Record',
  stats: [
    { value: `${experience.coaching}+`, label: 'Years Coaching' },
    { value: `${experience.competing}`, label: 'Years Competing' },
    { value: `${coachesExpanded.length}`, label: 'IFBB Pro Coaches' },
    { value: '100%', label: 'Personalized' },
  ],
};

// Export
export { statsSection };
export type { Stat, StatsSection };
