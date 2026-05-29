import { describe, expect, it } from 'vitest';
import type { CoachId } from '~/data/coaches';
import type { ServiceId } from '~/data/services';
import { getServiceById } from '~/data/services';
import { remoteImage } from '~/types/components';
import type {
  StoryDetail,
  StoryId,
  StoryStats,
  StoryWithDetail,
  SuccessStory,
} from './successStories';
import {
  hasDetailPage,
  relatedStoriesFor,
  storyIds,
  successStories,
  successStoriesById,
  successStoriesSection,
  successStoryDetailHref,
} from './successStories';

const baseDetail: StoryDetail = {
  startingPoint: 'test starting point',
  whatIWasLookingFor: 'test motivation',
  howWeWorked: 'test process',
  turningPoint: 'test turning point',
  pullQuote: 'test pull quote',
  pastSelfMessage: 'test past self message',
  processStats: [
    { target: 24, label: 'check-ins' },
    { target: 12, label: 'plan adjustments' },
  ],
  results: [
    { target: 30, suffix: ' lbs', label: 'lost' },
    { target: 6, suffix: ' months', label: 'duration' },
  ],
  coachNote: 'test coach note',
  progressImage: {
    image: remoteImage('https://example.com/progress.jpg', 800, 600),
    alt: 'test alt text',
  },
};

function makeDetailStory(
  overrides: Pick<StoryWithDetail, 'name' | 'slug' | 'serviceId' | 'coach'> &
    Partial<Omit<StoryWithDetail, 'name' | 'slug' | 'serviceId' | 'coach'>>,
): StoryWithDetail {
  // The fixture's `id` is sourced from the slug — synthetic test fixtures
  // (`gina-jacked`, `t`) are not registered StoryIds, but the factory's
  // consumers care about the SuccessStory shape, not registry membership.
  // Production consumers that look up via `successStoriesById[id]` use the
  // real `successStories` array, never these synthetic fixtures.
  const id = (overrides.id ?? overrides.slug) as StoryId;
  return {
    id,
    name: overrides.name,
    slug: overrides.slug,
    age: overrides.age ?? 30,
    serviceId: overrides.serviceId,
    coach: overrides.coach,
    transformation: overrides.transformation ?? 'Test transformation',
    quote: overrides.quote ?? 'Test quote',
    duration: overrides.duration ?? '6 months',
    beforeImage: overrides.beforeImage ?? remoteImage('https://example.com/before.jpg', 800, 1000),
    afterImage: overrides.afterImage ?? remoteImage('https://example.com/after.jpg', 800, 1000),
    detail: overrides.detail ?? baseDetail,
  };
}

function makeLegacyStory(overrides: {
  id: StoryId;
  name: string;
  serviceId: ServiceId;
  coach: CoachId;
}): SuccessStory {
  // makeDetailStory cannot produce legacy stories — it always sets slug, age,
  // and detail, so hasDetailPage returns true. This local builder emits a
  // legacy-shaped story (no slug, no age, no detail) that hasDetailPage
  // rejects, parallel to the makeDetailStory factory above. Synthetic ids
  // ('z-legacy', 'a-legacy') are not registered StoryIds, but legacy stories
  // are never looked up via successStoriesById, so the cast is fixture-local
  // (same rationale as the makeDetailStory id note above).
  return {
    id: overrides.id,
    name: overrides.name,
    serviceId: overrides.serviceId,
    coach: overrides.coach,
    transformation: 'Test transformation',
    quote: 'Test quote',
    duration: '6 months',
    beforeImage: remoteImage('https://example.com/before.jpg', 800, 1000),
    afterImage: remoteImage('https://example.com/after.jpg', 800, 1000),
  };
}

describe('successStoryDetailHref', () => {
  it('returns /success-stories/<slug> for a plain ASCII slug', () => {
    expect(successStoryDetailHref('sarah-m')).toBe('/success-stories/sarah-m');
  });

  it('preserves the slug verbatim (no encoding for plain ASCII)', () => {
    expect(successStoryDetailHref('jessica-k')).toBe('/success-stories/jessica-k');
  });
});

