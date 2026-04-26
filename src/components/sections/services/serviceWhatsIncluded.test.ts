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
import ServiceWhatsIncluded from './ServiceWhatsIncluded.astro';

/**
 * Detail-eligible service fixture sized at the launch-gate minimum
 * (`detailedFeatures.length >= 3`) so count-based assertions exercise the
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
    { title: 'Periodization', description: 'Description for periodization.' },
    { title: 'Peak week', description: 'Description for peak week.' },
    { title: 'Posing', description: 'Description for posing.' },
  ],
  fitFor: ['fit one', 'fit two', 'fit three'],
  notFitFor: ['not fit one', 'not fit two'],
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
  const html = await renderAstro(ServiceWhatsIncluded, { props: { service } });
  return parse(html);
}

describe('ServiceWhatsIncluded (component layer)', () => {
  it('renders one term/definition pair per detailedFeatures entry', async () => {
    // Count-based: regressions that drop or duplicate an entry trip
    // immediately, while copy revisions are free. Each `detailedFeatures`
    // entry maps to exactly one `<dt>` and one `<dd>`.
    const doc = await render();
    expect(doc.querySelectorAll('dt')).toHaveLength(fixtureService.detailedFeatures.length);
    expect(doc.querySelectorAll('dd')).toHaveLength(fixtureService.detailedFeatures.length);
  });

  it('renders both title and description for each feature', async () => {
    // The `Service.detailedFeatures` type guarantees `title` and
    // `description` are both populated. Pulling the first entry's text
    // confirms the component reads both fields — a regression that
    // forgets one would silently produce an empty `<dt>` or `<dd>`.
    const doc = await render();
    const firstFeature = fixtureService.detailedFeatures[0];
    expect(doc.querySelector('dt')?.textContent?.trim()).toBe(firstFeature.title);
    expect(doc.querySelector('dd')?.textContent?.trim()).toBe(firstFeature.description);
  });

  it('uses a description list (`<dl>`) as the semantic container', async () => {
    // The grid is a definition list, not a generic `<div>` grid — title +
    // description is term + definition semantically. A regression to
    // `<div>`/`<p>` would lose that semantics for assistive tech.
    const doc = await render();
    expect(doc.querySelectorAll('dl')).toHaveLength(1);
  });
});
