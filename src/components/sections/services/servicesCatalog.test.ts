// This file imports jsdom as a library (`new JSDOM(html)`) rather than
// switching the test environment to jsdom via Vitest's environment pragma.
// The pragma route conflicts with the Astro Container API's esbuild-init
// invariant on the current Vitest/Node/Astro/esbuild combo; the
// JSDOM-instance route sidesteps the realm clash. See ADR-0037
// §Conventions and the PR-body deviation note for the full chain.
import { JSDOM } from 'jsdom';
import { describe, expect, it } from 'vitest';
import { hasCompleteDetailContent, serviceDetailHref, services } from '~/data/services';
import type { MissionBlockContent } from '~/data/servicesMission';
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

// Inline fixture so the catalog-layer test stays decoupled from copy drift
// in `~/data/servicesMission.ts`. The catalog assertions below depend on
// catalog behaviour (routes, affordances, toggle-scope caption), not on
// mission-content strings — same decoupling rationale as `missionBlock.test.ts`.
const missionContentFixture: MissionBlockContent = {
  heading: 'Test heading',
  paragraph: 'Test paragraph',
  coachSentences: {
    helle: 'Helle test',
    gina: 'Gina test',
    irene: 'Irene test',
  },
  transitionLine: 'Test transition line',
};

async function renderCatalog(): Promise<Document> {
  const html = await renderAstro(ServicesCatalog, {
    props: { headline: 'Our Services', missionContent: missionContentFixture },
  });
  return parse(html);
}

