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

/**
 * Stat identifiers for the canonical {@link statsSection} catalog — single
 * source of truth for the four tiles that appear on the homepage and in
 * derivative views (e.g. the services-page evidence strip).
 *
 * Separate datasets that happen to reuse the {@link Stat} shape (success
 * story metrics, per-page hero stats) do not belong here; they are local
 * presentational data without cross-file ID references.
 */
const statIds = ['yearsCoaching', 'yearsCompeting', 'proCoaches', 'personalized'] as const;

/** Catalog stat identifier type, derived from {@link statIds}. */
type StatId = (typeof statIds)[number];

/**
 * Individual stat item displayed as an animated count-up tile.
 *
 * Base presentational shape. Catalog entries use {@link CatalogStat},
 * which adds a required `id: StatId` for cross-file references. Story-
 * local metrics and inline per-page strips stay on `Stat`.
 */
type Stat = {
  /** Numeric target for the count-up animation. */
  target: number;
  /** Prefix rendered before the animated number (caller controls spacing). */
  prefix?: string;
  /** Suffix rendered after the animated number (caller controls spacing). */
  suffix?: string;
  /** Description label below the value. */
  label: string;
};

/**
 * A {@link Stat} that is a member of the canonical stats catalog — the
 * required `id` lets catalog-aware consumers (ServicesCatalog filter,
 * /coaches hero strip) reference entries by a closed {@link StatId}
 * union. `CatalogStat` is assignable to `Stat`, so grid components
 * that accept `readonly Stat[]` accept `readonly CatalogStat[]` without
 * a union or narrowing.
 */
type CatalogStat = Stat & { id: StatId };

/** Configuration for the stats section. */
type StatsSection = {
  /** Section headline. */
  headline: string;
  /**
   * Catalog of stats keyed by {@link StatId}. Consumers iterate via
   * `Object.values(...)` when they need the display order; the record
   * layout guarantees compile-time completeness per ADR-0017.
   */
  stats: Readonly<Record<StatId, CatalogStat>>;
};

const experience = getTotalExperience();

/**
 * Canonical stats catalog keyed by {@link StatId}. `as const satisfies`
 * preserves the literal `id` values while the Record constraint guarantees
 * every StatId has a data entry — dropping one of the four tiles is a
 * compile error, not a silent runtime change (ADR-0017).
 */
const statsById = {
  yearsCoaching: {
    id: 'yearsCoaching',
    target: experience.coaching,
    suffix: '+',
    label: 'Years Coaching',
  },
  yearsCompeting: {
    id: 'yearsCompeting',
    target: experience.competing,
    label: 'Years Competing',
  },
  proCoaches: {
    id: 'proCoaches',
    target: coachesExpanded.length,
    label: 'IFBB Pro Coaches',
  },
  personalized: {
    id: 'personalized',
    target: 100,
    suffix: '%',
    label: 'Personalized',
  },
} as const satisfies Record<StatId, CatalogStat>;

const statsSection: StatsSection = {
  headline: 'Proven Track Record',
  stats: statsById,
};

// Export
export { statIds, statsSection };
export type { CatalogStat, Stat, StatId, StatsSection };
