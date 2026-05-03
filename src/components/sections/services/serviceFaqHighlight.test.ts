// This file imports jsdom as a library (`new JSDOM(html)`) rather than
// switching the test environment to jsdom via Vitest's environment pragma.
// The pragma route conflicts with the Astro Container API's esbuild-init
// invariant on the current Vitest/Node/Astro/esbuild combo; the
// JSDOM-instance route sidesteps the realm clash. See ADR-0037
// §Conventions and the PR-body deviation note for the full chain.
import { JSDOM } from 'jsdom';
import { describe, expect, it } from 'vitest';
import type { ServiceWithCompleteDetailContent } from '~/data/services';
import { buildServiceFixture } from '~/test-utils/fixtures';
import { renderAstro } from '~/test-utils/renderAstro';
import ServiceFaqHighlight from './ServiceFaqHighlight.astro';

const fixtureService = buildServiceFixture();

function parse(html: string): Document {
  return new JSDOM(html).window.document;
}

async function render(
  service: ServiceWithCompleteDetailContent = fixtureService,
): Promise<Document> {
  const html = await renderAstro(ServiceFaqHighlight, { props: { service } });
  return parse(html);
}

describe('ServiceFaqHighlight (component layer)', () => {
  it('renders one section landmark with an aria-labelledby reference', async () => {
    // The section is a single named landmark. The visually-hidden `<h2>`
    // ("Frequently asked: eligibility") names it via `aria-labelledby` so
    // assistive tech announces a labelled region, while sighted users see
    // the FAQ question itself as the visible heading.
    const doc = await render();
    const sections = doc.querySelectorAll('section');
    expect(sections).toHaveLength(1);
    const labelledBy = sections[0]?.getAttribute('aria-labelledby');
    expect(labelledBy).toBeTruthy();
    expect(doc.querySelector(`#${labelledBy}`)?.classList.contains('sr-only')).toBe(true);
  });

  it('promotes the first FAQ entry to an `<h3>` and `<p>` pair', async () => {
    // `.toContain` rather than `.toBe` is the regression bar: the fixture
    // controls the data, so a regression that drops or rewires the slot
    // trips immediately, while benign markup additions inside the heading
    // (e.g. a future `<span class="sr-only">FAQ Q1: </span>` prefix) do
    // not flip the test red. The launch-gate predicate guarantees
    // `faq[0]` is populated, in line with the rendering-site assertion.
    const doc = await render();
    const eligibilityFaq = fixtureService.faq[0];

    const headings = doc.querySelectorAll('h3');
    expect(headings).toHaveLength(1);
    expect(headings[0]?.textContent ?? '').toContain(eligibilityFaq.question);

    const paragraphs = doc.querySelectorAll('p');
    expect(paragraphs).toHaveLength(1);
    expect(paragraphs[0]?.textContent ?? '').toContain(eligibilityFaq.answer);
  });
});
