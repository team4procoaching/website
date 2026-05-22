// This file imports jsdom as a library (`new JSDOM(html)`) rather than
// switching the test environment to jsdom via Vitest's environment pragma.
// The pragma route conflicts with the Astro Container API's esbuild-init
// invariant on the current Vitest/Node/Astro/esbuild combo; the
// JSDOM-instance route sidesteps the realm clash. See ADR-0037
// §Conventions and the PR-body deviation note for the full chain.
import { describe, it } from 'vitest';
import CtaButton from '~/components/ui/CtaButton.astro';
import { MODAL_IDS } from '~/data/ids';
import { expectNoA11yViolations } from '~/test-utils/a11y';
import { renderAstro } from '~/test-utils/renderAstro';

describe('CtaButton (a11y)', () => {
  it('has no axe violations for a link action', async () => {
    const html = await renderAstro(CtaButton, {
      props: { action: { label: 'Get Started', href: '/contact' } },
    });
    await expectNoA11yViolations(html);
  });

  it('has no axe violations for a modal action', async () => {
    const html = await renderAstro(CtaButton, {
      props: { action: { label: 'Find Your Fit', type: 'modal', modalId: MODAL_IDS.quiz } },
    });
    await expectNoA11yViolations(html);
  });

  it('has no axe violations for a secondary-variant link action', async () => {
    const html = await renderAstro(CtaButton, {
      props: { action: { label: 'Learn More', href: '/about' }, variant: 'secondary' },
    });
    await expectNoA11yViolations(html);
  });
});
