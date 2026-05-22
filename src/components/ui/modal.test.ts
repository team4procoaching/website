// This file imports jsdom as a library (`new JSDOM(html)`) rather than
// switching the test environment to jsdom via Vitest's environment pragma.
// The pragma route conflicts with the Astro Container API's esbuild-init
// invariant on the current Vitest/Node/Astro/esbuild combo; the
// JSDOM-instance route sidesteps the realm clash. See ADR-0037
// §Conventions and the PR-body deviation note for the full chain.
import { describe, it } from 'vitest';
import Modal from '~/components/ui/Modal.astro';
import { expectNoA11yViolations } from '~/test-utils/a11y';
import { renderAstro } from '~/test-utils/renderAstro';

describe('Modal (a11y)', () => {
  it('has no axe violations in the default size', async () => {
    const html = await renderAstro(Modal, {
      props: { id: 'coach-modal', ariaLabelledby: 'coach-title' },
      slots: { default: '<h3 id="coach-title">Coach Details</h3><p>Content goes here.</p>' },
    });
    await expectNoA11yViolations(html);
  });

  it('has no axe violations in the wide size', async () => {
    const html = await renderAstro(Modal, {
      props: { id: 'coach-modal', ariaLabelledby: 'coach-title', size: 'wide' },
      slots: { default: '<h3 id="coach-title">Coach Details</h3><p>Content goes here.</p>' },
    });
    await expectNoA11yViolations(html);
  });
});
