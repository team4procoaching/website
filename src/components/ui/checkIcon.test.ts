// This file imports jsdom as a library (`new JSDOM(html)`) rather than
// switching the test environment to jsdom via Vitest's environment pragma.
// The pragma route conflicts with the Astro Container API's esbuild-init
// invariant on the current Vitest/Node/Astro/esbuild combo; the
// JSDOM-instance route sidesteps the realm clash. See ADR-0037
// §Conventions and the PR-body deviation note for the full chain.
import { describe, it } from 'vitest';
import CheckIcon from '~/components/ui/CheckIcon.astro';
import { expectNoA11yViolations } from '~/test-utils/a11y';
import { renderAstro } from '~/test-utils/renderAstro';

describe('CheckIcon (a11y)', () => {
  it('has no axe violations as a decorative aria-hidden SVG', async () => {
    // The SVG carries `aria-hidden="true"` — removing it would expose an
    // unlabelled graphic to assistive tech and trip an axe rule.
    const html = await renderAstro(CheckIcon, {});
    await expectNoA11yViolations(html);
  });

  it('has no axe violations with an additional text-color class', async () => {
    const html = await renderAstro(CheckIcon, {
      props: { class: 'text-accent-600' },
    });
    await expectNoA11yViolations(html);
  });
});
