// This file imports jsdom as a library (`new JSDOM(html)`) rather than
// switching the test environment to jsdom via Vitest's environment pragma.
// The pragma route conflicts with the Astro Container API's esbuild-init
// invariant on the current Vitest/Node/Astro/esbuild combo; the
// JSDOM-instance route sidesteps the realm clash. See ADR-0037
// §Conventions and the PR-body deviation note for the full chain.
import { describe, it } from 'vitest';
import PullQuote from '~/components/ui/PullQuote.astro';
import { expectNoA11yViolations } from '~/test-utils/a11y';
import { renderAstro } from '~/test-utils/renderAstro';

describe('PullQuote (a11y)', () => {
  it('has no axe violations in the default variant', async () => {
    const html = await renderAstro(PullQuote, {
      slots: { default: 'Three minds, one unified mission.' },
    });
    await expectNoA11yViolations(html);
  });

  it('has no axe violations in the large variant', async () => {
    const html = await renderAstro(PullQuote, {
      props: { variant: 'large' },
      slots: { default: 'Three minds, one unified mission.' },
    });
    await expectNoA11yViolations(html);
  });

  it('has no axe violations with a citation', async () => {
    const html = await renderAstro(PullQuote, {
      props: { cite: 'Jane Doe' },
      slots: { default: 'Three minds, one unified mission.' },
    });
    await expectNoA11yViolations(html);
  });
});
