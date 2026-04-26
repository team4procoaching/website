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
import { testimonials } from '~/data/testimonials';
import { renderAstro } from '~/test-utils/renderAstro';
import ServiceSocialProof from './ServiceSocialProof.astro';

/**
 * Detail-eligible service fixture without `testimonialIds` — the launch-
 * gate-fail path the requirements doc explicitly calls out (services with
 * no curated quotes, e.g. `competition-prep` at launch).
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

function parse(html: string): Document {
  return new JSDOM(html).window.document;
}

async function render(
  service: ServiceWithCompleteDetailContent = fixtureService,
): Promise<Document> {
  const html = await renderAstro(ServiceSocialProof, { props: { service } });
  return parse(html);
}

describe('ServiceSocialProof (component layer)', () => {
  it('renders nothing when testimonialIds is unset', async () => {
    // The launch-gate-fail path: services without curated quotes omit the
    // entire section gracefully. No section landmark, no heading — the
    // component returns null. This is the highest-value assertion for
    // this component.
    const doc = await render();
    expect(doc.querySelector('section')).toBeNull();
  });

  it('renders nothing when testimonialIds is an empty array', async () => {
    // Empty array is the same launch-gate-fail signal as `undefined` — the
    // resolver collapses both into "no resolved testimonials" and the
    // component renders nothing.
    const doc = await render({ ...fixtureService, testimonialIds: [] });
    expect(doc.querySelector('section')).toBeNull();
  });

  it('renders nothing when no testimonialIds resolve to a known testimonial', async () => {
    // Defensive resolver contract: typo'd or stale IDs are silently dropped
    // and treated as the launch-gate-fail path. This is the reason the
    // resolver lives in the component (Decision 5 of the concept doc) —
    // `~/data/testimonials` is still string-keyed and TypeScript cannot
    // catch unknown IDs at compile time.
    const doc = await render({
      ...fixtureService,
      testimonialIds: ['no-such-testimonial', 'also-missing'],
    });
    expect(doc.querySelector('section')).toBeNull();
  });

  it('renders one card per resolved testimonial when at least one ID resolves', async () => {
    // Positive path: existing IDs from `~/data/testimonials` resolve and
    // each renders as a `<figure>` (the TestimonialCard root). Two known
    // IDs → two figures. The launch-gate predicate does not require a
    // minimum count for `testimonialIds`; the component is responsible
    // for the gate, not the predicate.
    const knownIds = [testimonials[0].id, testimonials[1].id];
    const doc = await render({ ...fixtureService, testimonialIds: knownIds });
    expect(doc.querySelectorAll('figure')).toHaveLength(knownIds.length);
  });
});
