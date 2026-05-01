// This file imports jsdom as a library (`new JSDOM(html)`) rather than
// switching the test environment to jsdom via Vitest's environment pragma.
// The pragma route conflicts with the Astro Container API's esbuild-init
// invariant on the current Vitest/Node/Astro/esbuild combo; the
// JSDOM-instance route sidesteps the realm clash. See ADR-0037
// §Conventions and the PR-body deviation note for the full chain.
import { JSDOM } from 'jsdom';
import { describe, expect, it } from 'vitest';
import { MODAL_IDS } from '~/data/ids';
import type { ServiceWithCompleteDetailContent } from '~/data/services';
import { buildServiceFixture } from '~/test-utils/fixtures';
import { renderAstro } from '~/test-utils/renderAstro';
import ServicePricingBlock from './ServicePricingBlock.astro';

/**
 * Detail-eligible service fixture with all three billing periods so the
 * SegmentedControl invariant ("three pricing rows visible by default")
 * exercises the production catalogue shape. The builder default's
 * single-tier pricing would not exercise that invariant — the override
 * is the contract.
 */
const fixtureService = buildServiceFixture({
  pricing: [
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
  ],
});

function parse(html: string): Document {
  return new JSDOM(html).window.document;
}

async function render(
  service: ServiceWithCompleteDetailContent = fixtureService,
): Promise<Document> {
  const html = await renderAstro(ServicePricingBlock, { props: { service } });
  return parse(html);
}

describe('ServicePricingBlock (component layer)', () => {
  it('renders one pricing row per pricing entry', async () => {
    // SegmentedControl invariant: every billing period is rendered into
    // the DOM and CSS `:has()` toggles visibility — there is no JS-driven
    // mount/unmount. A regression that conditionally renders rows would
    // break the no-script footprint contract (Decision 8). With three
    // periods in the catalogue today, the block renders three rows.
    const doc = await render();
    const list = doc.querySelector('ul');
    expect(list?.querySelectorAll('li')).toHaveLength(fixtureService.pricing.length);
  });

  it('embedded primary CTA matches the Hero label "Apply to Work Together" and points at service.contactHref', async () => {
    // Cross-section consistency contract: the Pricing block's primary CTA
    // must mirror the Hero's primary CTA exactly — Decision 2 of the
    // concept doc treats the two CTAs as one converging action, not two
    // independent label decisions. A drift here re-opens the
    // Conversion-Reviewer pick.
    const doc = await render();
    const primary = doc.querySelector<HTMLAnchorElement>(`a[href="${fixtureService.contactHref}"]`);
    if (primary === null) throw new Error('primary CTA anchor not found');
    expect(primary.textContent?.trim()).toBe('Apply to Work Together');
  });

  it('tertiary inline trigger uses the Invokers API and renders "Find your fit"', async () => {
    // ADR-0027 (Invokers API) + CONVENTIONS.md §CTA Copy. Sentence case is
    // intentional on the inline TextLink-shaped trigger — the Hero button
    // form ("Find Your Fit") and this inline form ("Find your fit")
    // diverge by design. The button must carry `command="show-modal"` and
    // `commandfor={MODAL_IDS.quiz}` for the page-mounted `<QuizModal />`
    // to receive the open-trigger.
    const doc = await render();
    const tertiary = doc.querySelector<HTMLButtonElement>(`button[commandfor="${MODAL_IDS.quiz}"]`);
    if (tertiary === null) throw new Error('tertiary trigger button not found');
    expect(tertiary.getAttribute('command')).toBe('show-modal');
    expect(tertiary.textContent?.trim().startsWith('Find your fit')).toBe(true);
  });
});
