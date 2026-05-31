// This file imports jsdom as a library (`new JSDOM(html)`) rather than
// switching the test environment to jsdom via Vitest's environment pragma.
// The pragma route conflicts with the Astro Container API's esbuild-init
// invariant on the current Vitest/Node/Astro/esbuild combo; the
// JSDOM-instance route sidesteps the realm clash. See ADR-0037
// §Conventions and the PR-body deviation note for the full chain.
import { JSDOM } from 'jsdom';
import { describe, expect, it } from 'vitest';
import { renderAstro } from '~/test-utils/renderAstro';
import ThanksSelectionSummary from './ThanksSelectionSummary.astro';

function parse(html: string): Document {
  return new JSDOM(html).window.document;
}

async function render(
  sessionHeading = 'Here is what you booked:',
  subscriptionHeading = 'Here is the service you asked about:',
): Promise<Document> {
  const html = await renderAstro(ThanksSelectionSummary, {
    props: { sessionHeading, subscriptionHeading },
  });
  return parse(html);
}

describe('ThanksSelectionSummary (component layer)', () => {
  it('renders the outer wrapper `hidden` by default', async () => {
    // ThanksSelectionSummary owns its own `hidden` (unlike
    // ServiceLockedLine, which delegates the toggle to its parent
    // wrapper): the thanks page has no layout-toggling sibling, so the
    // mirror of ConfiguratorContextBox's own-`hidden` pattern applies.
    const doc = await render();
    const wrapper = doc.querySelector<HTMLElement>('[data-thanks-selection-summary]');
    if (wrapper === null) throw new Error('[data-thanks-selection-summary] wrapper not found');
    expect(wrapper.classList.contains('hidden')).toBe(true);
  });

  it('renders both heading variants, session default-visible and subscription default-hidden', async () => {
    // The reader swaps which variant is visible at runtime by toggling
    // `hidden` on the two `[data-restate-heading]` siblings. At
    // parse-time the session variant is visible (the dominant
    // session-service case) and the subscription variant is hidden, so
    // the surface is internally consistent even if the reader fails to
    // run on a malformed payload.
    const doc = await render('Here is what you booked:', 'Here is the service you asked about:');
    const sessionHeading = doc.querySelector<HTMLElement>('[data-restate-heading="session"]');
    const subscriptionHeading = doc.querySelector<HTMLElement>(
      '[data-restate-heading="subscription"]',
    );
    if (sessionHeading === null) throw new Error('session heading not found');
    if (subscriptionHeading === null) throw new Error('subscription heading not found');
    expect(sessionHeading.textContent?.trim()).toBe('Here is what you booked:');
    expect(subscriptionHeading.textContent?.trim()).toBe('Here is the service you asked about:');
    expect(sessionHeading.classList.contains('hidden')).toBe(false);
    expect(subscriptionHeading.classList.contains('hidden')).toBe(true);
  });

  it('exposes empty `[data-restate-service]`, `[data-restate-config]`, `[data-restate-price]` placeholders', async () => {
    // All three placeholders are populated at runtime by
    // `thanksSelectionReader` from the sessionStorage carry. Before the
    // reader runs they must be addressable and empty so the reader's
    // `.textContent` writes produce the only visible strings.
    const doc = await render();
    const service = doc.querySelector<HTMLElement>('[data-restate-service]');
    const config = doc.querySelector<HTMLElement>('[data-restate-config]');
    const price = doc.querySelector<HTMLElement>('[data-restate-price]');
    if (service === null) throw new Error('[data-restate-service] placeholder not found');
    if (config === null) throw new Error('[data-restate-config] placeholder not found');
    if (price === null) throw new Error('[data-restate-price] placeholder not found');
    expect(service.textContent?.trim() ?? '').toBe('');
    expect(config.textContent?.trim() ?? '').toBe('');
    expect(price.textContent?.trim() ?? '').toBe('');
  });
});
