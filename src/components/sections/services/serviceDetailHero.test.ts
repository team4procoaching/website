// This file imports jsdom as a library (`new JSDOM(html)`) rather than
// switching the test environment to jsdom via Vitest's environment pragma.
// The pragma route conflicts with the Astro Container API's esbuild-init
// invariant on the current Vitest/Node/Astro/esbuild combo; the
// JSDOM-instance route sidesteps the realm clash. See ADR-0037
// §Conventions and the PR-body deviation note for the full chain.
import { JSDOM } from 'jsdom';
import { describe, expect, it } from 'vitest';
import { MODAL_IDS } from '~/data/ids';
import { routes } from '~/data/routes';
import type { ServiceWithCompleteDetailContent } from '~/data/services';
import { renderAstro } from '~/test-utils/renderAstro';
import ServiceDetailHero from './ServiceDetailHero.astro';

/**
 * Detail-eligible service fixture with a monthly tier carrying a
 * `minimum` note and two non-monthly tiers without notes — the catalogue
 * shape `competition-prep` ships once stub content lands.
 */
const fixtureService: ServiceWithCompleteDetailContent = {
  id: 'competition-prep',
  name: 'Competition Prep',
  tagline: 'Peaking Perfectly, Safely, and Victoriously.',
  description: 'Test description',
  category: 'bodybuilding',
  pricing: [
    {
      period: 'monthly',
      price: '$299',
      suffix: '/month',
      note: '3 month minimum',
      amount: 299,
      currency: 'USD',
    },
    {
      period: 'six-months',
      price: '$1,599',
      suffix: 'one-time',
      amount: 1599,
      currency: 'USD',
    },
    {
      period: 'twelve-months',
      price: '$2,899',
      suffix: 'one-time',
      amount: 2899,
      currency: 'USD',
    },
  ],
  features: ['feature one'],
  contactHref: `${routes.contact}?service=competition-prep`,
  lead: 'A non-empty lead paragraph for the hero.',
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
  categoryLabel = 'Bodybuilding',
): Promise<Document> {
  const html = await renderAstro(ServiceDetailHero, {
    props: { service, categoryLabel },
  });
  return parse(html);
}

describe('ServiceDetailHero (component layer)', () => {
  it('renders exactly two orientation chips and no `format` chip', async () => {
    // The launch contract is "two chips for launch — Ab-Preis +
    // Min-Commitment, no `format` chip" (requirements §3, concept
    // Decision 5). A regression that adds a third chip is exactly the
    // silent drift this test catches; counting via `bg-teal-100` matches
    // the pattern shared with `SuccessStoryHero` chips.
    const doc = await render();
    const chips = doc.querySelectorAll('span.bg-teal-100');
    expect(chips).toHaveLength(2);
  });

  it('renders only the starting-from chip when no pricing.note contains "minimum"', async () => {
    // Min-Commitment chip is omitted when no note matches — explicit
    // launch-gate-fail path per requirements §3.
    const doc = await render({
      ...fixtureService,
      pricing: fixtureService.pricing.map(({ note: _note, ...rest }) => rest),
    });
    const chips = doc.querySelectorAll('span.bg-teal-100');
    expect(chips).toHaveLength(1);
    expect(chips[0]?.textContent?.trim()).toBe('From $299');
  });

  it('primary CTA carries the literal label "Apply to Work Together" and points at service.contactHref', async () => {
    // Decision 2 contract — convention compliance. Wording change here is
    // intentional and would re-open the Conversion-Reviewer pick.
    const doc = await render();
    const primary = doc.querySelector<HTMLAnchorElement>(`a[href="${fixtureService.contactHref}"]`);
    if (primary === null) throw new Error('primary CTA anchor not found');
    expect(primary.textContent?.trim()).toBe('Apply to Work Together');
  });

  it('secondary CTA is a quiz-modal trigger labelled "Find Your Fit"', async () => {
    // CONVENTIONS.md §CTA Copy + ADR-0027 (Invokers API) — both contracts
    // are external, not template details: the button must carry
    // `command="show-modal"` and `commandfor={MODAL_IDS.quiz}` for the
    // page-mounted `<QuizModal />` to receive the open-trigger.
    const doc = await render();
    const secondary = doc.querySelector<HTMLButtonElement>(
      `button[commandfor="${MODAL_IDS.quiz}"]`,
    );
    if (secondary === null) throw new Error('secondary CTA button not found');
    expect(secondary.getAttribute('command')).toBe('show-modal');
    expect(secondary.textContent?.trim()).toBe('Find Your Fit');
  });

  it('renders one <p> per `\\n\\n`-separated paragraph in service.lead', async () => {
    // The catalogue's `lead` strings carry `\n\n` paragraph separators
    // (PDF copy is 2–3 paragraphs per service). HTML collapses `\n\n` to
    // a single whitespace token inside one `<p>`, so a non-splitting
    // renderer would emit one wall-of-text paragraph regardless of
    // authorial intent. The hero splits on `\n\n` and emits one `<p>`
    // per paragraph; this test pins that contract. Mutation pair:
    // silently dropping the `.split('\n\n').map(...)` collapses the
    // count from 3 to 1 and fails this assertion.
    const multiParagraphLead =
      'First paragraph framing the service.\n\nSecond paragraph expanding on the deliverables.\n\nThird paragraph closing the framing.';
    const doc = await render({ ...fixtureService, lead: multiParagraphLead });
    const leadParagraphs = Array.from(doc.querySelectorAll('p')).filter((p) =>
      p.className.includes('text-base/7'),
    );
    expect(leadParagraphs).toHaveLength(3);
    expect(leadParagraphs.map((p) => p.textContent?.trim())).toEqual([
      'First paragraph framing the service.',
      'Second paragraph expanding on the deliverables.',
      'Third paragraph closing the framing.',
    ]);
  });
});
