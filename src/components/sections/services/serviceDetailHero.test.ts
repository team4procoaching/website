// This file imports jsdom as a library (`new JSDOM(html)`) rather than
// switching the test environment to jsdom via Vitest's environment pragma.
// The pragma route conflicts with the Astro Container API's esbuild-init
// invariant on the current Vitest/Node/Astro/esbuild combo; the
// JSDOM-instance route sidesteps the realm clash. See ADR-0037
// §Conventions and the PR-body deviation note for the full chain.
import { JSDOM } from 'jsdom';
import { describe, expect, it } from 'vitest';
import { MODAL_IDS } from '~/data/ids';
import type { PricingOption, ServiceWithCompleteDetailContent } from '~/data/services';
import { buildServiceFixture } from '~/test-utils/fixtures';
import { renderAstro } from '~/test-utils/renderAstro';
import ServiceDetailHero from './ServiceDetailHero.astro';

/**
 * Detail-eligible service fixture with a monthly tier carrying a
 * `minimum` note and two non-monthly tiers without notes — the catalogue
 * shape `competition-prep` ships once stub content lands. The strip-notes
 * test exercises multi-tier pricing, so the tier count is load-bearing:
 * the builder default's pricing would still apply but the explicit
 * tuple below pins the shape against unrelated builder changes.
 *
 * `fixturePricing` is held in a local of explicit `readonly [P, P, P]` shape
 * because `Service.pricing` is typed per the discriminated union (ADR-0047)
 * and the union widens on indexing — keeping the narrow tuple available
 * here lets the strip-notes test reconstruct a 3-tuple without re-asserting
 * the shape inside the test body.
 */
const fixturePricing: readonly [PricingOption, PricingOption, PricingOption] = [
  {
    period: 'monthly',
    price: '€299',
    suffix: '/month',
    note: '3 month minimum',
    amount: 299,
    currency: 'EUR',
  },
  {
    period: 'six-months',
    price: '€1,599',
    suffix: 'one-time',
    amount: 1599,
    currency: 'EUR',
  },
  {
    period: 'twelve-months',
    price: '€2,899',
    suffix: 'one-time',
    amount: 2899,
    currency: 'EUR',
  },
];

const fixtureService = buildServiceFixture({
  tagline: 'Peaking Perfectly, Safely, and Victoriously.',
  pricing: fixturePricing,
  lead: 'A non-empty lead paragraph for the hero.',
});

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
    // launch-gate-fail path per requirements §3. Each entry is rebuilt
    // from `fixturePricing` (rather than `service.pricing.map(...)`) because
    // the `SubscriptionService` arm of the union types `pricing` as a
    // 3-tuple, and `Array.prototype.map` widens the result back to
    // `PricingOption[]` — the tuple shape is preserved by literal
    // construction off the locally-typed `fixturePricing`.
    const stripNote = ({ note: _note, ...rest }: PricingOption): PricingOption => rest;
    const noteFreePricing: readonly [PricingOption, PricingOption, PricingOption] = [
      stripNote(fixturePricing[0]),
      stripNote(fixturePricing[1]),
      stripNote(fixturePricing[2]),
    ];
    const doc = await render({
      ...fixtureService,
      pricingModel: 'subscription',
      pricing: noteFreePricing,
    });
    const chips = doc.querySelectorAll('span.bg-teal-100');
    expect(chips).toHaveLength(1);
    expect(chips[0]?.textContent?.trim()).toBe('From €299');
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
});
