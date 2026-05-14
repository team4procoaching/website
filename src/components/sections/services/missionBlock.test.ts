// This file imports jsdom as a library (`new JSDOM(html)`) rather than
// switching the test environment to jsdom via Vitest's environment pragma.
// The pragma route conflicts with the Astro Container API's esbuild-init
// invariant on the current Vitest/Node/Astro/esbuild combo; the
// JSDOM-instance route sidesteps the realm clash. See ADR-0037
// §Conventions and the PR-body deviation note for the full chain.
import { JSDOM } from 'jsdom';
import { describe, expect, it } from 'vitest';
import { coachesExpanded } from '~/data/coaches';
import type { MissionBlockContent } from '~/data/servicesMission';
import { renderAstro } from '~/test-utils/renderAstro';
import MissionBlock from './MissionBlock.astro';

/**
 * Component-layer test for the Services-page mission block.
 *
 * Two assertions cover the component's contract:
 *
 * 1. The three coaches render as a trio against real `coachesExpanded` data —
 *    one image per coach with non-empty `alt`, one heading element per coach
 *    containing the coach's `firstName`. Catches: a regression that drops a
 *    coach from the iteration, breaks the image rendering, or mis-types the
 *    firstName binding.
 *
 * 2. No `credentialLine` value renders on this surface. Catches: an
 *    AI-assisted edit that "tidies" the coach block back to a credential-
 *    display strip, restoring the specialisation labels that the
 *    asymmetry note in MissionBlock's JSDoc specifically rejects.
 *
 * What this test does NOT assert: the `[PLACEHOLDER]` prefix on draft copy.
 * Encoding a lifecycle phase into a permanent test surface produces an
 * inversion-coupled assertion future contributors will silently remove the
 * first time it inconveniences them. Placeholder protection rests on visible-
 * DOM presence of the prefix plus the owner's promote-to-production workflow
 * (Deploy Preview inspection + production-build smoke check before merge).
 */

function parse(html: string): Document {
  return new JSDOM(html).window.document;
}

// Inline fixture so the test stays decoupled from copy drift in
// `~/data/servicesMission.ts`. The component-contract assertions below
// depend on the SHAPE of `MissionBlockContent`, not on specific strings.
const fixture: MissionBlockContent = {
  heading: 'Test heading',
  paragraph: 'Test paragraph',
  coachSentences: {
    helle: 'Helle test',
    gina: 'Gina test',
    irene: 'Irene test',
  },
  transitionLine: 'Test transition line',
};

async function renderBlock(): Promise<Document> {
  const html = await renderAstro(MissionBlock, { props: { content: fixture } });
  return parse(html);
}

describe('MissionBlock (component layer, real coach data)', () => {
  it('renders the three coaches with non-empty image alt and firstName binding', async () => {
    const doc = await renderBlock();

    // Guard: locks the test to the project's three-coach team. If a fourth
    // coach is added in `~/data/coaches.ts`, the expectation count must be
    // re-considered alongside the `servicesMission.coachSentences` record update.
    expect(coachesExpanded.length).toBe(3);

    for (const coach of coachesExpanded) {
      const images = Array.from(
        doc.querySelectorAll<HTMLImageElement>(`img[alt="${coach.firstName}"]`),
      );
      expect(images.length).toBeGreaterThanOrEqual(1);
      const image = images[0];
      if (image === undefined) {
        throw new Error(`coach image missing for "${coach.id}"`);
      }

      const nameElement = Array.from(doc.querySelectorAll<HTMLParagraphElement>('p')).find(
        (p) => p.textContent?.trim() === coach.firstName,
      );
      if (nameElement === undefined) {
        throw new Error(`first-name element missing for "${coach.id}"`);
      }
      expect(nameElement.textContent?.trim()).toBe(coach.firstName);
    }
  });

  it('emits no `credentialLine` value on this surface', async () => {
    // The mission-block presentation drops `credentialLine` rendering by
    // design — see the asymmetry note in MissionBlock's JSDoc. Iterates
    // the real catalog so a future credential rephrasing in
    // `~/data/coaches.ts` updates the assertion target automatically,
    // without weakening the guard.
    const doc = await renderBlock();
    const renderedText = doc.body.textContent ?? '';

    for (const coach of coachesExpanded) {
      expect(renderedText).not.toContain(coach.credentialLine);
    }
  });
});
