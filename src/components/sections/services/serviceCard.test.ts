// This file imports jsdom as a library (`new JSDOM(html)`) rather than
// switching the test environment to jsdom via Vitest's environment pragma.
// The pragma route conflicts with the Astro Container API's esbuild-init
// invariant on the current Vitest/Node/Astro/esbuild combo; the
// JSDOM-instance route sidesteps the realm clash. See ADR-0037
// §Conventions and the PR-body deviation note for the full chain.
import { JSDOM } from 'jsdom';
import { describe, expect, it, vi } from 'vitest';
import { routes } from '~/data/routes';
import type { Service } from '~/data/services';
import { buildServiceFixture } from '~/test-utils/fixtures';
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

const fixtureService = buildServiceFixture();

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
  pricingModel: 'subscription',
  pricing: [
    {
      period: 'monthly',
      price: '€99',
      suffix: '/month',
      amount: 99,
      currency: 'EUR',
    },
    {
      period: 'six-months',
      price: '€549',
      suffix: 'one-time',
      amount: 549,
      currency: 'EUR',
    },
    {
      period: 'twelve-months',
      price: '€999',
      suffix: 'one-time',
      amount: 999,
      currency: 'EUR',
    },
  ],
  features: ['feature one'],
  contactHref: `${routes.contact}?service=busy`,
};

function parse(html: string): Document {
  return new JSDOM(html).window.document;
}

function findInteractiveAnchors(doc: Document): {
  surface: HTMLAnchorElement;
  primary: HTMLAnchorElement;
  escapeAnchor: HTMLAnchorElement;
} {
  const anchors = Array.from(doc.querySelectorAll<HTMLAnchorElement>('a'));

  const surface = anchors.find((a) => a.firstElementChild?.classList.contains('absolute'));
  if (surface === undefined) throw new Error('surface anchor not found');

  const primary = anchors.find(
    (a) =>
      !a.firstElementChild?.classList.contains('absolute') &&
      a.getAttribute('class')?.includes('w-full'),
  );
  if (primary === undefined) throw new Error('primary button anchor not found');

  const escapeAnchor = anchors.find((a) => a.textContent?.trim() === 'Skip ahead — contact us');
  if (escapeAnchor === undefined) throw new Error('escape anchor not found');

  return { surface, primary, escapeAnchor };
}

async function render(
  service: Service = fixtureService,
  consumer?: 'catalog' | 'homepage',
): Promise<Document> {
  // When the caller does not pass `consumer`, the helper omits the
  // prop from the props object entirely — mirroring the catalog call
  // site `<ServiceCard service={service} />` in `ServicesCatalog.astro`.
  // This exercises the absent-prop default-value path on the JSX call
  // shape, which is semantically distinct from passing
  // `consumer: undefined` explicitly. The branch stays.
  const html = await renderAstro(ServiceCard, {
    props: consumer === undefined ? { service } : { service, consumer },
  });
  return parse(html);
}

