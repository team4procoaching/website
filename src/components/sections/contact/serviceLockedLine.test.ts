// This file imports jsdom as a library (`new JSDOM(html)`) rather than
// switching the test environment to jsdom via Vitest's environment pragma.
// The pragma route conflicts with the Astro Container API's esbuild-init
// invariant on the current Vitest/Node/Astro/esbuild combo; the
// JSDOM-instance route sidesteps the realm clash. See ADR-0037
// §Conventions and the PR-body deviation note for the full chain.
import { JSDOM } from 'jsdom';
import { describe, expect, it } from 'vitest';
import { renderAstro } from '~/test-utils/renderAstro';
import ServiceLockedLine from './ServiceLockedLine.astro';

function parse(html: string): Document {
  return new JSDOM(html).window.document;
}

async function render(label = 'Service:'): Promise<Document> {
  const html = await renderAstro(ServiceLockedLine, { props: { label } });
  return parse(html);
}

describe('ServiceLockedLine (component layer)', () => {
  it('renders the outer template element with `sm:col-span-2`', async () => {
    // The component does not own its own `hidden` class — its parent
    // `<div data-service-locked-wrapper>` in ContactForm.astro owns the
    // toggle. The component instead carries `sm:col-span-2` so it takes
    // the full grid-row width when revealed, mirroring how FormSelect's
    // outer `<div>` carries `sm:col-span-2`. The wrapper-side `hidden`
    // is verified by the controller test in Commit 5.
    const doc = await render();
    const outer = doc.body.firstElementChild;
    if (outer === null) throw new Error('outer template element not found');
    expect(outer.classList.contains('sm:col-span-2')).toBe(true);
  });

  it('renders the `label` Prop literal', async () => {
    const doc = await render('Service:');
    expect(doc.body.textContent).toContain('Service:');
  });

  it('exposes an empty `[data-locked-service-name]` placeholder', async () => {
    // The placeholder is populated at runtime by `contactFormController`
    // after a Configurator deep-link resolves; before init it must be
    // addressable and empty so the controller's `.textContent` write
    // produces the only visible service-name string.
    const doc = await render();
    const placeholder = doc.querySelector<HTMLElement>('[data-locked-service-name]');
    if (placeholder === null) throw new Error('[data-locked-service-name] placeholder not found');
    expect(placeholder.textContent?.trim() ?? '').toBe('');
  });
});
