// This file imports jsdom as a library (`new JSDOM(html)`) rather than
// switching the test environment to jsdom via Vitest's environment pragma.
// The pragma route conflicts with the Astro Container API's esbuild-init
// invariant on the current Vitest/Node/Astro/esbuild combo; the
// JSDOM-instance route sidesteps the realm clash. See ADR-0037
// §Conventions and the PR-body deviation note for the full chain.
import { describe, it } from 'vitest';
import FilterBar from '~/components/ui/FilterBar.astro';
import { expectNoA11yViolations } from '~/test-utils/a11y';
import { renderAstro } from '~/test-utils/renderAstro';

const items = [
  { id: 'all', label: 'All' },
  { id: 'bodybuilding', label: 'Bodybuilding' },
  { id: 'wellness', label: 'Wellness' },
];

describe('FilterBar (a11y)', () => {
  it('has no axe violations with the ariaLabel labelling arm', async () => {
    const html = await renderAstro(FilterBar, {
      props: {
        items,
        defaultValue: 'all',
        name: 'category',
        ariaLabel: 'Filter services by goal',
      },
    });
    await expectNoA11yViolations(html);
  });

  it('has no axe violations with the ariaLabelledBy labelling arm', async () => {
    // The toolbar references a visible label element; the surrounding slot
    // provides that element so the aria-labelledby reference resolves.
    const html = await renderAstro(FilterBar, {
      props: {
        items,
        defaultValue: 'all',
        name: 'category',
        ariaLabelledBy: 'filter-label',
      },
    });
    await expectNoA11yViolations(`<p id="filter-label">Browse by goal</p>${html}`);
  });
});