describe('ServiceCard (component layer)', () => {
  it('eligible card emits surface, primary button, and escape anchors with the right hrefs', async () => {
    // Mutation pair A (catches via surface-anchor selector): the surface
    // anchor's href is mutated from `serviceDetailHref(service.id)` to
    // `service.contactHref`. The structural surface selector locates the
    // same element regardless of href; the assertion fails because the
    // sentinel is replaced by `fixtureService.contactHref`. The primary-
    // button assertion still passes; the surface assertion catches.
    // Mutation pair B (catches via primary-button selector): the primary
    // button's href is mutated from `serviceDetailHref(service.id)` to
    // `service.contactHref`. The selector keys on `w-full` and the
    // absence of a stretched-link first child; the sentinel assertion
    // fails. The surface assertion still passes; the primary-button
    // assertion catches. Both selectors locate distinct elements via
    // mutually-exclusive structural markers, so first-match ordering
    // plays no role.
    // Mutation it does NOT catch: predicate flipped (eligible service
    // rendered as non-eligible) — covered by Case 2.
    const doc = await render();
    const { surface, primary, escapeAnchor } = findInteractiveAnchors(doc);

    expect(surface.getAttribute('href')).toBe('__DETAIL_HREF_SENTINEL__');
    expect(primary.getAttribute('href')).toBe('__DETAIL_HREF_SENTINEL__');
    expect(escapeAnchor.getAttribute('href')).toBe(fixtureService.contactHref);
  });

  it('non-eligible card emits two anchors both pointing at contactHref', async () => {
    // Mutation it catches: predicate flipped (a non-eligible service
    // renders the eligible footer) — the anchor count goes to three and
    // one of them carries the sentinel href. Either tripwire fails an
    // assertion below.
    // Mutation it does NOT catch: href construction on either anchor of
    // the eligible branch — covered by Case 1.
    const doc = await render(fixtureServiceWithoutDetail);
    const anchors = Array.from(doc.querySelectorAll<HTMLAnchorElement>('a'));

    expect(anchors).toHaveLength(2);
    for (const anchor of anchors) {
      expect(anchor.getAttribute('href')).toBe(fixtureServiceWithoutDetail.contactHref);
    }
  });

  it('eligible card carries matching aria-labels on surface + primary button and an aria-hidden chevron', async () => {
    // Mutation it catches: dropping or mis-spelling the aria-label on
    // either the surface anchor or the primary button (screen-reader
    // users on an eligible card would hear unscoped "Read Details" or
    // bare service-name announcements without destination context); the
    // chevron span missing or its aria-hidden attribute removed (screen
    // readers announce "right pointing arrow" after the button label).
    // Mutation it does NOT catch: visual position of the primary button
    // in the footer (covered indirectly by selector pinning in Case 1
    // and explicit DOM-order pinning in Case 5); chevron rendered as a
    // Unicode glyph in the text content with no span — the absence of
    // an aria-hidden span fails the chevron assertion, so this mutation
    // IS caught. Truly out of scope: visual styling of the chevron
    // (font, colour).
    const doc = await render();
    const { surface, primary } = findInteractiveAnchors(doc);

    const expectedAriaLabel = `Read details about ${fixtureService.name}`;
    expect(surface.getAttribute('aria-label')).toBe(expectedAriaLabel);
    expect(primary.getAttribute('aria-label')).toBe(expectedAriaLabel);

    const chevron = primary.querySelector('span[aria-hidden="true"]');
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
    // Mutation it catches: any `tabindex` attribute on the three
    // interactive children that would override DOM source order; a
    // structural reorder of the JSX (surface, primary, escape are pinned
    // by their structural markers in DOM source order); a structural
    // reorder that drops one of the three (interactive count !== 3).
    // This is the empirical landing of the runtime-a11y trace —
    // `feedback_phase2_open_assumption_validation` binds the
    // falsification as a contract, not a formality.
    // Mutation it does NOT catch: CSS visual-order changes (e.g.,
    // `order: 2` on a flex child) that do not touch DOM source order —
    // visual-order regressions are a separate concern from tab-order
    // regressions.
    const doc = await render();
    const interactive = Array.from(doc.querySelectorAll<HTMLElement>('a, button'));

    expect(interactive).toHaveLength(3);
    for (const el of interactive) {
      expect(el.hasAttribute('tabindex')).toBe(false);
    }

    // Order contract: surface anchor (stretched-link wrapper, first
    // child is `<span class="absolute ...">`), primary button anchor
    // (rendered by `<Button>` as `<a>`, class attribute contains
    // `w-full`, no stretched-link first child), escape anchor (visible
    // text `Skip ahead — contact us`). Distinguished by stable
    // structural markers so a JSX-level reorder fails one of the three
    // checks.
    const [surfaceEl, primaryEl, escapeEl] = interactive;
    expect(surfaceEl?.firstElementChild?.classList.contains('absolute')).toBe(true);
    expect(primaryEl?.getAttribute('class')?.includes('w-full')).toBe(true);
    expect(primaryEl?.firstElementChild?.classList.contains('absolute')).toBe(false);
    expect(escapeEl?.textContent?.trim()).toBe('Skip ahead — contact us');
  });

  it('eligible card escape link points at contactHref with the right aria-label', async () => {
    // Mutation it catches: wiring the escape link to a hardcoded
    // `/contact` literal instead of `service.contactHref` (the
    // per-service query parameter is dropped) — assertion fails on href
    // equality. Also catches: missing aria-label, mis-spelled
    // aria-label, escape-link element missing entirely.
    // Mutation it does NOT catch: visual placement of the escape link
    // above the primary button — Case 5's DOM-order assertion catches
    // that.
    const doc = await render();
    const escapeAnchor = Array.from(doc.querySelectorAll<HTMLAnchorElement>('a')).find(
      (a) => a.textContent?.trim() === 'Skip ahead — contact us',
    );
    if (escapeAnchor === undefined) throw new Error('escape anchor not found');

    expect(escapeAnchor.getAttribute('href')).toBe(fixtureService.contactHref);
    expect(escapeAnchor.getAttribute('aria-label')).toBe(`Contact us about ${fixtureService.name}`);
  });
});
