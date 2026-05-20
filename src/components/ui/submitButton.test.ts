// This file imports jsdom as a library (`new JSDOM(html)`) rather than
// switching the test environment to jsdom via Vitest's environment pragma.
// The pragma route conflicts with the Astro Container API's esbuild-init
// invariant on the current Vitest/Node/Astro/esbuild combo; the
// JSDOM-instance route sidesteps the realm clash. See ADR-0037
// §Conventions and the PR-body deviation note for the full chain.
import { describe, it } from 'vitest';
import SubmitButton from '~/components/ui/SubmitButton.astro';
import { expectNoA11yViolations } from '~/test-utils/a11y';
import { renderAstro } from '~/test-utils/renderAstro';

describe('SubmitButton (a11y)', () => {
  it('has no axe violations in the primary variant', async () => {
    const html = await renderAstro(SubmitButton, {
      slots: { default: 'Send Message' },
    });
    await expectNoA11yViolations(html);
  });

  it('has no axe violations in the secondary variant', async () => {
    const html = await renderAstro(SubmitButton, {
      props: { variant: 'secondary' },
      slots: { default: 'Save Draft' },
    });
    await expectNoA11yViolations(html);
  });
});