describe('hasDetailPage', () => {
  it('reports detail-eligibility correctly for all production stories', () => {
    // Sarah M. is the only detail-eligible story today (pilot 1).
    // Update this list when more pilots land (Dana T., Rachel W., Jessica K.).
    const expectedSlugsWithDetail = ['sarah-m'];

    const actualSlugsWithDetail = successStories.filter(hasDetailPage).map((s) => s.slug);

    expect([...actualSlugsWithDetail].sort((a, b) => a.localeCompare(b))).toEqual(
      [...expectedSlugsWithDetail].sort((a, b) => a.localeCompare(b)),
    );
  });

  it('returns true when slug, age, and detail are all set', () => {
    const story = makeDetailStory({
      name: 'Test',
      slug: 'test',
      serviceId: 'get-lean',
      coach: 'gina',
    });
    expect(hasDetailPage(story)).toBe(true);
  });

  it('returns false when slug is missing', () => {
    const base = makeDetailStory({ name: 'T', slug: 't', serviceId: 'get-lean', coach: 'gina' });
    const story: SuccessStory = { ...base, slug: undefined };
    expect(hasDetailPage(story)).toBe(false);
  });

  it('returns false when age is missing', () => {
    const base = makeDetailStory({ name: 'T', slug: 't', serviceId: 'get-lean', coach: 'gina' });
    const story: SuccessStory = { ...base, age: undefined };
    expect(hasDetailPage(story)).toBe(false);
  });

  it('returns false when detail is missing', () => {
    const base = makeDetailStory({ name: 'T', slug: 't', serviceId: 'get-lean', coach: 'gina' });
    const story: SuccessStory = { ...base, detail: undefined };
    expect(hasDetailPage(story)).toBe(false);
  });
});

