// This file imports jsdom as a library (`new JSDOM(html)`) rather than
// switching the test environment to jsdom via Vitest's environment pragma.
// The pragma route conflicts with the Astro Container API's esbuild-init
// invariant on the current Vitest/Node/Astro/esbuild combo; the
// JSDOM-instance route sidesteps the realm clash. See ADR-0037
// §Conventions and the PR-body deviation note for the full chain.
import { JSDOM } from 'jsdom';
import { describe, expect, it } from 'vitest';
import { type SectionBackground, sectionBackground } from '~/styles/sectionStyles';
import { renderAstro } from '~/test-utils/renderAstro';
import Section from './Section.astro';

function parse(html: string): Document {
  return new JSDOM(html).window.document;
}

function rootSection(doc: Document): HTMLElement {
  const el = doc.querySelector('section');
  if (el === null) throw new Error('<section> not found in rendered DOM');
  return el;
}

// Hardcoded fixture — keeps the test self-describing. The `satisfies` clause
// below checks one direction (every listed entry is a valid SectionBackground).
// The `_ExhaustiveVariants` assertion below checks the other direction (every
// SectionBackground appears in VARIANTS). Together they lock the fixture to
// the union in both directions without a derived export.
const VARIANTS = [
  'default',
  'muted',
  'teal',
  'silver',
  'sage',
  'charcoal',
] as const satisfies readonly SectionBackground[];

// Exhaustiveness lock: if SectionBackground gains a variant that is not added
// to VARIANTS, this evaluates to a tuple type and `true` is no longer
// assignable, producing a tsc error pointing at the missing variant.
type _ExhaustiveVariants =
  Exclude<SectionBackground, (typeof VARIANTS)[number]> extends never
    ? true
    : [
        'VARIANTS missing SectionBackground member:',
        Exclude<SectionBackground, (typeof VARIANTS)[number]>,
      ];
true satisfies _ExhaustiveVariants;

describe('Section (component layer)', () => {
  it.each(VARIANTS)('paints sectionBackground[%s] on the root <section>', async (variant) => {
    const html = await renderAstro(Section, {
      props: { background: variant },
      slots: { default: '<p>x</p>' },
    });
    const section = rootSection(parse(html));
    // classList.contains is token-aware; defends against the
    // bg-background / bg-background-muted prefix trap.
    for (const token of sectionBackground[variant].split(' ')) {
      expect(section.classList.contains(token)).toBe(true);
    }
  });

  it('forwards class prop and joins it ahead of the variant class', async () => {
    const html = await renderAstro(Section, {
      props: { background: 'default', class: 'px-6 py-24 sm:py-32 lg:px-8' },
      slots: { default: '<p>x</p>' },
    });
    const section = rootSection(parse(html));
    for (const token of [
      'px-6',
      'py-24',
      'sm:py-32',
      'lg:px-8',
      'bg-background',
      'dark:bg-background-dark',
    ]) {
      expect(section.classList.contains(token)).toBe(true);
    }
  });

  it('forwards id to the root <section>', async () => {
    const html = await renderAstro(Section, {
      props: { background: 'default', id: 'stories' },
      slots: { default: '<p>x</p>' },
    });
    expect(rootSection(parse(html)).id).toBe('stories');
  });

  it('forwards ariaLabelledby as the kebab-cased aria-labelledby attribute', async () => {
    const html = await renderAstro(Section, {
      props: { background: 'default', ariaLabelledby: 'hero-heading' },
      slots: { default: '<p>x</p>' },
    });
    expect(rootSection(parse(html)).getAttribute('aria-labelledby')).toBe('hero-heading');
  });

  it('forwards arbitrary data-* attributes to the root <section>', async () => {
    const html = await renderAstro(Section, {
      props: {
        background: 'default',
        'data-test': 'hello',
        'data-services-filter': '',
      },
      slots: { default: '<p>x</p>' },
    });
    const section = rootSection(parse(html));
    expect(section.getAttribute('data-test')).toBe('hello');
    // Permissive: production selector [data-services-filter] is shape-agnostic;
    // passes for both bare and string attributes.
    expect(section.hasAttribute('data-services-filter')).toBe(true);
  });

  it('renders the default slot inside the root <section>', async () => {
    const html = await renderAstro(Section, {
      props: { background: 'default' },
      slots: { default: '<p>Hello</p>' },
    });
    const p = rootSection(parse(html)).querySelector('p');
    expect(p?.textContent).toBe('Hello');
  });
});
