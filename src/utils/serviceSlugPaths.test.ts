/**
 * Test for `getServiceSlugPaths` — the static-path helper consumed by
 * `src/pages/services/[slug].astro` via re-export.
 *
 * Assertions are property-based: each one is expressed in terms of the
 * launch-gate predicate (`hasCompleteDetailContent`) and the canonical
 * service catalogue, never in terms of literal counts. The properties
 * survive both pre-stub and post-stub commits (zero or one services
 * passing the gate) without modification, which keeps this test stable
 * across the commits that flip the predicate's evaluation.
 *
 * The test deliberately does NOT import from `[slug].astro`. The page
 * module re-exports `getStaticPaths` from this module's helper so the
 * routing contract is satisfied; testing through the helper avoids
 * pulling the page composition's transitive imports into the test's
 * module graph, and keeps `src/pages/services/` `.ts`-free so Astro's
 * router has nothing to mistakenly emit (see ADR-0038 §1 for the
 * pattern, and `serviceSlugPaths.ts`'s header comment for the routing
 * mechanics).
 */
import { describe, expect, it } from 'vitest';
import { hasCompleteDetailContent, serviceIds, services } from '~/data/services';
import { getServiceSlugPaths } from './serviceSlugPaths';

describe('getServiceSlugPaths', () => {
  it('emits one entry per service that passes hasCompleteDetailContent', () => {
    const result = getServiceSlugPaths();
    const detailEligible = services.filter(hasCompleteDetailContent);

    expect(result).toHaveLength(detailEligible.length);
  });

  it('keys each entry by its service id', () => {
    const result = getServiceSlugPaths();

    for (const entry of result) {
      expect(entry.params.slug).toBe(entry.props.service.id);
    }
  });

  it('emits only slugs that exist in the canonical serviceIds list', () => {
    const result = getServiceSlugPaths();
    const knownIds = new Set<string>(serviceIds);

    for (const entry of result) {
      expect(knownIds.has(entry.params.slug)).toBe(true);
    }
  });
});