describe('relatedStoriesFor', () => {
  const sarah = makeDetailStory({
    name: 'Sarah M.',
    slug: 'sarah-m',
    serviceId: 'get-lean',
    coach: 'gina',
  });
  const dana = makeDetailStory({
    name: 'Dana T.',
    slug: 'dana-t',
    serviceId: 'get-jacked',
    coach: 'irene',
  });
  const rachel = makeDetailStory({
    name: 'Rachel W.',
    slug: 'rachel-w',
    serviceId: 'get-lean',
    coach: 'gina',
  });
  const jessica = makeDetailStory({
    name: 'Jessica K.',
    slug: 'jessica-k',
    serviceId: 'competition-prep',
    coach: 'helle',
  });
  // Synthetic fixture for bucket-2 isolation: same coach as sarah (gina) but
  // different service (get-jacked). Not in detailPool — used in its own
  // local pool so the bucket-2 path is testable without a same-service match
  // intercepting first.
  const ginaJacked = makeDetailStory({
    name: 'Gina Jacked',
    slug: 'gina-jacked',
    serviceId: 'get-jacked',
    coach: 'gina',
  });

  const detailPool: readonly SuccessStory[] = [sarah, dana, rachel, jessica];

  it('excludes the current story', () => {
    const result = relatedStoriesFor(sarah, detailPool);
    expect(result.find((s) => s.slug === 'sarah-m')).toBeUndefined();
  });

  it('prefers same-service detail stories first', () => {
    // sarah is get-lean/gina; rachel is get-lean/gina (same service AND same coach,
    // but bucket 1 catches "same service" first regardless of coach)
    const result = relatedStoriesFor(sarah, detailPool);
    expect(result[0]?.slug).toBe('rachel-w');
  });

  it('places same-coach different-service stories in bucket 2', () => {
    // sarah (get-lean/gina) with a pool that has no other get-lean detail
    // story: bucket 1 (same service) is empty; bucket 2 (same coach,
    // different service) catches ginaJacked.
    const result = relatedStoriesFor(sarah, [sarah, ginaJacked]);
    expect(result.map((s) => s.slug)).toEqual(['gina-jacked']);
  });

  it('falls back to other detail stories when same-service and same-coach are exhausted', () => {
    // jessica is competition-prep/helle, the only such story in the pool
    // bucket 1 (same service) = []; bucket 2 (same coach) = [];
    // bucket 3 (other detail) = [dana, rachel, sarah] sorted alphabetically
    const result = relatedStoriesFor(jessica, detailPool);
    expect(result.map((s) => s.slug)).toEqual(['dana-t', 'rachel-w', 'sarah-m']);
  });

  it('returns at most limit stories (default 3)', () => {
    const result = relatedStoriesFor(sarah, detailPool);
    expect(result.length).toBeLessThanOrEqual(3);
  });

  it('respects a custom limit', () => {
    const result = relatedStoriesFor(jessica, detailPool, 2);
    expect(result.length).toBe(2);
  });

  it('falls back to legacy stories when the detail pool is exhausted', () => {
    // Pool = sarah (only detail story) + all 6 legacy stories from successStories
    const onlyOneDetail: readonly SuccessStory[] = [sarah, ...successStories];
    const result = relatedStoriesFor(sarah, onlyOneDetail);
    expect(result.length).toBe(3);
    // All three results are legacy (no slug)
    for (const story of result) {
      expect(story.slug).toBeUndefined();
    }
  });

  it('sorts alphabetically by name within the other-detail bucket', () => {
    const result = relatedStoriesFor(jessica, detailPool);
    const names = result.map((s) => s.name);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
  });

  it('sorts the same-service bucket alphabetically by name', () => {
    const carla = makeDetailStory({
      name: 'Carla M.',
      slug: 'carla-m',
      serviceId: 'get-lean',
      coach: 'irene',
    });
    const alice = makeDetailStory({
      name: 'Alice K.',
      slug: 'alice-k',
      serviceId: 'get-lean',
      coach: 'helle',
    });
    // carla (irene) and alice (helle) are both a different coach from sarah
    // (gina), so bucket 1 (same service, get-lean) catches both. If a future
    // edit made either coach 'gina', bucket 2 would intercept one and break
    // this bucket-isolation. Declaration order [Carla, Alice] is
    // non-alphabetical (C > A): with .sort(byName) the result is
    // [Alice, Carla]; replacing byName with () => 0 preserves source order
    // [Carla, Alice], which fails this assertion.
    const result = relatedStoriesFor(sarah, [sarah, carla, alice]);
    expect(result.map((s) => s.name)).toEqual(['Alice K.', 'Carla M.']);
  });

  it('sorts the same-coach bucket alphabetically by name', () => {
    const ginaComp = makeDetailStory({
      name: 'Anna Comp.',
      slug: 'anna-comp',
      serviceId: 'competition-prep',
      coach: 'gina',
    });
    // Both ginaJacked and ginaComp are coach 'gina', service != get-lean, so
    // bucket 1 (same service) is empty and bucket 2 (same coach) catches both.
    // Declaration order [ginaJacked, ginaComp] = [Gina Jacked, Anna Comp.] is
    // non-alphabetical (G > A): with .sort(byName) the result is
    // [Anna Comp., Gina Jacked]; replacing byName with () => 0 preserves
    // source order [Gina Jacked, Anna Comp.], which fails this assertion.
    const result = relatedStoriesFor(sarah, [sarah, ginaJacked, ginaComp]);
    expect(result.map((s) => s.name)).toEqual(['Anna Comp.', 'Gina Jacked']);
  });

  it('sorts the legacy bucket alphabetically by name', () => {
    const zoeLegacy = makeLegacyStory({
      id: 'z-legacy' as StoryId,
      name: 'Zoe X.',
      serviceId: 'get-lean',
      coach: 'gina',
    });
    const alexLegacy = makeLegacyStory({
      id: 'a-legacy' as StoryId,
      name: 'Alex Y.',
      serviceId: 'get-lean',
      coach: 'gina',
    });
    // sarah is the only detail-eligible story; zoeLegacy and alexLegacy fail
    // hasDetailPage, so buckets 1/2/3 (detail) are empty and the legacy bucket
    // catches both. Declaration order [zoeLegacy, alexLegacy] = [Zoe X.,
    // Alex Y.] is non-alphabetical (Z > A): with .sort(byName) the result is
    // [Alex Y., Zoe X.]; replacing byName with () => 0 preserves source order
    // [Zoe X., Alex Y.], which fails this assertion. Uses a synthetic pool
    // (not the production successStories array, which is already alphabetical
    // in source order and would make this assertion vacuous).
    const result = relatedStoriesFor(sarah, [sarah, zoeLegacy, alexLegacy]);
    expect(result.map((s) => s.name)).toEqual(['Alex Y.', 'Zoe X.']);
  });

  it('returns an empty array if no candidates exist beyond current', () => {
    const result = relatedStoriesFor(sarah, [sarah]);
    expect(result).toEqual([]);
  });
});

