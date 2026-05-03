// This file imports jsdom as a library (`new JSDOM(html)`) rather than
// switching the test environment to jsdom via Vitest's environment pragma.
// The pragma route conflicts with the Astro Container API's esbuild-init
// invariant on the current Vitest/Node/Astro/esbuild combo; the
// JSDOM-instance route sidesteps the realm clash. See ADR-0037
// §Conventions for the full chain.
import { JSDOM } from 'jsdom';
import { describe, expect, it } from 'vitest';
import type { StoryDetail, StoryId, SuccessStory } from '~/data/successStories';
import { assertNotNull } from '~/test-utils/assertions';
import { renderAstro } from '~/test-utils/renderAstro';
import { remoteImage } from '~/types/components';
import SuccessStoryGridCard from './SuccessStoryGridCard.astro';

function parse(html: string): Document {
  return new JSDOM(html).window.document;
}

const sampleImage = remoteImage('https://example.test/x.jpg', 800, 1000);

const detailStub: StoryDetail = {
  startingPoint: 'Starting point.',
  whatIWasLookingFor: 'Motivation.',
  howWeWorked: 'Process and individualisation.',
  turningPoint: 'Turning point.',
  pullQuote: 'A different sentence than the teaser.',
  pastSelfMessage: 'Message to past self.',
  processStats: [{ target: 24, label: 'check-ins' }],
  results: [{ target: 30, suffix: ' lbs', label: 'lost' }],
  coachNote: 'Coach note.',
  progressImage: { image: sampleImage, alt: 'Progress' },
};

/** Detail-eligible story (slug + age + detail triple satisfies hasDetailPage). */
const detailEligibleStory: SuccessStory = {
  id: 'sarah-m' as StoryId,
  name: 'Sarah M.',
  beforeImage: sampleImage,
  afterImage: sampleImage,
  transformation: 'Lost 30lbs',
  serviceId: 'get-lean',
  coach: 'gina',
  quote: 'Working with Gina changed everything.',
  duration: '6 months',
  slug: 'sarah-m',
  age: 32,
  detail: detailStub,
};

/** Legacy story — no detail triple, hasDetailPage returns false. */
const legacyStory: SuccessStory = {
  id: 'jessica-k' as StoryId,
  name: 'Jessica K.',
  beforeImage: sampleImage,
  afterImage: sampleImage,
  transformation: 'Got stage-ready',
  serviceId: 'competition-prep',
  coach: 'helle',
  quote: 'Helle saw what I could not.',
  duration: '8 months',
};

describe('SuccessStoryGridCard (component layer)', () => {
  it('routes the service-discovery pill to the contact prefill when the service has no detail content', async () => {
    // `get-lean` carries no `lead`/`detailedFeatures` triple at launch, so
    // `hasCompleteDetailContent` returns false and the badge href falls
    // back to `service.contactHref`. The selector keys on the badge
    // aria-label so a coincidentally href-matching unrelated anchor
    // would not fool the assertion.
    const doc = parse(
      await renderAstro(SuccessStoryGridCard, { props: { story: detailEligibleStory } }),
    );
    const pill = doc.querySelector<HTMLAnchorElement>(
      'a[aria-label="Read more about Get Lean coaching"]',
    );
    assertNotNull(pill);
    expect(pill.getAttribute('href')).toBe('/contact?service=get-lean');
  });

  it('routes the service-discovery pill to the detail page when the service has complete detail content', async () => {
    // `competition-prep` is the only service that ships the detail-page
    // launch-gate today, so the resolver chooses `serviceDetailHref`.
    const doc = parse(await renderAstro(SuccessStoryGridCard, { props: { story: legacyStory } }));
    const pill = doc.querySelector<HTMLAnchorElement>(
      'a[aria-label="Read more about Competition Prep coaching"]',
    );
    assertNotNull(pill);
    expect(pill.getAttribute('href')).toBe('/services/competition-prep');
  });

  it('renders the foot button as an <a> linking to the detail page when hasDetailPage is true', async () => {
    const doc = parse(
      await renderAstro(SuccessStoryGridCard, { props: { story: detailEligibleStory } }),
    );
    const detailLink = doc.querySelector<HTMLAnchorElement>('a[href="/success-stories/sarah-m"]');
    assertNotNull(detailLink);
    expect(detailLink.tagName).toBe('A');
  });

  it('omits the foot button entirely for legacy stories without slug/age/detail', async () => {
    // The legacy story is missing the slug/age/detail triple, so
    // hasDetailPage returns false and the foot button must not render.
    const doc = parse(await renderAstro(SuccessStoryGridCard, { props: { story: legacyStory } }));
    const allAnchors = Array.from(doc.querySelectorAll<HTMLAnchorElement>('a'));
    // The only anchor should be the service-discovery pill — no detail-page
    // link, no escape link.
    expect(allAnchors).toHaveLength(1);
    expect(allAnchors[0]?.getAttribute('aria-label')).toBe(
      'Read more about Competition Prep coaching',
    );
  });

  it('personalises the foot-button label on the client first name', async () => {
    const doc = parse(
      await renderAstro(SuccessStoryGridCard, { props: { story: detailEligibleStory } }),
    );
    const detailLink = doc.querySelector<HTMLAnchorElement>('a[href="/success-stories/sarah-m"]');
    assertNotNull(detailLink);
    expect(detailLink.textContent?.trim()).toBe("Read Sarah's full story →");
  });

  it('falls back to a generic foot-button label when getFirstName returns null', async () => {
    // Whitespace-only name short-circuits getFirstName to null, triggering
    // the generic-template branch. The detail-eligible triple is preserved
    // so the foot button still renders.
    const fallbackStory: SuccessStory = {
      ...detailEligibleStory,
      name: '   ',
    };
    const doc = parse(await renderAstro(SuccessStoryGridCard, { props: { story: fallbackStory } }));
    const detailLink = doc.querySelector<HTMLAnchorElement>('a[href="/success-stories/sarah-m"]');
    assertNotNull(detailLink);
    expect(detailLink.textContent?.trim()).toBe('Read the full story →');
  });

  it('drops the legacy stretched-link, focus-within ring, and hover:shadow-xl tokens; keeps hover-scale on the root', async () => {
    const doc = parse(
      await renderAstro(SuccessStoryGridCard, { props: { story: detailEligibleStory } }),
    );

    const article = doc.querySelector<HTMLElement>('article');
    assertNotNull(article);
    const articleClass = article.className;

    // hover-scale on the root.
    expect(article.classList.contains('hover-scale')).toBe(true);

    // No focus-within ring or hover:shadow-xl tokens on the article — the
    // previous A2 stretched-link discipline is removed in favour of two
    // explicit precision targets.
    expect(articleClass).not.toContain('focus-within:ring');
    expect(articleClass).not.toContain('hover:shadow-xl');

    // No anchor uses the Bootstrap-style ::before stretched-link pattern.
    const anchors = Array.from(doc.querySelectorAll<HTMLAnchorElement>('a'));
    for (const anchor of anchors) {
      const cls = anchor.getAttribute('class') ?? '';
      expect(cls).not.toContain('before:absolute');
      expect(cls).not.toContain('before:inset-0');
    }
  });
});
