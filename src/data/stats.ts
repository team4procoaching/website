/**
 * Stats section data.
 *
 * Values are derived from coach data where possible to maintain a single
 * source of truth (see ADR-0017). Only "100% Personalized" and the coach
 * count are static — everything else is computed from coaches.ts.
 *
 * @see ~/components/sections/Stats.astro
 */

import { coachesExpanded, getTotalExperience } from './coaches';

/** Individual stat item displayed as an animated count-up tile. */
type Stat = {
  /** Optional stable identifier for ID-based referencing (ADR-0017). */
  id?: string;
  /** Numeric target for the count-up animation. */
  target: number;
  /** Prefix rendered before the animated number (caller controls spacing). */
  prefix?: string;
  /** Suffix rendered after the animated number (caller controls spacing). */
  suffix?: string;
  /** Description label below the value. */
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
    { id: 'yearsCoaching', target: experience.coaching, suffix: '+', label: 'Years Coaching' },
    { id: 'yearsCompeting', target: experience.competing, label: 'Years Competing' },
    { id: 'proCoaches', target: coachesExpanded.length, label: 'IFBB Pro Coaches' },
    { id: 'personalized', target: 100, suffix: '%', label: 'Personalized' },
  ],
};

// Export
export { statsSection };
export type { Stat, StatsSection };
