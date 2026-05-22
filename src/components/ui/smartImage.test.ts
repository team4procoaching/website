// This file imports jsdom as a library (`new JSDOM(html)`) rather than
// switching the test environment to jsdom via Vitest's environment pragma.
// The pragma route conflicts with the Astro Container API's esbuild-init
// invariant on the current Vitest/Node/Astro/esbuild combo; the
// JSDOM-instance route sidesteps the realm clash. See ADR-0037
// §Conventions and the PR-body deviation note for the full chain.
//
// Coverage note: only the `{ kind: 'remote' }` ImageSource arm is exercised.
// The `{ kind: 'local' }` arm needs a build-time imported `ImageMetadata`
// that the test fixture surface does not produce, and `astro:assets` under
// the Container API may emit a transformed-URL placeholder for it. The local
// arm is deferred — see ADR-0052 § Known Limitations.
import { describe, it } from 'vitest';
import SmartImage from '~/components/ui/SmartImage.astro';
import { expectNoA11yViolations } from '~/test-utils/a11y';
import { renderAstro } from '~/test-utils/renderAstro';

describe('SmartImage (a11y)', () => {
  it('has no axe violations for a remote image with alt text', async () => {
    const html = await renderAstro(SmartImage, {
      props: {
        src: { kind: 'remote', src: 'https://example.com/photo.jpg', width: 800, height: 600 },
        alt: 'A coach demonstrating a lift',
      },
    });
    await expectNoA11yViolations(html);
  });

  it('has no axe violations for a remote image with responsive widths', async () => {
    const html = await renderAstro(SmartImage, {
      props: {
        src: { kind: 'remote', src: 'https://example.com/photo.jpg', width: 800, height: 600 },
        alt: 'A coach demonstrating a lift',
        widths: [400, 800],
        sizes: '(max-width: 800px) 100vw, 800px',
      },
    });
    await expectNoA11yViolations(html);
  });
});
