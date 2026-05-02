// This file imports jsdom as a library (`new JSDOM(html)`) rather than
// switching the test environment to jsdom via Vitest's environment pragma.
// The pragma route conflicts with the Astro Container API's esbuild-init
// invariant on the current Vitest/Node/Astro/esbuild combo; the
// JSDOM-instance route sidesteps the realm clash. See ADR-0037
// §Conventions for the full chain.
import { JSDOM } from 'jsdom';
import { describe, expect, it } from 'vitest';
import type { ClientChatScreenshot } from '~/data/clientChatScreenshots';
import { renderAstro } from '~/test-utils/renderAstro';
import { remoteImage } from '~/types/components';
import ClientChatScreenshots from './ClientChatScreenshots.astro';

function parse(html: string): Document {
  return new JSDOM(html).window.document;
}

const populated: readonly ClientChatScreenshot[] = [
  {
    id: 'sarah-week-12',
    coachId: 'gina',
    captionFirstName: 'Sarah',
    captionContext: 'week 12',
    screenshotImage: remoteImage('https://example.test/sarah-chat.jpg', 360, 780),
    screenshotAlt: 'Coach-to-Sarah chat screenshot at week twelve.',
  },
  {
    id: 'jessica-stage-day',
    coachId: 'helle',
    captionFirstName: 'Jessica',
    captionContext: 'stage day',
    screenshotImage: remoteImage('https://example.test/jessica-chat.jpg', 360, 780),
    screenshotAlt: 'Coach-to-Jessica chat screenshot on stage day.',
  },
];

describe('ClientChatScreenshots (component layer)', () => {
  it('renders nothing when the screenshots array is empty (data-presence flag)', async () => {
    const html = await renderAstro(ClientChatScreenshots, {
      props: { screenshots: [] },
    });
    const doc = parse(html);
    // No section landmark, no headline, no card — the data-presence flag
    // means the surface stays out of the DOM until real assets land.
    expect(doc.querySelector('section')).toBeNull();
    expect(doc.querySelector('h2')).toBeNull();
  });

  it('renders one card per entry when the screenshots array is populated', async () => {
    const doc = parse(
      await renderAstro(ClientChatScreenshots, { props: { screenshots: populated } }),
    );
    // `<figure>` is the per-card root in `ChatScreenshotCard.astro`.
    expect(doc.querySelectorAll('figure')).toHaveLength(populated.length);
  });

  it('renders the populated headline and caption text', async () => {
    const doc = parse(
      await renderAstro(ClientChatScreenshots, { props: { screenshots: populated } }),
    );
    const heading = doc.querySelector('h2');
    expect(heading?.textContent?.trim()).toBe('What Our Clients Say');
    // First-name + context appear in the figcaption per card.
    expect(doc.body.textContent).toContain('Sarah');
    expect(doc.body.textContent).toContain('week 12');
    expect(doc.body.textContent).toContain('Jessica');
    expect(doc.body.textContent).toContain('stage day');
  });
});