describe('successStories data invariants', () => {
  it('no story has partial detail state (all-or-nothing invariant)', () => {
    // The schema documents slug/age/detail as a triple: a story either has
    // all three (detail-eligible) or none (legacy). Catches a future
    // migration that sets only slug while forgetting age or detail —
    // hasDetailPage would silently treat it as legacy without this guard.
    for (const story of successStories) {
      const definedCount = [story.slug, story.age, story.detail].filter(
        (field) => field !== undefined,
      ).length;
      expect(
        definedCount === 0 || definedCount === 3,
        `${story.name} has partial detail state (${definedCount}/3 fields set)`,
      ).toBe(true);
    }
  });

  it('no transformation embeds a duration (metric-only convention)', () => {
    // `transformation` must stay metric-only; `duration` owns the timeframe.
    // The detail-page meta description template composes
    // `${transformation} in ${duration}.`, so any story with an embedded
    // " in " inside `transformation` would render the duration twice.
    // Substring match uses spaces around "in" to avoid false positives on
    // words like "within" or "inside".
    for (const story of successStories) {
      expect(
        story.transformation.includes(' in '),
        `${story.name}: transformation "${story.transformation}" embeds a duration; move the timeframe to the duration field`,
      ).toBe(false);
    }
  });

  it('every referenced service exposes a non-empty contactHref', () => {
    // The read-more modal's in-popup CTA targets
    // `getServiceById(story.serviceId).contactHref` unconditionally — there is
    // no detail-page fallback (deliberate funnel design, ADR-0043). A future
    // service shipped with an empty `contactHref` would silently render
    // `<a href="">`, breaking the bottom-of-funnel conversion path. This
    // invariant fails before the bad data ships.
    for (const story of successStories) {
      const service = getServiceById(story.serviceId);
      expect(
        service.contactHref.length > 0,
        `${story.name}: service "${story.serviceId}" has empty contactHref`,
      ).toBe(true);
    }
  });

  it('every successStoriesById key matches the inner story id', () => {
    // The `as const satisfies Record<StoryId, SuccessStory>` lift on
    // `successStoriesById` proves every storyId has an entry, but does not
    // guarantee the entry's `id` field matches its key. A drift here would
    // surface as a wrong `data-success-story-id` on the read-more trigger.
    for (const id of storyIds) {
      expect(successStoriesById[id].id, `successStoriesById['${id}'].id mismatch`).toBe(id);
    }
  });
});

describe('successStoriesSection.highlightedSuccessStoryIds', () => {
  it('contains exactly three story ids (curated home subset)', () => {
    expect(successStoriesSection.highlightedSuccessStoryIds.length).toBe(3);
  });

  it('every entry references a registered StoryId', () => {
    for (const id of successStoriesSection.highlightedSuccessStoryIds) {
      expect(storyIds, `highlightedSuccessStoryIds references unknown id "${id}"`).toContain(id);
    }
  });
});

describe('StoryStats type-level cap', () => {
  it('accepts a literal of exactly eight stat tiles', () => {
    const eight: StoryStats = [
      { target: 1, label: 'a' },
      { target: 2, label: 'b' },
      { target: 3, label: 'c' },
      { target: 4, label: 'd' },
      { target: 5, label: 'e' },
      { target: 6, label: 'f' },
      { target: 7, label: 'g' },
      { target: 8, label: 'h' },
    ];
    expect(eight.length).toBe(8);
  });

  it('rejects a literal of nine stat tiles at compile time', () => {
    // @ts-expect-error — a 9-tile literal must not type-check as StoryStats
    // (1..8 union); the eight-rule :nth-child stagger range in global.css is
    // the cap.
    const nine: StoryStats = [
      { target: 1, label: 'a' },
      { target: 2, label: 'b' },
      { target: 3, label: 'c' },
      { target: 4, label: 'd' },
      { target: 5, label: 'e' },
      { target: 6, label: 'f' },
      { target: 7, label: 'g' },
      { target: 8, label: 'h' },
      { target: 9, label: 'i' },
    ];
    expect(nine.length).toBe(9);
  });
});
