// This file imports jsdom as a library (`new JSDOM(html)`) rather than
// switching the test environment to jsdom via Vitest's environment pragma.
// The pragma route conflicts with the Astro Container API's esbuild-init
// invariant on the current Vitest/Node/Astro/esbuild combo; the
// JSDOM-instance route sidesteps the realm clash. See ADR-0037
// §Conventions and the PR-body deviation note for the full chain.
import { describe, it } from 'vitest';
import Footer from '~/components/navigation/Footer.astro';
import { instagramIcon } from '~/data/icons';
import type { SocialLink } from '~/data/site';
import { expectNoA11yViolations } from '~/test-utils/a11y';
import { renderAstro } from '~/test-utils/renderAstro';

const footerLinks = [
  { label: 'Home', href: '/' },
  { label: 'Services', href: '/services' },
  { label: 'Privacy Policy', href: '/privacy' },
];

const activeSocial: SocialLink[] = [
  { name: 'Instagram', href: 'https://instagram.com/team4procoaching', icon: instagramIcon },
];

// A placeholder-href entry is filtered out by Footer, so this arm renders
// the footer with no visible social-icon row.
const placeholderSocial: SocialLink[] = [{ name: 'YouTube', href: '#', icon: instagramIcon }];

describe('Footer (a11y)', () => {
  it('has no axe violations with active social links', async () => {
    const html = await renderAstro(Footer, {
      props: { social: activeSocial, footerLinks, copyright: '© 2026 Team 4 Pro Coaching' },
    });
    await expectNoA11yViolations(html);
  });

  it('has no axe violations when all social links are placeholders', async () => {
    const html = await renderAstro(Footer, {
      props: { social: placeholderSocial, footerLinks, copyright: '© 2026 Team 4 Pro Coaching' },
    });
    await expectNoA11yViolations(html);
  });
});
