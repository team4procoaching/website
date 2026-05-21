// This file imports jsdom as a library (`new JSDOM(html)`) rather than
// switching the test environment to jsdom via Vitest's environment pragma.
// The pragma route conflicts with the Astro Container API's esbuild-init
// invariant on the current Vitest/Node/Astro/esbuild combo; the
// JSDOM-instance route sidesteps the realm clash. See ADR-0037
// §Conventions and the PR-body deviation note for the full chain.
import { describe, it } from 'vitest';
import Card from '~/components/ui/Card.astro';
import { expectNoA11yViolations } from '~/test-utils/a11y';
import { renderAstro } from '~/test-utils/renderAstro';

describe('Card (a11y)', () => {
  it('has no axe violations with body content only', async () => {
    const html = await renderAstro(Card, {
      slots: { default: '<p>Card content goes here.</p>' },
    });
    await expectNoA11yViolations(html);
  });

  it('has no axe violations with header, body, and footer slots', async () => {
    const html = await renderAstro(Card, {
      slots: {
        header: '<h3>Premium Plan</h3>',
        default: '<p>Plan description and features.</p>',
        footer: '<a href="/signup">Sign Up</a>',
      },
    });
    await expectNoA11yViolations(html);
  });

  it('has no axe violations on a dark background', async () => {
    const html = await renderAstro(Card, {
      props: { darkBackground: true },
      slots: { default: '<p>Card on a dark section.</p>' },
    });
    await expectNoA11yViolations(html);
  });
});
