// This file imports jsdom as a library (`new JSDOM(html)`) rather than
// switching the test environment to jsdom via Vitest's environment pragma.
// The pragma route conflicts with the Astro Container API's esbuild-init
// invariant on the current Vitest/Node/Astro/esbuild combo; the
// JSDOM-instance route sidesteps the realm clash. See ADR-0037
// §Conventions and the PR-body deviation note for the full chain.
import { JSDOM } from 'jsdom';
import { describe, expect, it } from 'vitest';
import { renderAstro } from '~/test-utils/renderAstro';
import { remoteImage } from '~/types/components';
import HeroFullscreen from './HeroFullscreen.astro';

function parse(html: string): Document {
  return new JSDOM(html).window.document;
}

function rootSection(doc: Document): HTMLElement {
  const el = doc.querySelector('section');
  if (el === null) throw new Error('<section> not found in rendered DOM');
  return el;
}

// Shared image background — `HeroFullscreen` requires `background`, but the
// asserted behaviour in this file is independent of which background variant
// is supplied.
const imageBackground = {
  type: 'image' as const,
  src: remoteImage('https://placehold.co/1280x720', 1280, 720),
  alt: 'Test poster',
};

const linkPrimaryCta = { label: 'Find Your Plan', href: '/services' } as const;

describe('HeroFullscreen (component layer)', () => {
  it('renders the display headline class set by default', async () => {
    const html = await renderAstro(HeroFullscreen, {
      props: {
        headline: 'Statement Headline',
        primaryCta: linkPrimaryCta,
        background: imageBackground,
      },
    });
    const heading = parse(html).querySelector('h1');
    if (heading === null) throw new Error('default heading <h1> not found');
    // Display variant — pinned literals.
    for (const token of ['text-5xl', 'sm:text-7xl', 'font-serif', 'tracking-tight', 'text-white']) {
      expect(heading.classList.contains(token)).toBe(true);
    }
    // Pill-only signature must be absent in the default variant.
    expect(heading.classList.contains('rounded-full')).toBe(false);
    expect(heading.classList.contains('bg-black/60')).toBe(false);
  });

  it('renders the pill headline class set when headlineStyle="pill"', async () => {
    const html = await renderAstro(HeroFullscreen, {
      props: {
        headline: 'In production',
        headlineStyle: 'pill',
        background: imageBackground,
      },
    });
    const heading = parse(html).querySelector('h1');
    if (heading === null) throw new Error('pill heading <h1> not found');
    // Pill variant — pinned literals serve as a regression anchor.
    for (const token of [
      'inline-block',
      'rounded-full',
      'bg-black/60',
      'px-6',
      'py-3',
      'text-2xl',
      'sm:text-4xl',
      'text-white',
    ]) {
      expect(heading.classList.contains(token)).toBe(true);
    }
    // Display-only signature tokens must not bleed into the pill variant.
    expect(heading.classList.contains('text-5xl')).toBe(false);
    expect(heading.classList.contains('sm:text-7xl')).toBe(false);
  });

  it('omits the primary CTA <a> when primaryCta is absent', async () => {
    const html = await renderAstro(HeroFullscreen, {
      props: {
        headline: 'Soft CTA Banner',
        background: imageBackground,
        secondaryCta: { label: 'Meet our coaches', href: '#coaches' },
      },
    });
    const doc = parse(html);
    // CtaButton (primary variant) emits the `bg-accent-600` token.
    expect(doc.querySelector('a.bg-accent-600')).toBeNull();
    // TextLink emits `animated-underline` and is the only secondary surface.
    const textLink = doc.querySelector<HTMLAnchorElement>('a.animated-underline');
    expect(textLink).not.toBeNull();
    expect(textLink?.getAttribute('href')).toBe('#coaches');
  });

  it('renders both CTA surfaces when primaryCta and secondaryCta are present', async () => {
    const html = await renderAstro(HeroFullscreen, {
      props: {
        headline: 'Full CTA Banner',
        primaryCta: linkPrimaryCta,
        secondaryCta: { label: 'Browse all', href: '#all' },
        background: imageBackground,
      },
    });
    const doc = parse(html);
    // Primary CTA — CtaButton primary variant carries `bg-accent-600`.
    const primary = doc.querySelector<HTMLAnchorElement>('a.bg-accent-600');
    expect(primary).not.toBeNull();
    expect(primary?.getAttribute('href')).toBe('/services');
    // Secondary CTA — TextLink carries `animated-underline`.
    const secondary = doc.querySelector<HTMLAnchorElement>('a.animated-underline');
    expect(secondary).not.toBeNull();
    expect(secondary?.getAttribute('href')).toBe('#all');
  });

  it('forwards class prop and joins it ahead of the component-fixed classes', async () => {
    const html = await renderAstro(HeroFullscreen, {
      props: {
        headline: 'Capped Banner',
        primaryCta: linkPrimaryCta,
        background: imageBackground,
        class: 'min-h-[60vh] md:min-h-[70vh]',
      },
    });
    const section = rootSection(parse(html));
    // Caller utilities reach the root section.
    for (const token of ['min-h-[60vh]', 'md:min-h-[70vh]']) {
      expect(section.classList.contains(token)).toBe(true);
    }
    // Component-fixed classes survive the join.
    for (const token of ['hero-ken-burns', 'relative', 'isolate', 'overflow-hidden', 'pt-14']) {
      expect(section.classList.contains(token)).toBe(true);
    }
    // Caller-classes-first ordering: `min-h-[60vh]` precedes `hero-ken-burns`
    // in the rendered class attribute, mirroring the join order asserted by
    // Section.test.ts. Substring match is enough — both tokens are unique.
    const classAttr = section.getAttribute('class') ?? '';
    expect(classAttr.indexOf('min-h-[60vh]')).toBeLessThan(classAttr.indexOf('hero-ken-burns'));
  });

  it('renders an <h2> with id matching aria-labelledby when headingLevel="h2"', async () => {
    const html = await renderAstro(HeroFullscreen, {
      props: {
        headline: 'In production',
        headingLevel: 'h2',
        primaryCta: linkPrimaryCta,
        background: imageBackground,
      },
    });
    const doc = parse(html);
    const heading = doc.querySelector('h2');
    if (heading === null) throw new Error('expected <h2> for headingLevel="h2"');
    // No <h1> should leak through when the caller asks for h2.
    expect(doc.querySelector('h1')).toBeNull();
    const headingId = heading.getAttribute('id');
    expect(headingId).not.toBeNull();
    expect(rootSection(doc).getAttribute('aria-labelledby')).toBe(headingId);
  });
});
