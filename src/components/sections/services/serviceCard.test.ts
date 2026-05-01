// This file imports jsdom as a library (`new JSDOM(html)`) rather than
// switching the test environment to jsdom via Vitest's environment pragma.
// The pragma route conflicts with the Astro Container API's esbuild-init
// invariant on the current Vitest/Node/Astro/esbuild combo; the
// JSDOM-instance route sidesteps the realm clash. See ADR-0037
// §Conventions and the PR-body deviation note for the full chain.
import { JSDOM } from 'jsdom';
import { describe, expect, it, vi } from 'vitest';
import { routes } from '~/data/routes';
import type { Service, ServiceWithCompleteDetailContent } from '~/data/services';
import { renderAstro } from '~/test-utils/renderAstro';
import ServiceCard from './ServiceCard.astro';

// Sentinel-mock the route helper so Case 1's "affordance href is the
// detail-page URL, not the contact URL" assertion fails on a regression
// that hardcodes the path string. With the real helper, the affordance
// href and the contact-derived `service.contactHref` are byte-distinct
// but both shaped as `/services/...` / `/contact?service=...`; a
// mutation that swaps `serviceDetailHref(id)` for a literal
// `${routes.services}/${id}` would still produce a byte-identical URL
// to the real helper output and would not trip a string-equality
// assertion. Replacing the helper with a sentinel string severs the
// byte-identity escape route — the test asserts identity through the
// mock, not through reproducible string construction.
vi.mock('~/data/services', async () => {
  const actual = await vi.importActual<typeof import('~/data/services')>('~/data/services');
  return { ...actual, serviceDetailHref: () => '__DETAIL_HREF_SENTINEL__' };
});

/**
 * Detail-eligible service fixture sized at the launch-gate minimum
 * (`fitFor.length >= 3`, `notFitFor.length >= 2`, `faq.length >= 3`,
 * `detailedFeatures.length >= 3`, non-empty `lead`). The card renders
 * the affordance link iff `hasCompleteDetailContent(service)` returns
 * true, so the fixture exercises the eligible branch.
 */
const fixtureService: ServiceWithCompleteDetailContent = {
  id: 'competition-prep',
  name: 'Competition Prep',
  tagline: 'Test tagline',
  description: 'Test description',
  category: 'bodybuilding',
  pricing: [
    {
      period: 'monthly',
      price: '€299',
      suffix: '/month',
      amount: 299,
      currency: 'EUR',
    },
  ],
  features: ['feature one'],
  contactHref: `${routes.contact}?service=competition-prep`,
  lead: 'A non-empty lead paragraph.',
  detailedFeatures: [
    { title: 'A', description: 'a' },
    { title: 'B', description: 'b' },
    { title: 'C', description: 'c' },
  ],
  fitFor: ['fit one', 'fit two', 'fit three'],
  notFitFor: ['not fit one', 'not fit two'],
  faq: [
    { question: 'Q1', answer: 'A1' },
    { question: 'Q2', answer: 'A2' },
    { question: 'Q3', answer: 'A3' },
  ],
};

/**
 * Non-eligible service fixture — only the required `Service` fields,
 * none of the optional detail-page fields. `hasCompleteDetailContent`
 * returns false because `lead` is absent (and the array thresholds are
 * unmet by omission), so the card renders no affordance link.
 */
const fixtureServiceWithoutDetail: Service = {
  id: 'busy',
  name: 'Busy',
  tagline: 'Test tagline',
  description: 'Test description',
  category: 'wellness',
  pricing: [
    {
      period: 'monthly',
      price: '€99',
      suffix: '/month',
      amount: 99,
      currency: 'EUR',
    },
  ],
  features: ['feature one'],
  contactHref: `${routes.contact}?service=busy`,
};

function parse(html: string): Document {
  return new JSDOM(html).window.document;
}

async function render(
  service: Service = fixtureService,
  consumer?: 'catalog' | 'homepage',
): Promise<Document> {
  const html = await renderAstro(ServiceCard, {
    props: consumer === undefined ? { service } : { service, consumer },
  });
  return parse(html);
}

