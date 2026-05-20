// This file imports jsdom as a library (`new JSDOM(html)`) rather than
// switching the test environment to jsdom via Vitest's environment pragma.
// The pragma route conflicts with the Astro Container API's esbuild-init
// invariant on the current Vitest/Node/Astro/esbuild combo; the
// JSDOM-instance route sidesteps the realm clash. See ADR-0037
// §Conventions and the PR-body deviation note for the full chain.
import { describe, it } from 'vitest';
import Breadcrumb from '~/components/navigation/Breadcrumb.astro';
import { expectNoA11yViolations } from '~/test-utils/a11y';
import { renderAstro } from '~/test-utils/renderAstro';

describe('Breadcrumb (a11y)', () => {
  it('has no axe violations with an empty trail', async () => {
    const html = await renderAstro(Breadcrumb, {
      props: { trail: [], current: 'Current Page' },
    });
    await expectNoA11yViolations(html);
  });

  it('has no axe violations with a single trail step', async () => {
    const html = await renderAstro(Breadcrumb, {
      props: {
        trail: [{ label: 'Success Stories', href: '/success-stories' }],
        current: 'Jane Doe',
      },
    });
    await expectNoA11yViolations(html);
  });

  it('has no axe violations with multiple trail steps', async () => {
    const html = await renderAstro(Breadcrumb, {
      props: {
        trail: [
          { label: 'Services', href: '/services' },
          { label: 'Competition Prep', href: '/services/competition-prep' },
        ],
        current: 'FAQ',
      },
    });
    await expectNoA11yViolations(html);
  });
});
