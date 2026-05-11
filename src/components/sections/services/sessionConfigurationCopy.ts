/**
 * Micro-copy for a session-based service's package configuration (ADR-0047).
 *
 * The Posing & Stage Presence card shows a single line summarising the
 * session-package axes — "1, 5 or 10 sessions · 30 or 60 min" — instead of the
 * full configuration matrix, which lives on the detail page. The line is
 * derived from {@link SessionService.configuration} so a future session-based
 * service with different axes renders correctly without a code change.
 *
 * Extracted from `ServiceCard.astro` so the list-to-prose join can be covered
 * by a pure-function Vitest test independently of the rendering context
 * (pure-function layer per ADR-0037; mirrors `processStepText.ts`).
 */

/**
 * The narrow slice of {@link import('~/data/services').SessionService} this
 * helper needs. Typed structurally rather than imported so the helper carries
 * no dependency on the services module — the rendering component passes the
 * concrete `configuration` object.
 */
type SessionConfiguration = {
  /** Number of sessions per package (e.g., 1, 5, 10). */
  readonly sessionCounts: readonly number[];
  /** Per-session duration options in minutes (e.g., 30, 60). */
  readonly durations: readonly number[];
};

/** Middle dot (U+00B7) with surrounding spaces — joins the two config clauses. */
const CLAUSE_SEPARATOR = ' · ';

/**
 * Join a list of items into prose: `a` for one, `a or b` for two,
 * `a, b or c` for three or more. An empty list yields the empty string.
 */
function joinAsProse(items: readonly string[]): string {
  if (items.length === 0) return '';
  if (items.length === 1) return items[0];
  const head = items.slice(0, -1);
  const tail = items[items.length - 1];
  return `${head.join(', ')} or ${tail}`;
}

/**
 * Build the configuration micro-copy line for a session-based service card,
 * e.g. `1, 5 or 10 sessions · 30 or 60 min` for
 * `{ sessionCounts: [1, 5, 10], durations: [30, 60] }`.
 */
function formatSessionConfigurationCopy(configuration: SessionConfiguration): string {
  const sessionsClause = `${joinAsProse(configuration.sessionCounts.map(String))} sessions`;
  const durationClause = `${joinAsProse(configuration.durations.map(String))} min`;
  return `${sessionsClause}${CLAUSE_SEPARATOR}${durationClause}`;
}

export { formatSessionConfigurationCopy, joinAsProse };
export type { SessionConfiguration };
