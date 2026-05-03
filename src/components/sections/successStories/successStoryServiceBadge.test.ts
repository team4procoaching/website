// This file imports jsdom as a library (`new JSDOM(html)`) rather than
// switching the test environment to jsdom via Vitest's environment pragma.
// The pragma route conflicts with the Astro Container API's esbuild-init
// invariant on the current Vitest/Node/Astro/esbuild combo; the
// JSDOM-instance route sidesteps the realm clash. See ADR-0037
// §Conventions for the full chain.
import { JSDOM } from 'jsdom';
import { describe, expect, it, vi } from 'vitest';
import { routes } from '~/data/routes';
import type { Service } from '~/data/services';
import { assertNotNull } from '~/test-utils/assertions';
import { buildServiceFixture } from '~/test-utils/fixtures';
import { renderAstro } from '~/test-utils/renderAstro';
import SuccessStoryServiceBadge from './SuccessStoryServiceBadge.astro';

// Sentinel-mock the route helper so the eligible-branch assertion fails on
// a regression that hardcodes the path string. With the real helper, the
// badge href and any literal `${routes.services}/${id}` would be byte-
// identical and would not trip a string-equality assertion. Replacing the
// helper with a sentinel string severs the byte-identity escape route. The
// pattern mirrors `serviceCard.test.ts:26-29`.
vi.mock('~/data/services', async () => {
  const actual = await vi.importActual<typeof import('~/data/services')>('~/data/services');
  return { ...actual, serviceDetailHref: () => '__DETAIL_HREF_SENTINEL__' };
});

const eligibleService = buildServiceFixture();

/**
 * Non-eligible service fixture — only the required `Service` fields, none
 * of the optional detail-page fields. `hasCompleteDetailContent` returns
 * false, so the badge href falls back to `service.contactHref`.
 */
const nonEligibleService: Service = {
  id: 'get-lean',
  name: 'Get Lean',
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
  contactHref: `${routes.contact}?service=get-lean`,
};

function parse(html: string): Document {
  return new JSDOM(html).window.document;
}

describe('SuccessStoryServiceBadge (component layer)', () => {
  it('routes to the service detail page when the service has complete detail content', async () => {
    const doc = parse(
      await renderAstro(SuccessStoryServiceBadge, { props: { service: eligibleService } }),
    );
    const link = doc.querySelector<HTMLAnchorElement>('a');
    assertNotNull(link);
    expect(link.getAttribute('href')).toBe('__DETAIL_HREF_SENTINEL__');
  });

  it('routes to the contact prefill when the service has no detail content', async () => {
    const doc = parse(
      await renderAstro(SuccessStoryServiceBadge, { props: { service: nonEligibleService } }),
    );
    const link = doc.querySelector<HTMLAnchorElement>('a');
    assertNotNull(link);
    expect(link.getAttribute('href')).toBe(nonEligibleService.contactHref);
  });

  it('exposes a destination-specific aria-label keyed on the service name', async () => {
    const doc = parse(
      await renderAstro(SuccessStoryServiceBadge, { props: { service: nonEligibleService } }),
    );
    const link = doc.querySelector<HTMLAnchorElement>('a');
    assertNotNull(link);
    expect(link.getAttribute('aria-label')).toBe('Read more about Get Lean coaching');
  });

  it('renders the service name as visible text and hides the chevron from screen readers', async () => {
    const doc = parse(
      await renderAstro(SuccessStoryServiceBadge, { props: { service: nonEligibleService } }),
    );
    const link = doc.querySelector<HTMLAnchorElement>('a');
    assertNotNull(link);
    expect(link.textContent).toContain('Get Lean');

    const chevron = link.querySelector<HTMLSpanElement>('span[aria-hidden="true"]');
    assertNotNull(chevron);
    expect(chevron.textContent).toBe('›');
  });
});
