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
});
