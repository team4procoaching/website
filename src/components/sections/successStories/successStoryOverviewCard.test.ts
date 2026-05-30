// This file imports jsdom as a library (`new JSDOM(html)`) rather than
// switching the test environment to jsdom via Vitest's environment pragma.
// The pragma route conflicts with the Astro Container API's esbuild-init
// invariant on the current Vitest/Node/Astro/esbuild combo; the
// JSDOM-instance route sidesteps the realm clash. See ADR-0037
// §Conventions for the full chain.
import { JSDOM } from 'jsdom';
import { describe, expect, it } from 'vitest';
import { MODAL_IDS } from '~/data/ids';
import type { SuccessStory } from '~/data/successStories';
import { assertNotNull } from '~/test-utils/assertions';
import { renderAstro } from '~/test-utils/renderAstro';
import { remoteImage } from '~/types/components';
import SuccessStoryOverviewCard from './SuccessStoryOverviewCard.astro';

function parse(html: string): Document {
  return new JSDOM(html).window.document;
}

const baseStory: SuccessStory = {
  id: 'sarah-m',
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
    expect(trigger.dataset.successStoryId).toBe('sarah-m');
  });

  it('routes the service-discovery pill to the contact prefill when the service has no detail content', async () => {
    // `get-lean` carries no `lead`/`detailedFeatures` triple at launch, so
    // `hasCompleteDetailContent` returns false and the badge href falls
    // back to `service.contactHref`. The selector is anchored on the
    // badge's aria-label (specific to the pill) so a regression that
    // re-introduces a coincidentally-href-matching legacy <a> would not
    // fool the assertion.
    const doc = parse(await renderAstro(SuccessStoryOverviewCard, { props: { story: baseStory } }));
    const link = doc.querySelector<HTMLAnchorElement>(
      'a[aria-label="Read more about Get Lean coaching"]',
    );
    assertNotNull(link);
    expect(link.getAttribute('href')).toBe('/contact?service=get-lean');
  });

  it('routes the service-discovery pill to the detail page when the service has complete detail content', async () => {
    // `competition-prep` is the only service that ships the detail-page
    // launch-gate today, so the resolver chooses `serviceDetailHref`.
    const competitionStory: SuccessStory = {
      ...baseStory,
      id: 'jessica-k',
      name: 'Jessica K.',
      serviceId: 'competition-prep',
      coach: 'helle',
    };
    const doc = parse(
      await renderAstro(SuccessStoryOverviewCard, { props: { story: competitionStory } }),
    );
    const link = doc.querySelector<HTMLAnchorElement>(
      'a[aria-label="Read more about Competition Prep coaching"]',
    );
    assertNotNull(link);
    expect(link.getAttribute('href')).toBe('/services/competition-prep');
  });

  it('renders the service display name in the pill text', async () => {
    // Display label resolves through `getServiceById(story.serviceId).name`,
    // not through any retired program-label map.
    const doc = parse(await renderAstro(SuccessStoryOverviewCard, { props: { story: baseStory } }));
    const link = doc.querySelector<HTMLAnchorElement>(
      'a[aria-label="Read more about Get Lean coaching"]',
    );
    assertNotNull(link);
    expect(link.textContent).toContain('Get Lean');
  });

  it('personalises the read-more button label on the client first name', async () => {
    const doc = parse(
      await renderAstro(SuccessStoryOverviewCard, {
        props: { story: storyWithLongTestimony },
      }),
    );
    const trigger = doc.querySelector<HTMLButtonElement>('button[command="show-modal"]');
    assertNotNull(trigger);
    // Whitespace inside the rendered button can include surrounding line
    // breaks from Astro's element output; assert against the trimmed text.
    expect(trigger.textContent?.trim()).toBe("Hear Sarah's full story →");
    expect(trigger.getAttribute('aria-label')).toBe("Read Sarah's full story");
  });

  it('falls back to a generic label when getFirstName returns null', async () => {
    // Whitespace-only name short-circuits getFirstName to null. The button
    // renders the generic template instead of the personalised one — the
    // rendered output stays grammatical for every input shape.
    const fallbackStory: SuccessStory = {
      ...storyWithLongTestimony,
      name: '   ',
    };
    const doc = parse(
      await renderAstro(SuccessStoryOverviewCard, { props: { story: fallbackStory } }),
    );
    const trigger = doc.querySelector<HTMLButtonElement>('button[command="show-modal"]');
    assertNotNull(trigger);
    expect(trigger.textContent?.trim()).toBe('Hear the full story →');
    expect(trigger.getAttribute('aria-label')).toBe('Read the full story');
  });

  it('does not render the legacy inline service-name link with the chevron-pair signature', async () => {
    // Negative assertion: the previous card emitted `<a>» Get Lean →</a>`
    // inline below the heading. The selector pivots to a JS-side filter
    // because CSS does not support text-content predicates. Any anchor
    // whose text contains both `»` and `→` would match the legacy pattern.
    // The new badge uses `›` (single right-angle), so it cannot collide.
    const doc = parse(await renderAstro(SuccessStoryOverviewCard, { props: { story: baseStory } }));
    const legacyMatches = Array.from(doc.querySelectorAll('a')).filter((a) => {
      const text = a.textContent ?? '';
      return text.includes('»') && text.includes('→');
    });
    expect(legacyMatches).toHaveLength(0);
  });

  it('applies the .hover-scale class to the card root', async () => {
    const doc = parse(await renderAstro(SuccessStoryOverviewCard, { props: { story: baseStory } }));
    const article = doc.querySelector<HTMLElement>('article');
    assertNotNull(article);
    expect(article.classList.contains('hover-scale')).toBe(true);
  });
});
