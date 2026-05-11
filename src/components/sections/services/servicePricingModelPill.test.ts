// This file imports jsdom as a library (`new JSDOM(html)`) rather than
// switching the test environment to jsdom via Vitest's environment pragma.
// The pragma route conflicts with the Astro Container API's esbuild-init
// invariant on the current Vitest/Node/Astro/esbuild combo; the
// JSDOM-instance route sidesteps the realm clash. See ADR-0037
// §Conventions for the full chain.
import { JSDOM } from 'jsdom';
import { describe, expect, it } from 'vitest';
import { assertNotNull } from '~/test-utils/assertions';
import { renderAstro } from '~/test-utils/renderAstro';
import ServicePricingModelPill from './ServicePricingModelPill.astro';
import { SERVICE_PRICING_MODEL_PILL_CLASS } from './servicePricingModelPillClasses';

function parse(html: string): Document {
  return new JSDOM(html).window.document;
}

const LABEL = 'Session-based';

describe('ServicePricingModelPill (component layer)', () => {
  it('renders the label as the visible text of a span', async () => {
    const doc = parse(await renderAstro(ServicePricingModelPill, { props: { label: LABEL } }));
    const pill = doc.querySelector<HTMLSpanElement>('span');
    assertNotNull(pill);
    expect(pill.textContent?.trim()).toBe(LABEL);
  });

  it('is a non-interactive span, not an anchor', async () => {
    const doc = parse(await renderAstro(ServicePricingModelPill, { props: { label: LABEL } }));
    expect(doc.querySelector('a')).toBeNull();
    expect(doc.querySelector('span')).not.toBeNull();
  });

  it('renders no chevron or icon markup', async () => {
    const doc = parse(await renderAstro(ServicePricingModelPill, { props: { label: LABEL } }));
    const pill = doc.querySelector<HTMLSpanElement>('span');
    assertNotNull(pill);
    expect(pill.querySelector('span')).toBeNull();
    expect(pill.querySelector('svg')).toBeNull();
    expect(pill.querySelector('[aria-hidden="true"]')).toBeNull();
  });

  it('renders the span with the exact shared neutral pill class string', async () => {
    // Strict-equality guard against drift on the pill surface — pins the
    // markup to the shared constant so a future change that replaces
    // `class={CONSTANT}` with an inline string fails CI.
    const doc = parse(await renderAstro(ServicePricingModelPill, { props: { label: LABEL } }));
    const pill = doc.querySelector<HTMLSpanElement>('span');
    assertNotNull(pill);
    expect(pill.className).toBe(SERVICE_PRICING_MODEL_PILL_CLASS);
  });

  it('uses a neutral muted palette, not the teal SuccessStoryServiceBadge palette', async () => {
    const doc = parse(await renderAstro(ServicePricingModelPill, { props: { label: LABEL } }));
    const pill = doc.querySelector<HTMLSpanElement>('span');
    assertNotNull(pill);
    expect(pill.className).toContain('bg-foreground-100');
    expect(pill.className).toContain('text-foreground-700');
    expect(pill.className).toContain('dark:bg-foreground-900/30');
    expect(pill.className).toContain('dark:text-foreground-300');
    expect(pill.className).not.toContain('teal');
  });
});
