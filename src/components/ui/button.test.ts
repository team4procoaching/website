// This file imports jsdom as a library (`new JSDOM(html)`) rather than
// switching the test environment to jsdom via Vitest's environment pragma.
// The pragma route conflicts with the Astro Container API's esbuild-init
// invariant on the current Vitest/Node/Astro/esbuild combo; the
// JSDOM-instance route sidesteps the realm clash. See ADR-0037
// §Conventions and the PR-body deviation note for the full chain.
import { describe, it } from 'vitest';
import Button from '~/components/ui/Button.astro';
import { expectNoA11yViolations } from '~/test-utils/a11y';
import { renderAstro } from '~/test-utils/renderAstro';

describe('Button (a11y)', () => {
  it('has no axe violations as a primary anchor', async () => {
    const html = await renderAstro(Button, {
      props: { href: '/contact' },
      slots: { default: 'Get Started' },
    });
    await expectNoA11yViolations(html);
  });

  it('has no axe violations as a secondary anchor', async () => {
    const html = await renderAstro(Button, {
      props: { href: '/learn-more', variant: 'secondary' },
      slots: { default: 'Learn More' },
    });
    await expectNoA11yViolations(html);
  });

  it('has no axe violations as a primary button element', async () => {
    const html = await renderAstro(Button, {
      props: { as: 'button' },
      slots: { default: 'Open' },
    });
    await expectNoA11yViolations(html);
  });

  it('has no axe violations as a secondary button element', async () => {
    const html = await renderAstro(Button, {
      props: { as: 'button', variant: 'secondary' },
      slots: { default: 'Cancel' },
    });
    await expectNoA11yViolations(html);
  });
});
