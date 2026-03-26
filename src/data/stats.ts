/**
 * Stats section data.
 * @see ~/components/sections/Stats.astro
 * @see ~/utils/counter.ts — parseCounterValue() for counter animation values
 */

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

const statsSection = {
  headline: 'Proven Track Record',
  stats: [
    { value: '500+', label: 'Clients Transformed' },
    { value: '15+', label: 'Years Combined Experience' },
    { value: '3', label: 'IFBB Pro Coaches' },
    { value: '98%', label: 'Client Satisfaction' },
  ],
} as const satisfies StatsSection;

// Export
export { statsSection };
export type { Stat, StatsSection };
