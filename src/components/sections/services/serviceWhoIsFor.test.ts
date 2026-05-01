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
import ServiceWhoIsFor from './ServiceWhoIsFor.astro';

const fixtureService = buildServiceFixture();

function parse(html: string): Document {
  return new JSDOM(html).window.document;
}

async function render(
  service: ServiceWithCompleteDetailContent = fixtureService,
): Promise<Document> {
  const html = await renderAstro(ServiceWhoIsFor, { props: { service } });
  return parse(html);
}

describe('ServiceWhoIsFor (component layer)', () => {
  it('renders one list item per fitFor entry', async () => {
    // Count-based, not text-based — wording changes across services without
    // breaking the test, while a regression that drops or duplicates an
    // entry trips immediately. The launch-gate predicate guarantees
    // `fitFor.length >= 3`, so the section can rely on the array being
    // populated.
    const doc = await render();
    const lists = doc.querySelectorAll('ul');
    expect(lists[0]?.querySelectorAll('li')).toHaveLength(fixtureService.fitFor.length);
  });

  it('renders one list item per notFitFor entry', async () => {
    // Companion count assertion for the negative column. Same rationale —
    // count survives copy revisions; structure regressions still trip.
    const doc = await render();
    const lists = doc.querySelectorAll('ul');
    expect(lists[1]?.querySelectorAll('li')).toHaveLength(fixtureService.notFitFor.length);
  });

  it('renders both columns within a single section landmark', async () => {
    // The section is a single landmark (`<section aria-labelledby>`) with
    // two `<h3>` columns inside. A regression that splits the columns into
    // separate sections would break the IA contract documented in the
    // concept doc Decision 5.
    const doc = await render();
    expect(doc.querySelectorAll('section')).toHaveLength(1);
    expect(doc.querySelectorAll('h3')).toHaveLength(2);
  });
});
