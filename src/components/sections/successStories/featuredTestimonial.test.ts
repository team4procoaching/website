// This file imports jsdom as a library (`new JSDOM(html)`) rather than
// switching the test environment to jsdom via Vitest's environment pragma.
// The pragma route conflicts with the Astro Container API's esbuild-init
// invariant on the current Vitest/Node/Astro/esbuild combo; the
// JSDOM-instance route sidesteps the realm clash. See ADR-0037
// §Conventions for the full chain.
import { JSDOM } from 'jsdom';
import { describe, expect, it } from 'vitest';
import { routes } from '~/data/routes';
import { testimonials } from '~/data/testimonials';
import { assertDefined, assertNotNull } from '~/test-utils/assertions';
import { renderAstro } from '~/test-utils/renderAstro';
import FeaturedTestimonial from './FeaturedTestimonial.astro';

function parse(html: string): Document {
  return new JSDOM(html).window.document;
}

describe('FeaturedTestimonial (component layer)', () => {
  it('renders the testimonial flagged as featured', async () => {
    // Tina R. carries `featured: true` today. The component picks that
    // entry over `testimonials[0]`, so the rendered card name should
    // match the featured pick, not the alphabetical-first or
    // array-first entry.
    const featured = testimonials.find((t) => 'featured' in t && t.featured === true);
    assertDefined(featured);

    const doc = parse(await renderAstro(FeaturedTestimonial, { props: {} }));
    expect(doc.body.textContent).toContain(featured.name);
  });

  it('renders the single-voice curation headline', async () => {
    const doc = parse(await renderAstro(FeaturedTestimonial, { props: {} }));
    const heading = doc.querySelector('h2');
    assertNotNull(heading);
    expect(heading.textContent?.trim()).toBe('One client, in her own words');
  });

  it('links the curation CTA to the success-stories overview route', async () => {
    // Substring-match on "voice" rather than the exact CTA label: the
    // wording itself is conversion-tuned and may be re-tightened, but
    // the "voice/voices" vocabulary is the stable framing the section
    // commits to (headline, intro copy, CTA all carry it). The route
    // identity is the load-bearing assertion.
    const doc = parse(await renderAstro(FeaturedTestimonial, { props: {} }));
    const link = doc.querySelector<HTMLAnchorElement>(`a[href="${routes.successStories}"]`);
    assertNotNull(link);
    expect(link.textContent?.toLowerCase()).toContain('voice');
  });
});
