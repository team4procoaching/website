// This file imports jsdom as a library (`new JSDOM(html)`) rather than
// switching the test environment to jsdom via Vitest's environment pragma.
// The pragma route conflicts with the Astro Container API's esbuild-init
// invariant on the current Vitest/Node/Astro/esbuild combo; the
// JSDOM-instance route sidesteps the realm clash. See ADR-0037
// §Conventions and the PR-body deviation note for the full chain.
import { describe, it } from 'vitest';
import DesktopMenu from '~/components/navigation/DesktopMenu.astro';
import { expectNoA11yViolations } from '~/test-utils/a11y';
import { renderAstro } from '~/test-utils/renderAstro';

const items = [
  { label: 'Services', href: '/services' },
  { label: 'How It Works', href: '/how-it-works' },
  { label: 'Contact', href: '/contact' },
];

describe('DesktopMenu (a11y)', () => {
  it('has no axe violations in the default variant', async () => {
    const html = await renderAstro(DesktopMenu, { props: { items } });
    await expectNoA11yViolations(html);
  });

  it('has no axe violations in the on-dark variant', async () => {
    const html = await renderAstro(DesktopMenu, {
      props: { items, colorVariant: 'on-dark' },
    });
    await expectNoA11yViolations(html);
  });
});
