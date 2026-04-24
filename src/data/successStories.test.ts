import { describe, expect, it } from 'vitest';
import { remoteImage } from '~/types/components';
import type { StoryDetail, StoryWithDetail, SuccessStory } from './successStories';
import {
  hasDetailPage,
  relatedStoriesFor,
  successStories,
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
    { value: '24', label: 'check-ins' },
    { value: '12', label: 'plan adjustments' },
  ],
  results: [
    { value: '30 lbs', label: 'lost' },
    { value: '6 months', label: 'duration' },
  ],
  coachNote: 'test coach note',
  progressImage: {
    image: remoteImage('https://example.com/progress.jpg', 800, 600),
    alt: 'test alt text',
  },
};

function makeDetailStory(
  overrides: Pick<StoryWithDetail, 'name' | 'slug' | 'program' | 'coach'> &
    Partial<Omit<StoryWithDetail, 'name' | 'slug' | 'program' | 'coach'>>,
): StoryWithDetail {
  return {
    name: overrides.name,
    slug: overrides.slug,
    age: overrides.age ?? 30,
    program: overrides.program,
    coach: overrides.coach,
    transformation: overrides.transformation ?? 'Test transformation',
    quote: overrides.quote ?? 'Test quote',
    duration: overrides.duration ?? '6 months',
    beforeImage: overrides.beforeImage ?? remoteImage('https://example.com/before.jpg', 800, 1000),
    afterImage: overrides.afterImage ?? remoteImage('https://example.com/after.jpg', 800, 1000),
    detail: overrides.detail ?? baseDetail,
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

    expect([...actualSlugsWithDetail].sort()).toEqual([...expectedSlugsWithDetail].sort());
  });

  it('returns true when slug, age, and detail are all set', () => {
    const story = makeDetailStory({
      name: 'Test',
      slug: 'test',
      program: 'lifestyle',
      coach: 'gina',
    });
    expect(hasDetailPage(story)).toBe(true);
  });

  it('returns false when slug is missing', () => {
    const base = makeDetailStory({ name: 'T', slug: 't', program: 'lifestyle', coach: 'gina' });
    const story: SuccessStory = { ...base, slug: undefined };
    expect(hasDetailPage(story)).toBe(false);
  });

  it('returns false when age is missing', () => {
    const base = makeDetailStory({ name: 'T', slug: 't', program: 'lifestyle', coach: 'gina' });
    const story: SuccessStory = { ...base, age: undefined };
    expect(hasDetailPage(story)).toBe(false);
  });

  it('returns false when detail is missing', () => {
    const base = makeDetailStory({ name: 'T', slug: 't', program: 'lifestyle', coach: 'gina' });
    const story: SuccessStory = { ...base, detail: undefined };
    expect(hasDetailPage(story)).toBe(false);
  });
});

describe('relatedStoriesFor', () => {
  const sarah = makeDetailStory({
    name: 'Sarah M.',
    slug: 'sarah-m',
    program: 'lifestyle',
    coach: 'gina',
  });
  const dana = makeDetailStory({
    name: 'Dana T.',
    slug: 'dana-t',
    program: 'muscle-building',
    coach: 'irene',
  });
  const rachel = makeDetailStory({
    name: 'Rachel W.',
    slug: 'rachel-w',
    program: 'lifestyle',
    coach: 'gina',
  });
  const jessica = makeDetailStory({
    name: 'Jessica K.',
    slug: 'jessica-k',
    program: 'competition-prep',
    coach: 'helle',
  });
  // Synthetic fixture for bucket-2 isolation: same coach as sarah (gina) but
  // different program (muscle-building). Not in detailPool — used in its own
  // local pool so the bucket-2 path is testable without a same-program match
  // intercepting first.
  const ginaMuscleBuilding = makeDetailStory({
    name: 'Gina Muscle',
    slug: 'gina-muscle',
    program: 'muscle-building',
    coach: 'gina',
  });

  const detailPool: readonly SuccessStory[] = [sarah, dana, rachel, jessica];

  it('excludes the current story', () => {
    const result = relatedStoriesFor(sarah, detailPool);
    expect(result.find((s) => s.slug === 'sarah-m')).toBeUndefined();
  });

  it('prefers same-program detail stories first', () => {
    // sarah is lifestyle/gina; rachel is lifestyle/gina (same program AND same coach,
    // but bucket 1 catches "same program" first regardless of coach)
    const result = relatedStoriesFor(sarah, detailPool);
    expect(result[0]?.slug).toBe('rachel-w');
  });

  it('places same-coach different-program stories in bucket 2', () => {
    // sarah (lifestyle/gina) with a pool that has no other lifestyle detail
    // story: bucket 1 (same program) is empty; bucket 2 (same coach,
    // different program) catches ginaMuscleBuilding.
    const result = relatedStoriesFor(sarah, [sarah, ginaMuscleBuilding]);
    expect(result.map((s) => s.slug)).toEqual(['gina-muscle']);
  });

  it('falls back to other detail stories when same-program and same-coach are exhausted', () => {
    // jessica is competition-prep/helle, the only such story in the pool
    // bucket 1 (same program) = []; bucket 2 (same coach) = [];
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
    expect(names).toEqual([...names].sort());
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
});
