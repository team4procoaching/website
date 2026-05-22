// This file imports jsdom as a library (`new JSDOM(html)`) rather than
// switching the test environment to jsdom via Vitest's environment pragma.
// The pragma route conflicts with the Astro Container API's esbuild-init
// invariant on the current Vitest/Node/Astro/esbuild combo; the
// JSDOM-instance route sidesteps the realm clash. See ADR-0037
// §Conventions and the PR-body deviation note for the full chain.
import { describe, it } from 'vitest';
import Logo from '~/components/ui/Logo.astro';
import type { LogoConfig } from '~/data/site';
import { expectNoA11yViolations } from '~/test-utils/a11y';
import { renderAstro } from '~/test-utils/renderAstro';

const logo: LogoConfig = {
  light: 'https://example.com/logo-light.svg',
  dark: 'https://example.com/logo-dark.svg',
};

describe('Logo (a11y)', () => {
  it('has no axe violations in the default variant', async () => {
    const html = await renderAstro(Logo, {
      props: { name: 'Team 4 Pro Coaching', logo },
    });
    await expectNoA11yViolations(html);
  });

  it('has no axe violations in the on-dark variant', async () => {
    const html = await renderAstro(Logo, {
      props: { name: 'Team 4 Pro Coaching', logo, variant: 'on-dark' },
    });
    await expectNoA11yViolations(html);
  });
});
