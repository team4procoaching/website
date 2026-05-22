// This file imports jsdom as a library (`new JSDOM(html)`) rather than
// switching the test environment to jsdom via Vitest's environment pragma.
// The pragma route conflicts with the Astro Container API's esbuild-init
// invariant on the current Vitest/Node/Astro/esbuild combo; the
// JSDOM-instance route sidesteps the realm clash. See ADR-0037
// §Conventions and the PR-body deviation note for the full chain.
import { describe, it } from 'vitest';
import NavLink from '~/components/navigation/NavLink.astro';
import { expectNoA11yViolations } from '~/test-utils/a11y';
import { renderAstro } from '~/test-utils/renderAstro';

describe('NavLink (a11y)', () => {
  it('has no axe violations as a desktop link on a light background', async () => {
    const html = await renderAstro(NavLink, {
      props: { href: '/services', variant: 'desktop' },
      slots: { default: 'Services' },
    });
    await expectNoA11yViolations(html);
  });

  it('has no axe violations as a desktop link on a dark background', async () => {
    const html = await renderAstro(NavLink, {
      props: { href: '/services', variant: 'desktop', colorVariant: 'on-dark' },
      slots: { default: 'Services' },
    });
    await expectNoA11yViolations(html);
  });

  it('has no axe violations as a mobile link on a light background', async () => {
    const html = await renderAstro(NavLink, {
      props: { href: '/services', variant: 'mobile' },
      slots: { default: 'Services' },
    });
    await expectNoA11yViolations(html);
  });

  it('has no axe violations as a mobile link on a dark background', async () => {
    const html = await renderAstro(NavLink, {
      props: { href: '/services', variant: 'mobile', colorVariant: 'on-dark' },
      slots: { default: 'Services' },
    });
    await expectNoA11yViolations(html);
  });
});
