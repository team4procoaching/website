// This file imports jsdom as a library (`new JSDOM(html)`) rather than
// switching the test environment to jsdom via Vitest's environment pragma.
// The pragma route conflicts with the Astro Container API's esbuild-init
// invariant on the current Vitest/Node/Astro/esbuild combo; the
// JSDOM-instance route sidesteps the realm clash. See ADR-0037
// §Conventions and the PR-body deviation note for the full chain.
import { describe, it } from 'vitest';
import TextLink from '~/components/ui/TextLink.astro';
import { expectNoA11yViolations } from '~/test-utils/a11y';
import { renderAstro } from '~/test-utils/renderAstro';

describe('TextLink (a11y)', () => {
  it('has no axe violations in the default variant', async () => {
    const html = await renderAstro(TextLink, {
      props: { href: '/services' },
      slots: { default: 'Browse All Services' },
    });
    await expectNoA11yViolations(html);
  });

  it('has no axe violations in the light variant', async () => {
    const html = await renderAstro(TextLink, {
      props: { href: '/about', variant: 'light' },
      slots: { default: 'Learn More' },
    });
    await expectNoA11yViolations(html);
  });
});
