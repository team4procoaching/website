// This file imports jsdom as a library (`new JSDOM(html)`) rather than
// switching the test environment to jsdom via Vitest's environment pragma.
// The pragma route conflicts with the Astro Container API's esbuild-init
// invariant on the current Vitest/Node/Astro/esbuild combo; the
// JSDOM-instance route sidesteps the realm clash. See ADR-0037
// §Conventions and the PR-body deviation note for the full chain.
import { JSDOM } from 'jsdom';
import { describe, expect, it } from 'vitest';
import SectionHeader from '~/components/ui/SectionHeader.astro';
import { expectNoA11yViolations } from '~/test-utils/a11y';
import { assertNotNull } from '~/test-utils/assertions';
import { buildSectionHeaderProps } from '~/test-utils/fixtures';
import { renderAstro } from '~/test-utils/renderAstro';

function parse(html: string): Document {
  return new JSDOM(html).window.document;
}

function firstEyebrow(doc: Document): HTMLParagraphElement | null {
  // The eyebrow paragraph carries the accent text-color token. Selecting on
  // that token avoids matching the intro-text wrapper or other paragraphs
  // that the slot may emit.
  return doc.querySelector<HTMLParagraphElement>('p[class*="text-accent-"]');
}

describe('SectionHeader (component layer)', () => {
  it('renders the eyebrow paragraph when eyebrow is a non-empty string', async () => {
    const html = await renderAstro(SectionHeader, {
      props: buildSectionHeaderProps({ eyebrow: 'Testimonials' }),
    });
    const eyebrow = firstEyebrow(parse(html));
    assertNotNull(eyebrow);
    expect(eyebrow.textContent?.trim()).toBe('Testimonials');
  });

  it('renders no eyebrow paragraph when eyebrow is undefined', async () => {
    const html = await renderAstro(SectionHeader, {
      props: buildSectionHeaderProps(),
    });
    expect(firstEyebrow(parse(html))).toBeNull();
  });

  it('renders no eyebrow paragraph when eyebrow is an empty string', async () => {
    // The `eyebrow && (...)` gate at SectionHeader.astro treats `""` as
    // falsy. Weakening the gate to `eyebrow !== undefined && (...)` would
    // emit an empty <p>; this test fails in that case.
    const html = await renderAstro(SectionHeader, {
      props: buildSectionHeaderProps({ eyebrow: '' }),
    });
    expect(firstEyebrow(parse(html))).toBeNull();
  });

  it('renders the headline text', async () => {
    const html = await renderAstro(SectionHeader, {
      props: buildSectionHeaderProps({ headline: 'Our Programs' }),
    });
    const heading = parse(html).querySelector('h1, h2, h3, h4');
    assertNotNull(heading);
    expect(heading.textContent?.trim()).toBe('Our Programs');
  });

  it('uses h2 as the default heading element', async () => {
    const html = await renderAstro(SectionHeader, {
      props: buildSectionHeaderProps(),
    });
    const doc = parse(html);
    expect(doc.querySelector('h2')).not.toBeNull();
    expect(doc.querySelector('h1')).toBeNull();
    expect(doc.querySelector('h3')).toBeNull();
    expect(doc.querySelector('h4')).toBeNull();
  });

  it('honours headingLevel="h3" for the dynamic heading tag', async () => {
    const html = await renderAstro(SectionHeader, {
      props: buildSectionHeaderProps({ headingLevel: 'h3' }),
    });
    const doc = parse(html);
    expect(doc.querySelector('h3')).not.toBeNull();
    expect(doc.querySelector('h2')).toBeNull();
  });

  it('lands headingId on the heading element id attribute', async () => {
    const html = await renderAstro(SectionHeader, {
      props: buildSectionHeaderProps({ headingId: 'section-heading' }),
    });
    const heading = parse(html).querySelector('h2');
    assertNotNull(heading);
    expect(heading.getAttribute('id')).toBe('section-heading');
  });

  // ADR-0036 render-and-trim contract — the regression class this component
  // owns. Six live forwarders inherit the rule from this site; a regression
  // here cascades to every section-adapter chain.

  it('omits the intro-text wrapper when no slot is supplied', async () => {
    // Selecting the wrapper by its mt-6 spacing token is fragile; instead,
    // assert that the only paragraph emitted (if any) is not nested under a
    // sibling <div> of the heading.
    const html = await renderAstro(SectionHeader, {
      props: buildSectionHeaderProps(),
    });
    const doc = parse(html);
    const heading = doc.querySelector('h2');
    assertNotNull(heading);
    // No sibling <div> containing prose follows the heading.
    expect(heading.nextElementSibling).toBeNull();
  });

  it('emits the intro-text wrapper with content when a default slot is supplied', async () => {
    const html = await renderAstro(SectionHeader, {
      props: buildSectionHeaderProps(),
      slots: { default: '<p>Intro</p>' },
    });
    const doc = parse(html);
    const heading = doc.querySelector('h2');
    assertNotNull(heading);
    const wrapper = heading.nextElementSibling;
    assertNotNull(wrapper);
    expect(wrapper.tagName).toBe('DIV');
    expect(wrapper.querySelector('p')?.textContent?.trim()).toBe('Intro');
  });

  it('omits the intro-text wrapper when the default slot contains only whitespace', async () => {
    // The render-and-trim trap ADR-0036 codifies. Weakening
    // `slotHtml.trim().length > 0` to `slotHtml.length > 0` flips this test
    // red — verified locally as the mutation pair acceptance for this
    // commit.
    const html = await renderAstro(SectionHeader, {
      props: buildSectionHeaderProps(),
      slots: { default: '   \n   ' },
    });
    const doc = parse(html);
    const heading = doc.querySelector('h2');
    assertNotNull(heading);
    expect(heading.nextElementSibling).toBeNull();
  });

  describe('a11y (axe)', () => {
    it('has no axe violations in the default render', async () => {
      const html = await renderAstro(SectionHeader, {
        props: buildSectionHeaderProps(),
      });
      await expectNoA11yViolations(html);
    });

    it('has no axe violations with an eyebrow', async () => {
      const html = await renderAstro(SectionHeader, {
        props: buildSectionHeaderProps({ eyebrow: 'Testimonials' }),
      });
      await expectNoA11yViolations(html);
    });

    it('has no axe violations with headingLevel="h3"', async () => {
      const html = await renderAstro(SectionHeader, {
        props: buildSectionHeaderProps({ headingLevel: 'h3' }),
      });
      await expectNoA11yViolations(html);
    });

    it('has no axe violations with an intro-text slot', async () => {
      const html = await renderAstro(SectionHeader, {
        props: buildSectionHeaderProps(),
        slots: { default: '<p>Intro</p>' },
      });
      await expectNoA11yViolations(html);
    });
  });
});
