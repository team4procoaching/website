// This file imports jsdom as a library (`new JSDOM(html)`) rather than
// switching the test environment to jsdom via Vitest's environment pragma.
// The pragma route conflicts with the Astro Container API's esbuild-init
// invariant on the current Vitest/Node/Astro/esbuild combo; the
// JSDOM-instance route sidesteps the realm clash. See ADR-0037
// §Conventions and the PR-body deviation note for the full chain.
import { JSDOM } from 'jsdom';
import { describe, expect, it } from 'vitest';
import CTA from '~/components/ui/CTA.astro';
import { assertNotNull } from '~/test-utils/assertions';
import { renderAstro } from '~/test-utils/renderAstro';
import type { LinkCta, SecondaryCta } from '~/types/components';

function parse(html: string): Document {
  return new JSDOM(html).window.document;
}

function region(doc: Document): HTMLElement {
  const el = doc.querySelector<HTMLElement>('[role="region"]');
  if (el === null) throw new Error('CTA region not found in rendered DOM');
  return el;
}

const cta = (
  overrides: {
    headline?: string;
    description?: string;
    primaryCta?: LinkCta;
    secondaryCta?: SecondaryCta;
    headingLevel?: 'h2' | 'h3';
    variant?: 'dark' | 'glass';
  } = {},
) => ({
  headline: overrides.headline ?? 'Ready to Get Started?',
  description: overrides.description ?? 'Join us today.',
  primaryCta: overrides.primaryCta ?? ({ label: 'Sign Up', href: '/signup' } satisfies LinkCta),
  ...(overrides.secondaryCta !== undefined && { secondaryCta: overrides.secondaryCta }),
  ...(overrides.headingLevel !== undefined && { headingLevel: overrides.headingLevel }),
  ...(overrides.variant !== undefined && { variant: overrides.variant }),
});

describe('CTA (component layer)', () => {
  it('paints the dark-bg token on the default-variant container', async () => {
    const html = await renderAstro(CTA, { props: cta() });
    // classList.contains is token-aware and whitespace-insensitive — defends
    // against the trailing-space substring trap when one Tailwind utility is
    // a prefix of another.
    const container = region(parse(html));
    expect(container.classList.contains('bg-foreground-950')).toBe(true);
    expect(container.classList.contains('bg-white/10')).toBe(false);
  });

  it('paints the bg-white/10 token on the glass-variant container', async () => {
    // The `isGlass` branch at CTA.astro:96-98 selects this token-set. Forcing
    // `containerClasses` to the default branch unconditionally turns this
    // assertion red — verified locally as the mutation-pair acceptance for
    // this commit.
    const html = await renderAstro(CTA, { props: cta({ variant: 'glass' }) });
    const container = region(parse(html));
    expect(container.classList.contains('bg-white/10')).toBe(true);
    expect(container.classList.contains('bg-foreground-950')).toBe(false);
  });

  it('round-trips slugified headline + description ids through aria-labelledby and aria-describedby', async () => {
    const html = await renderAstro(CTA, {
      props: cta({ headline: 'Ready to Get Started?' }),
    });
    const doc = parse(html);
    const container = region(doc);
    const headlineId = container.getAttribute('aria-labelledby');
    const descriptionId = container.getAttribute('aria-describedby');
    expect(headlineId).toBe('cta-ready-to-get-started');
    expect(descriptionId).toBe('cta-ready-to-get-started-desc');
    const heading = doc.querySelector('h2');
    assertNotNull(heading);
    expect(heading.getAttribute('id')).toBe(headlineId);
    const description = doc.querySelector(`p#${descriptionId}`);
    assertNotNull(description);
  });

  it('uses h2 by default and honours headingLevel="h3"', async () => {
    const defaultHtml = await renderAstro(CTA, { props: cta() });
    const h3Html = await renderAstro(CTA, { props: cta({ headingLevel: 'h3' }) });
    const defaultDoc = parse(defaultHtml);
    const h3Doc = parse(h3Html);
    expect(defaultDoc.querySelector('h2')).not.toBeNull();
    expect(defaultDoc.querySelector('h3')).toBeNull();
    expect(h3Doc.querySelector('h3')).not.toBeNull();
    expect(h3Doc.querySelector('h2')).toBeNull();
  });

  it('renders the secondary link iff secondaryCta is supplied', async () => {
    // Fixture-agnostic: the assertion targets the secondary link by its
    // `href` rather than by ordinal position, so it stays correct regardless
    // of whether the primary CTA renders as <a> or <button>.
    const secondary: SecondaryCta = { label: 'Learn More', href: '/about' };
    const withSecondary = await renderAstro(CTA, {
      props: cta({ secondaryCta: secondary }),
    });
    const withoutSecondary = await renderAstro(CTA, { props: cta() });
    const present = parse(withSecondary).querySelector<HTMLAnchorElement>(
      `a[href="${secondary.href}"]`,
    );
    assertNotNull(present);
    // TextLink appends an unconditional arrow span ("→"), so assert the
    // secondary label is present in the link's text rather than equal to it.
    // Concept §3.2.4 specifies "non-null element bearing the secondary label
    // text" — substring match satisfies that contract without coupling to
    // TextLink's arrow.
    expect(present.textContent ?? '').toContain(secondary.label);
    expect(parse(withoutSecondary).querySelector(`a[href="${secondary.href}"]`)).toBeNull();
  });
});
