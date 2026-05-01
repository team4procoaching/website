// This file imports jsdom as a library (`new JSDOM(html)`) rather than
// switching the test environment to jsdom via Vitest's environment pragma.
// The pragma route conflicts with the Astro Container API's esbuild-init
// invariant on the current Vitest/Node/Astro/esbuild combo; the
// JSDOM-instance route sidesteps the realm clash. See ADR-0037
// §Conventions and the PR-body deviation note for the full chain.
import { JSDOM } from 'jsdom';
import { describe, expect, it } from 'vitest';
import { routes } from '~/data/routes';
import type { ServiceWithCompleteDetailContent } from '~/data/services';
import { renderAstro } from '~/test-utils/renderAstro';
import ServiceWhoIsFor from './ServiceWhoIsFor.astro';

/**
 * Detail-eligible service fixture sized at the launch-gate minimum
 * (`fitFor.length >= 3`) so the count-based assertion exercises the
 * threshold the predicate guarantees.
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
      price: '$299',
      suffix: '/month',
      amount: 299,
      currency: 'USD',
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
  faq: [
    { question: 'Q1', answer: 'A1' },
    { question: 'Q2', answer: 'A2' },
    { question: 'Q3', answer: 'A3' },
  ],
};

function parse(html: string): Document {
  return new JSDOM(html).window.document;
}

async function render(
  service: ServiceWithCompleteDetailContent = fixtureService,
): Promise<Document> {
  const html = await renderAstro(ServiceWhoIsFor, { props: { service } });
  return parse(html);
}

describe('ServiceWhoIsFor (component layer)', () => {
  it('renders one list item per fitFor entry', async () => {
    // Count-based, not text-based — wording changes across services without
    // breaking the test, while a regression that drops or duplicates an
    // entry trips immediately. The launch-gate predicate guarantees
    // `fitFor.length >= 3`, so the section can rely on the array being
    // populated.
    const doc = await render();
    const lists = doc.querySelectorAll('ul');
    expect(lists[0]?.querySelectorAll('li')).toHaveLength(fixtureService.fitFor.length);
  });

  it('renders the fit list within a single section landmark', async () => {
    // The section is a single landmark (`<section aria-labelledby>`) with
    // one `<h3>` column inside. A regression that re-introduces a second
    // column or splits the section would trip immediately.
    const doc = await render();
    expect(doc.querySelectorAll('section')).toHaveLength(1);
    expect(doc.querySelectorAll('h3')).toHaveLength(1);
  });
});
