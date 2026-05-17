// This file imports jsdom as a library (`new JSDOM(html)`) rather than
// switching the test environment to jsdom via Vitest's environment pragma.
// The pragma route conflicts with the Astro Container API's esbuild-init
// invariant on the current Vitest/Node/Astro/esbuild combo; the
// JSDOM-instance route sidesteps the realm clash. See ADR-0037
// §Conventions and the PR-body deviation note for the full chain.
import { JSDOM } from 'jsdom';
import { describe, expect, it } from 'vitest';
import { routes } from '~/data/routes';
import type { SessionServiceWithCompleteDetailContent } from '~/data/services';
import { renderAstro } from '~/test-utils/renderAstro';
import PosingConfigurator from './PosingConfigurator.astro';

/**
 * Inline session-service fixture narrowed to the launch-gate shape
 * (`SessionServiceWithCompleteDetailContent`). Mirrors the
 * `fixtureSessionService` pattern in `serviceCard.test.ts` because the
 * shared `buildServiceFixture` helper is pinned to the subscription arm
 * of the `Service` union — threading a session variant through it would
 * widen `pricingModel` and break the discriminator narrowing on this
 * component's Props.
 *
 * Shape matches the production Posing entry: 6 packages (3 sizes × 2
 * durations), 3 descriptions, `recommendedPackageSize: 5`.
 */
const fixtureSessionService: SessionServiceWithCompleteDetailContent = {
  id: 'posing',
  name: 'Posing & Stage Presence',
  tagline: 'Own the Stage.',
  description: 'Test description',
  category: 'bodybuilding',
  pricingModel: 'session',
  pricing: [
    {
      period: 'monthly',
      price: '€149',
      suffix: '/session',
      amount: 149,
      currency: 'EUR',
    },
  ],
  configuration: {
    sessionCounts: [1, 5, 10],
    durations: [30, 60],
  },
  features: ['feature one'],
  contactHref: `${routes.contact}?service=posing`,
  lead: 'Test lead paragraph for the session-arm configurator fixture.',
  packages: [
    { duration: 30, sessionCount: 1, price: '€149', amount: 149, currency: 'EUR' },
    { duration: 60, sessionCount: 1, price: '€249', amount: 249, currency: 'EUR' },
    { duration: 30, sessionCount: 5, price: '€699', amount: 699, currency: 'EUR' },
    { duration: 60, sessionCount: 5, price: '€1,149', amount: 1149, currency: 'EUR' },
    { duration: 30, sessionCount: 10, price: '€1,299', amount: 1299, currency: 'EUR' },
    { duration: 60, sessionCount: 10, price: '€2,149', amount: 2149, currency: 'EUR' },
  ],
  descriptions: [
    { packageSize: 1, text: 'One-session description.' },
    { packageSize: 5, text: 'Five-session description.' },
    { packageSize: 10, text: 'Ten-session description.' },
  ],
  recommendedPackageSize: 5,
};

function parse(html: string): Document {
  return new JSDOM(html).window.document;
}

async function render(
  service: SessionServiceWithCompleteDetailContent = fixtureSessionService,
): Promise<Document> {
  const html = await renderAstro(PosingConfigurator, { props: { service } });
  return parse(html);
}

describe('PosingConfigurator (component layer)', () => {
  it('renders the section heading "Choose your package"', async () => {
    // Owner Q13 decision: the section heading is "Choose your package".
    // A regression that drifts the copy (e.g., to "Pricing" or "Packages")
    // re-opens the conversion review that already settled this wording.
    const doc = await render();
    const heading = doc.querySelector('h2');
    expect(heading?.textContent?.trim()).toBe('Choose your package');
  });

  it('renders the "Session length" toggle caption', async () => {
    // Owner Q12 decision: the duration toggle carries a small muted
    // caption above it ("Session length") so the axis is self-evident.
    // The subscription-arm billing-period toggle ships without a caption
    // (period names like "Monthly" are self-evident); the duration axis
    // is not, hence the deliberate divergence captured here.
    const doc = await render();
    const captions = Array.from(doc.querySelectorAll('p')).map((p) => p.textContent?.trim());
    expect(captions).toContain('Session length');
  });

  it('renders both duration radio inputs with value=60 checked by default', async () => {
    // The SegmentedControl ships two radio inputs (`name="duration"`),
    // with `value="60"` preselected per the owner-decided default
    // (60-minute single session is the most-common-starting-point).
    const doc = await render();
    const thirty = doc.querySelector<HTMLInputElement>('input[name="duration"][value="30"]');
    const sixty = doc.querySelector<HTMLInputElement>('input[name="duration"][value="60"]');
    if (thirty === null) throw new Error('30-min radio input not found');
    if (sixty === null) throw new Error('60-min radio input not found');
    expect(sixty.hasAttribute('checked')).toBe(true);
    expect(thirty.hasAttribute('checked')).toBe(false);
  });

  it('renders three package cards (one per session-count)', async () => {
    // The configurator emits exactly three cards — one per
    // `recommendedPackageSize ∈ sessionCounts` slot. Each card's <h3>
    // carries the `sessionLabel` PackageCard emits ("1 session",
    // "5 sessions", "10 sessions").
    const doc = await render();
    const headings = Array.from(doc.querySelectorAll('h3')).map((h) => h.textContent?.trim());
    expect(headings).toContain('1 session');
    expect(headings).toContain('5 sessions');
    expect(headings).toContain('10 sessions');
  });

  it('wraps the cards in a `group/tiers` container so the CSS-only toggle drives visibility', async () => {
    // The `group/tiers` class is the CSS hinge that lets the
    // SegmentedControl drive `group-not-has-[…]:hidden` on each card's
    // per-duration sub-blocks. A regression that drops it (e.g.,
    // renaming the group or removing the wrapper) silently breaks the
    // duration toggle — both durations would render simultaneously.
    const doc = await render();
    const wrapper = doc.querySelector(String.raw`.group\/tiers`);
    expect(wrapper).not.toBeNull();
  });

  it('emits `data-animate="fade-up"` on the cards-container element', async () => {
    // ADR-0015 entrance-animation contract. Block-level animation
    // (cards-container) rather than per-card so the three cards reveal
    // together — matches ServicePricingBlock's pricing-tier reveal.
    const doc = await render();
    const wrapper = doc.querySelector<HTMLElement>(String.raw`.group\/tiers`);
    expect(wrapper?.dataset.animate).toBe('fade-up');
  });
});
