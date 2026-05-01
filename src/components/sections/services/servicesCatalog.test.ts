// This file imports jsdom as a library (`new JSDOM(html)`) rather than
// switching the test environment to jsdom via Vitest's environment pragma.
// The pragma route conflicts with the Astro Container API's esbuild-init
// invariant on the current Vitest/Node/Astro/esbuild combo; the
// JSDOM-instance route sidesteps the realm clash. See ADR-0037
// §Conventions and the PR-body deviation note for the full chain.
import { JSDOM } from 'jsdom';
import { describe, expect, it } from 'vitest';
import { hasCompleteDetailContent, serviceDetailHref, services } from '~/data/services';
import { renderAstro } from '~/test-utils/renderAstro';
import ServicesCatalog from './ServicesCatalog.astro';

/**
 * Catalog-layer integration test. Sits above the component-level
 * `serviceCard.test.ts` and renders the real catalog with the real
 * `services` data so a regression in either layer fails here:
 *
 * - A `ServicesCatalog.astro` change that filters, transforms, or wraps
 *   cards in a way that hides the affordance link.
 * - A real-data change in `src/data/services.ts` that drops a launch-gate
 *   field from `competition-prep` (or removes the entry entirely),
 *   making the affordance disappear from the catalog at runtime.
 *
 * The component-level test cannot catch either case because it renders
 * `ServiceCard` in isolation with a synthetic fixture and a mocked route
 * helper.
 *
 * What this test does NOT catch:
 * - Browser-only rendering issues (CSS overflow hiding the link, z-index
 *   stacking) — Playwright/E2E territory.
 * - Build-cache divergences (e.g., a stale Vite/.astro cache that serves
 *   pre-edit output in `pnpm dev`) — infrastructure, not testable in
 *   Vitest.
 */

function parse(html: string): Document {
  return new JSDOM(html).window.document;
}

async function renderCatalog(): Promise<Document> {
  const html = await renderAstro(ServicesCatalog, {
    props: { headline: 'Our Services' },
  });
  return parse(html);
}

describe('ServicesCatalog (catalog layer, real data)', () => {
  it('renders the affordance link for every detail-eligible service in the real data', async () => {
    // Mutation it catches: a `ServicesCatalog.astro` change that filters,
    // transforms, or replaces `<ServiceCard>` in a way that drops the
    // affordance link from the rendered output (e.g., a wrapper that
    // strips the footer slot, or a conditional that excludes eligible
    // services from a category group). Also catches: a real-data change
    // that removes a launch-gate field from `competition-prep` so
    // `hasCompleteDetailContent` returns false and the affordance is
    // never emitted.
    const doc = await renderCatalog();
    const eligibleServices = services.filter(hasCompleteDetailContent);

    // Guard: at launch, `competition-prep` is the only eligible service.
    // Asserting `>= 1` keeps the test stable as more services qualify
    // post-launch without a per-service hard-coded list.
    expect(eligibleServices.length).toBeGreaterThanOrEqual(1);

    for (const service of eligibleServices) {
      const affordance = doc.querySelector<HTMLAnchorElement>(
        `a[aria-label="Read details about ${service.name}"]`,
      );
      if (affordance === null) {
        throw new Error(`affordance link missing for eligible service "${service.id}"`);
      }
      expect(affordance.getAttribute('href')).toBe(serviceDetailHref(service.id));
    }
  });

  it('emits no affordance link for non-eligible services in the real data', async () => {
    // Mutation it catches: the eligibility predicate flipped or bypassed
    // so non-eligible services render the affordance with a broken
    // detail-page href. Iterates the real catalog so a future data
    // change that newly qualifies a service shifts that service into the
    // positive-case loop above without silently weakening this guard.
    const doc = await renderCatalog();
    const nonEligibleServices = services.filter((s) => !hasCompleteDetailContent(s));

    expect(nonEligibleServices.length).toBeGreaterThanOrEqual(1);

    for (const service of nonEligibleServices) {
      const affordance = doc.querySelector(`a[aria-label="Read details about ${service.name}"]`);
      expect(affordance).toBeNull();
    }
  });
});
