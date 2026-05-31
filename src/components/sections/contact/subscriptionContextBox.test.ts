// This file imports jsdom as a library (`new JSDOM(html)`) rather than
// switching the test environment to jsdom via Vitest's environment pragma.
// The pragma route conflicts with the Astro Container API's esbuild-init
// invariant on the current Vitest/Node/Astro/esbuild combo; the
// JSDOM-instance route sidesteps the realm clash. See ADR-0037
// §Conventions and the sibling thanksSelectionSummary.test.ts for the chain.
import { JSDOM } from 'jsdom';
import { describe, expect, it } from 'vitest';
import { routes } from '~/data/routes';
import { renderAstro } from '~/test-utils/renderAstro';
import SubscriptionContextBox from './SubscriptionContextBox.astro';

function parse(html: string): Document {
  return new JSDOM(html).window.document;
}

async function render(
  heading = 'Your selected program',
  detailLabel = 'See full program details',
  differentServiceLabel = 'Ask about a different service',
): Promise<Document> {
  const html = await renderAstro(SubscriptionContextBox, {
    props: { heading, detailLabel, differentServiceLabel },
  });
  return parse(html);
}

describe('SubscriptionContextBox (component layer)', () => {
  it('renders the outer wrapper `hidden` by default', async () => {
    // The controller removes `hidden` from `[data-subscription-summary]`
    // only on a subscription `?service=<id>` landing; before init the whole
    // box is hidden so non-subscription visitors never see an empty card.
    const doc = await render();
    const wrapper = doc.querySelector<HTMLElement>('[data-subscription-summary]');
    if (wrapper === null) throw new Error('[data-subscription-summary] wrapper not found');
    expect(wrapper.classList.contains('hidden')).toBe(true);
  });

  it('exposes empty `[data-sub-service]` and `[data-sub-price]` placeholders', async () => {
    // Both placeholders are populated at runtime by contactFormController
    // from the resolved service. Before the controller runs they must be
    // addressable and empty so the controller's `.textContent` writes
    // produce the only visible strings.
    const doc = await render();
    const service = doc.querySelector<HTMLElement>('[data-sub-service]');
    const price = doc.querySelector<HTMLElement>('[data-sub-price]');
    if (service === null) throw new Error('[data-sub-service] placeholder not found');
    if (price === null) throw new Error('[data-sub-price] placeholder not found');
    expect(service.textContent?.trim() ?? '').toBe('');
    expect(price.textContent?.trim() ?? '').toBe('');
  });

  it('ships the program-details link present, hidden, with an empty href', async () => {
    // The program-details link is conditional: the controller sets its href
    // and removes `hidden` only when the service passes
    // `hasCompleteDetailContent`. It must ship present-but-hidden with an
    // empty href so a guard-false service (off-season) leaves it suppressed
    // rather than pointing at a 404.
    const doc = await render();
    const detailLink = doc.querySelector<HTMLAnchorElement>('[data-sub-detail-href]');
    if (detailLink === null) throw new Error('[data-sub-detail-href] link not found');
    expect(detailLink.hasAttribute('hidden')).toBe(true);
    expect(detailLink.getAttribute('href')).toBe('');
    expect(detailLink.textContent?.trim()).toBe('See full program details ↗');
  });

  it('renders the always-shown different-service link pointing at the bare contact route', async () => {
    // The shell's different-service link is never guarded — it routes to the
    // bare contact page so the visitor can start over with a different
    // service. Its href reads `routes.contact`, not a hardcoded path.
    const doc = await render();
    const links = [...doc.querySelectorAll<HTMLAnchorElement>('a')];
    const differentServiceLink = links.find(
      (a) => a.textContent?.trim() === 'Ask about a different service ↗',
    );
    if (differentServiceLink === undefined) {
      throw new Error('different-service link not found');
    }
    expect(differentServiceLink.getAttribute('href')).toBe(routes.contact);
  });
});
