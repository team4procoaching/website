// This file imports jsdom as a library (`new JSDOM(html)`) rather than
// switching the test environment to jsdom via Vitest's environment pragma.
// The pragma route conflicts with the Astro Container API's esbuild-init
// invariant on the current Vitest/Node/Astro/esbuild combo; the
// JSDOM-instance route sidesteps the realm clash. See ADR-0037
// §Conventions and the PR-body deviation note for the full chain.
import { describe, it } from 'vitest';
import FormSelect from '~/components/ui/FormSelect.astro';
import { expectNoA11yViolations } from '~/test-utils/a11y';
import { renderAstro } from '~/test-utils/renderAstro';

const options = '<option value="">Select a service…</option><option value="prep">Prep</option>';

describe('FormSelect (a11y)', () => {
  it('has no axe violations in the required arm', async () => {
    const html = await renderAstro(FormSelect, {
      props: { id: 'service', name: 'service', label: 'Service', required: true },
      slots: { default: options },
    });
    await expectNoA11yViolations(html);
  });

  it('has no axe violations in the optional arm', async () => {
    const html = await renderAstro(FormSelect, {
      props: { id: 'service', name: 'service', label: 'Service', optional: true },
      slots: { default: options },
    });
    await expectNoA11yViolations(html);
  });

  it('has no axe violations in the neither-arm (inherits required-ness)', async () => {
    const html = await renderAstro(FormSelect, {
      props: { id: 'service', name: 'service', label: 'Service' },
      slots: { default: options },
    });
    await expectNoA11yViolations(html);
  });
});
