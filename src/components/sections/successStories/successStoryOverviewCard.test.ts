// This file imports jsdom as a library (`new JSDOM(html)`) rather than
// switching the test environment to jsdom via Vitest's environment pragma.
// The pragma route conflicts with the Astro Container API's esbuild-init
// invariant on the current Vitest/Node/Astro/esbuild combo; the
// JSDOM-instance route sidesteps the realm clash. See ADR-0037
// §Conventions for the full chain.
import { JSDOM } from 'jsdom';
import { describe, expect, it } from 'vitest';
import { MODAL_IDS } from '~/data/ids';
import type { StoryId, SuccessStory } from '~/data/successStories';
import { assertNotNull } from '~/test-utils/assertions';
import { renderAstro } from '~/test-utils/renderAstro';
import { remoteImage } from '~/types/components';
import SuccessStoryOverviewCard from './SuccessStoryOverviewCard.astro';

function parse(html: string): Document {
  return new JSDOM(html).window.document;
}

const baseStory: SuccessStory = {
  id: 'sarah-m' as StoryId,
  name: 'Sarah M.',
  beforeImage: remoteImage('https://example.test/before.jpg', 800, 1000),
  afterImage: remoteImage('https://example.test/after.jpg', 800, 1000),
  transformation: 'Lost 30lbs',
  serviceId: 'get-lean',
  coach: 'gina',
  quote: 'Working with Gina changed everything.',
  duration: '6 months',
};

const storyWithLongTestimony: SuccessStory = {
  ...baseStory,
  longTestimony: 'A long-form story that earns the read-more affordance.',
};

describe('SuccessStoryOverviewCard (component layer)', () => {
  it('renders the read-more trigger only when longTestimony is set', async () => {
    const without = parse(
      await renderAstro(SuccessStoryOverviewCard, { props: { story: baseStory } }),
    );
    const withTestimony = parse(
      await renderAstro(SuccessStoryOverviewCard, {
        props: { story: storyWithLongTestimony },
      }),
    );

    expect(without.querySelector('button[command="show-modal"]')).toBeNull();
    const trigger = withTestimony.querySelector<HTMLButtonElement>('button[command="show-modal"]');
    assertNotNull(trigger);
    expect(trigger.getAttribute('commandfor')).toBe(MODAL_IDS.successStoryReadMore);
    expect(trigger.getAttribute('data-success-story-id')).toBe('sarah-m');
  });

  it('routes the service-name link to the contact prefill when the service has no detail content', async () => {
    // `get-lean` carries no `lead`/`detailedFeatures` triple at launch, so
    // `hasCompleteDetailContent` returns false and the link target falls
    // back to `service.contactHref`. The card never embeds the contact
    // path as a literal — the resolver does — so this assertion verifies
    // the resolver is wired in.
    const doc = parse(await renderAstro(SuccessStoryOverviewCard, { props: { story: baseStory } }));
    const link = doc.querySelector<HTMLAnchorElement>('a[href*="?service=get-lean"]');
    assertNotNull(link);
    expect(link.getAttribute('href')).toBe('/contact?service=get-lean');
  });

  it('routes the service-name link to the detail page when the service has complete detail content', async () => {
    // `competition-prep` is the only service that ships the detail-page
    // launch-gate today, so the resolver chooses `serviceDetailHref`.
    const competitionStory: SuccessStory = {
      ...baseStory,
      id: 'jessica-k' as StoryId,
      name: 'Jessica K.',
      serviceId: 'competition-prep',
      coach: 'helle',
    };
    const doc = parse(
      await renderAstro(SuccessStoryOverviewCard, { props: { story: competitionStory } }),
    );
    const link = doc.querySelector<HTMLAnchorElement>('a[href="/services/competition-prep"]');
    assertNotNull(link);
  });

  it('renders the service display name in the link text', async () => {
    // Display label resolves through `getServiceById(story.serviceId).name`,
    // not through any retired program-label map.
    const doc = parse(await renderAstro(SuccessStoryOverviewCard, { props: { story: baseStory } }));
    const link = doc.querySelector<HTMLAnchorElement>('a[href*="?service=get-lean"]');
    assertNotNull(link);
    expect(link.textContent).toContain('Get Lean');
  });
});
