// This file imports jsdom as a library (`new JSDOM(html)`) rather than
// switching the test environment to jsdom via Vitest's environment pragma.
// The pragma route conflicts with the Astro Container API's esbuild-init
// invariant on the current Vitest/Node/Astro/esbuild combo; the
// JSDOM-instance route sidesteps the realm clash. See ADR-0037
// §Conventions and the PR-body deviation note for the full chain.
import { JSDOM } from 'jsdom';
import { describe, expect, it } from 'vitest';
import { renderAstro } from '~/test-utils/renderAstro';
import ProcessSteps from './ProcessSteps.astro';

function parse(html: string): Document {
  return new JSDOM(html).window.document;
}

function firstStepParagraph(doc: Document): HTMLParagraphElement {
  const p = doc.querySelector<HTMLParagraphElement>('li p');
  if (p === null) throw new Error('step <p> not found in rendered DOM');
  return p;
}

describe('ProcessSteps (component layer)', () => {
  it('renders description when compact and shortDescription is absent', async () => {
    const html = await renderAstro(ProcessSteps, {
      props: {
        size: 'compact',
        headline: 'X',
        steps: [{ number: 1, title: 'T', description: 'LONG' }],
      },
    });
    const text = firstStepParagraph(parse(html)).textContent?.trim();
    expect(text).toBe('LONG');
  });

  it('prefers shortDescription over description when compact and both are present', async () => {
    const html = await renderAstro(ProcessSteps, {
      props: {
        size: 'compact',
        headline: 'X',
        steps: [{ number: 1, title: 'T', description: 'LONG', shortDescription: 'SHORT' }],
      },
    });
    const text = firstStepParagraph(parse(html)).textContent?.trim();
    expect(text).toBe('SHORT');
  });

  it('renders no eyebrow paragraph when eyebrow is an empty string', async () => {
    const html = await renderAstro(ProcessSteps, {
      props: {
        eyebrow: '',
        headline: 'X',
        steps: [{ number: 1, title: 'T', description: 'LONG' }],
      },
    });
    const doc = parse(html);
    expect(doc.querySelector('p[class*="text-accent-"]')).toBeNull();
  });

  it('paints bg-background-muted when background="muted" and bg-background by default', async () => {
    const stepsFixture = [{ number: 1, title: 'T', description: 'LONG' }];
    const mutedHtml = await renderAstro(ProcessSteps, {
      props: { background: 'muted', headline: 'X', steps: stepsFixture },
    });
    const defaultHtml = await renderAstro(ProcessSteps, {
      props: { headline: 'X', steps: stepsFixture },
    });
    const mutedSection = parse(mutedHtml).querySelector('section');
    const defaultSection = parse(defaultHtml).querySelector('section');
    if (mutedSection === null) throw new Error('muted <section> not found');
    if (defaultSection === null) throw new Error('default <section> not found');
    // classList.contains is token-aware and whitespace-insensitive — defends
    // against the trailing-space substring trap when 'bg-background' is a
    // prefix of 'bg-background-muted'.
    expect(mutedSection.classList.contains('bg-background-muted')).toBe(true);
    expect(mutedSection.classList.contains('bg-background')).toBe(false);
    expect(defaultSection.classList.contains('bg-background')).toBe(true);
    expect(defaultSection.classList.contains('bg-background-muted')).toBe(false);
  });
});