describe('ServiceCard (component layer)', () => {
  it('eligible card emits affordance and surface anchors with distinct hrefs', async () => {
    // Mutation it catches: hardcoding either anchor's href to a literal
    // path (e.g., `<a href={`${routes.services}/${service.id}`}>` instead
    // of `<a href={serviceDetailHref(service.id)}>`, or an inline contact
    // path on the surface anchor). The sentinel-mock breaks the
    // byte-identity escape route — the affordance href must equal the
    // sentinel, not a reproducible string.
    // Mutation it does NOT catch: predicate flipped (eligible service
    // rendered as non-eligible) — covered by Case 2.
    const doc = await render();
    const anchors = Array.from(doc.querySelectorAll<HTMLAnchorElement>('a'));

    const affordanceAnchor = anchors.find(
      (a) => a.getAttribute('href') === '__DETAIL_HREF_SENTINEL__',
    );
    if (affordanceAnchor === undefined) throw new Error('affordance anchor not found');

    const surfaceAnchor = anchors.find((a) => a.firstElementChild?.classList.contains('absolute'));
    if (surfaceAnchor === undefined) throw new Error('surface anchor not found');

    expect(affordanceAnchor.getAttribute('href')).toBe('__DETAIL_HREF_SENTINEL__');
    expect(surfaceAnchor.getAttribute('href')).toBe(fixtureService.contactHref);
  });

  it('non-eligible card emits two anchors both pointing at contactHref', async () => {
    // Mutation it catches: predicate flipped (a non-eligible service
    // renders the affordance) — the anchor count goes to three and one
    // of them carries the sentinel href. Either tripwire fails an
    // assertion below.
    // Mutation it does NOT catch: href construction on either anchor —
    // covered by Case 1.
    const doc = await render(fixtureServiceWithoutDetail);
    const anchors = Array.from(doc.querySelectorAll<HTMLAnchorElement>('a'));

    expect(anchors).toHaveLength(2);
    for (const anchor of anchors) {
      expect(anchor.getAttribute('href')).toBe(fixtureServiceWithoutDetail.contactHref);
    }
  });

  it('affordance link carries aria-label and an aria-hidden chevron', async () => {
    // Mutation it catches: dropping the per-service aria-label on the
    // affordance anchor (screen-reader users hear repeating "Read
    // details" without disambiguation), or dropping aria-hidden on the
    // chevron span (screen readers announce "right pointing arrow"
    // after the link text).
    // Mutation it does NOT catch: visual position of the link in the
    // footer (covered indirectly by selector pinning in Case 1 and
    // explicit DOM-order pinning in Case 5).
    const doc = await render();
    const affordanceAnchor = doc.querySelector<HTMLAnchorElement>(
      'a[href="__DETAIL_HREF_SENTINEL__"]',
    );
    if (affordanceAnchor === null) throw new Error('affordance anchor not found');

    expect(affordanceAnchor.getAttribute('aria-label')).toBe(
      `Read details about ${fixtureService.name}`,
    );

    const chevron = affordanceAnchor.querySelector('span[aria-hidden="true"]');
    if (chevron === null) throw new Error('aria-hidden chevron span not found');
    expect(chevron.getAttribute('aria-hidden')).toBe('true');
  });

  it('consumer prop scopes every emitted id, with no overlap across renders', async () => {
    // Mutation it catches: scoping limited to the outer wrapper id and
    // leaving headingId / descriptionId unscoped — the homepage render
    // would still emit `service-${id}-title` / `service-${id}-desc`
    // and the disjoint-set assertion fails. Also catches: dropping the
    // consumer prefix from any of the three; renaming the homepage
    // prefix; or inverting which consumer carries the prefix.
    // Mutation it does NOT catch: a future fourth id added to the
    // subtree and forgotten — the assertion is closed over today's
    // three ids.
    const catalogDoc = await render(fixtureService);
    const homepageDoc = await render(fixtureService, 'homepage');

    const collectIds = (doc: Document): readonly string[] =>
      Array.from(doc.querySelectorAll<HTMLElement>('[id]'))
        .map((el) => el.id)
        .filter((id) => id.startsWith('service-'));

    const catalogIds = collectIds(catalogDoc);
    const homepageIds = collectIds(homepageDoc);

    expect(new Set(catalogIds)).toEqual(
      new Set([
        `service-${fixtureService.id}`,
        `service-${fixtureService.id}-title`,
        `service-${fixtureService.id}-desc`,
      ]),
    );
    expect(new Set(homepageIds)).toEqual(
      new Set([
        `service-homepage-${fixtureService.id}`,
        `service-homepage-${fixtureService.id}-title`,
        `service-homepage-${fixtureService.id}-desc`,
      ]),
    );

    const overlap = catalogIds.filter((id) => homepageIds.includes(id));
    expect(overlap).toEqual([]);
  });

  it('eligible card has three interactive children in DOM source order with no tabindex overrides', async () => {
    // Mutation it catches: a `tabindex` attribute accidentally added to
    // any of the three interactive children that would override DOM
    // source order; or a structural reorder that drops one of the
    // three (interactive count !== 3). This is the empirical landing
    // of the runtime-a11y trace the architect did by hand —
    // `feedback_phase2_open_assumption_validation` binds the
    // falsification as a contract, not a formality.
    // Mutation it does NOT catch: visual order changes via CSS (e.g.,
    // `order: 2`) that do not touch DOM source order — visual-order
    // regressions are a separate concern from tab-order regressions.
    const doc = await render();
    const interactive = Array.from(doc.querySelectorAll<HTMLElement>('a, button'));

    expect(interactive).toHaveLength(3);
    for (const el of interactive) {
      expect(el.hasAttribute('tabindex')).toBe(false);
    }
  });
});