describe('ServicesCatalog (catalog layer, real data)', () => {
  it('routes surface + primary button to detail and escape link to contact for every eligible service', async () => {
    // Mutation pair A (catches surface mis-routing): the catalog renders
    // with the eligible-card surface anchor mutated to
    // `service.contactHref`. The structural surface selector locates the
    // same element regardless of href; the
    // `surfaceAnchor.getAttribute('href') === serviceDetailHref(service.id)`
    // assertion fails. The primary-button assertion still passes; the
    // surface assertion catches.
    // Mutation pair B (catches primary-button mis-routing): the catalog
    // renders with the eligible-card primary button's href mutated to a
    // hardcoded literal or to `service.contactHref`. The selector keys
    // on `w-full` and the absence of a stretched-link first child; the
    // `primaryButton.getAttribute('href') === serviceDetailHref(service.id)`
    // assertion fails. The surface assertion still passes; the
    // primary-button assertion catches. The two selectors locate
    // distinct elements, so first-match ordering plays no role — the
    // test does not call `querySelector` on the duplicate aria-label,
    // it iterates `querySelectorAll` and routes each match through a
    // structural selector. Also catches: a `ServicesCatalog.astro`
    // change that filters, transforms, or replaces `<ServiceCard>` in a
    // way that drops the eligible-branch markup; a real-data change
    // that removes a launch-gate field from an eligible service.
    // Mutation it does NOT catch: the escape link missing or
    // mis-routed in isolation — covered by the explicit escape-anchor
    // assertion below in this same case.
    const doc = await renderCatalog();
    const eligibleServices = services.filter(hasCompleteDetailContent);

    // Guard: at launch, `competition-prep` is the only eligible service.
    // Asserting `>= 1` keeps the test stable as more services qualify
    // post-launch without a per-service hard-coded list.
    expect(eligibleServices.length).toBeGreaterThanOrEqual(1);

    for (const service of eligibleServices) {
      const detailAnchors = Array.from(
        doc.querySelectorAll<HTMLAnchorElement>(
          `a[aria-label="Read details about ${service.name}"]`,
        ),
      );
      expect(detailAnchors).toHaveLength(2);

      const surfaceAnchor = detailAnchors.find((a) =>
        a.firstElementChild?.classList.contains('absolute'),
      );
      const primaryButton = detailAnchors.find(
        (a) =>
          !a.firstElementChild?.classList.contains('absolute') &&
          a.getAttribute('class')?.includes('w-full'),
      );
      if (surfaceAnchor === undefined) {
        throw new Error(`surface anchor missing for eligible service "${service.id}"`);
      }
      if (primaryButton === undefined) {
        throw new Error(`primary button missing for eligible service "${service.id}"`);
      }

      expect(surfaceAnchor.getAttribute('href')).toBe(serviceDetailHref(service.id));
      expect(primaryButton.getAttribute('href')).toBe(serviceDetailHref(service.id));

      // JSDOM's `querySelector` returns null on attribute selectors whose
      // quoted value contains `&` even when `querySelectorAll` returns
      // a match for the identical selector (regression observable on
      // service names like "Posing & Stage Presence"). Using
      // `querySelectorAll(...)[0]` for the structural assertion sidesteps
      // the asymmetry while preserving the test's intent.
      const escapeAnchor =
        doc.querySelectorAll<HTMLAnchorElement>(
          `a[aria-label="Contact us about ${service.name}"]`,
        )[0] ?? null;
      if (escapeAnchor === null) {
        throw new Error(`escape anchor missing for eligible service "${service.id}"`);
      }
      expect(escapeAnchor.getAttribute('href')).toBe(service.contactHref);
    }
  });

  it('binds the FilterBar toolbar to the visible "Choose your focus" over-label via aria-labelledby', async () => {
    // Catches: a regression that drops the over-label <p>, removes the
    // aria-labelledby attribute on the toolbar, or breaks the id pairing
    // so the toolbar's Accessible Name no longer resolves to the visible
    // text the design relies on.
    const doc = await renderCatalog();
    const toolbar = doc.querySelector<HTMLElement>('[role="toolbar"]');
    if (toolbar === null) {
      throw new Error('FilterBar toolbar missing');
    }
    const labelledBy = toolbar.getAttribute('aria-labelledby');
    if (labelledBy === null) {
      throw new Error('FilterBar toolbar missing aria-labelledby');
    }
    const labelEl = doc.getElementById(labelledBy);
    if (labelEl === null) {
      throw new Error(`aria-labelledby target "${labelledBy}" not present in the DOM`);
    }
    expect(labelEl.textContent?.trim()).toBe('Choose your focus');
  });

  it('binds the SegmentedControl fieldset to the visible "Show pricing for" over-label via aria-labelledby', async () => {
    // Catches: a regression that drops the over-label <p>, removes the
    // aria-labelledby attribute on the fieldset, or breaks the id pairing
    // so the fieldset's Accessible Name no longer resolves to the visible
    // text the design relies on.
    const doc = await renderCatalog();
    const fieldset = doc.querySelector<HTMLFieldSetElement>('fieldset[aria-labelledby]');
    if (fieldset === null) {
      throw new Error('SegmentedControl fieldset with aria-labelledby missing');
    }
    const labelledBy = fieldset.getAttribute('aria-labelledby');
    if (labelledBy === null) {
      throw new Error('SegmentedControl fieldset missing aria-labelledby');
    }
    const labelEl = doc.getElementById(labelledBy);
    if (labelEl === null) {
      throw new Error(`aria-labelledby target "${labelledBy}" not present in the DOM`);
    }
    expect(labelEl.textContent?.trim()).toBe('Show pricing for');
  });

  it('places the quiz hint after the filter toolbar in source order', async () => {
    // Catches: a re-stack regression that moves the quiz hint back above
    // (or alongside) the filter. The current reading order is
    // filter → quiz-hint → toggle, so the hint must follow the toolbar
    // in document order for a visitor scanning the page top-to-bottom.
    const doc = await renderCatalog();
    const quizHint = Array.from(doc.querySelectorAll<HTMLParagraphElement>('p')).find((p) =>
      p.textContent?.includes('Take the quiz'),
    );
    if (quizHint === undefined) {
      throw new Error('quiz hint paragraph missing');
    }
    const filterToolbar = doc.querySelector<HTMLElement>('[role="toolbar"]');
    if (filterToolbar === null) {
      throw new Error('FilterBar toolbar missing');
    }
    // `Node.DOCUMENT_POSITION_FOLLOWING` is `0x04` per the DOM spec; the
    // catalog test parses HTML with a JSDOM-instance (see file header) so
    // the global `Node` constructor is not in scope. The numeric literal
    // matches the spec value and keeps the assertion realm-agnostic.
    const DOCUMENT_POSITION_FOLLOWING = 0x04;
    expect(
      filterToolbar.compareDocumentPosition(quizHint) & DOCUMENT_POSITION_FOLLOWING,
    ).toBeGreaterThan(0);
  });

  it('renders the pricing-toggle scope caption as quiet muted text, not a banner', async () => {
    // Catches: the toggle-scope clarification copy going missing (e.g., a
    // refactor that drops the <p>) or being promoted into a banner-styled
    // element (background fill, border, or accent colour) that would
    // contradict the ADR-0047 "safety net, not signpost" constraint.
    const doc = await renderCatalog();
    const caption = Array.from(doc.querySelectorAll<HTMLParagraphElement>('p')).find((p) =>
      p.textContent?.includes('Session-based services are priced per session'),
    );
    if (caption === undefined) {
      throw new Error('pricing-toggle scope caption missing');
    }
    expect(caption.textContent?.trim()).toBe(
      'Applies to ongoing coaching plans. Session-based services are priced per session.',
    );

    const className = caption.getAttribute('class') ?? '';
    expect(className).not.toMatch(/\bborder\b/);
    expect(className).not.toMatch(/\bbg-/);
  });

  it('emits no detail affordance and no escape link for non-eligible services in the real data', async () => {
    // Mutation it catches: the eligibility predicate flipped or bypassed
    // so non-eligible services render the eligible footer (escape link
    // appears, or the surface/primary anchor carries a "Read details
    // about" aria-label). Iterates the real catalog so a future data
    // change that newly qualifies a service shifts it into the
    // positive-case loop above without silently weakening this guard.
    // Mutation it does NOT catch: href construction on either anchor of
    // the eligible branch — covered by the positive-case loop above.
    const doc = await renderCatalog();
    const nonEligibleServices = services.filter((s) => !hasCompleteDetailContent(s));

    expect(nonEligibleServices.length).toBeGreaterThanOrEqual(1);

    for (const service of nonEligibleServices) {
      const detailAffordance = doc.querySelector(
        `a[aria-label="Read details about ${service.name}"]`,
      );
      expect(detailAffordance).toBeNull();

      const escapeLink = doc.querySelector(`a[aria-label="Contact us about ${service.name}"]`);
      expect(escapeLink).toBeNull();
    }
  });
});
