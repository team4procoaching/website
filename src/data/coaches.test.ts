import { describe, expect, it } from 'vitest';
import { coachesExpanded, coachIds, getCoachById, getTotalExperience } from './coaches';

describe('getCoachById', () => {
  // `as const satisfies Record<CoachId, CoachExpanded>` guarantees completeness
  // at compile time; the runtime sanity check stays as a drift-tripwire in
  // case the satisfies constraint is ever loosened.
  it('returns a coach for every coachId whose inner id matches the key', () => {
    for (const id of coachIds) {
      expect(getCoachById(id).id).toBe(id);
    }
  });

  it('returns the named record for a known id', () => {
    expect(getCoachById('helle').name).toBe('Helle Trevino');
  });
});

describe('getTotalExperience', () => {
  it('aggregates coaching and competing years across all coaches', () => {
    // Anti-tautology: the expectation is computed via an explicit for…of loop
    // with scalar accumulators, structurally distinct from the production
    // function's `.reduce(...)` fold. A mutation that breaks the fold does not
    // necessarily break this loop, so the test is not killed by the same
    // mutation that would kill the production code.
    let expectedCoaching = 0;
    let expectedCompeting = 0;
    for (const coach of coachesExpanded) {
      expectedCoaching += coach.coachingYears;
      expectedCompeting += coach.competingYears;
    }

    expect(getTotalExperience()).toEqual({
      coaching: expectedCoaching,
      competing: expectedCompeting,
    });
  });

  it('returns positive integer totals for the current roster', () => {
    // Cheap killer for sign-perturbation (`+` → `-`) and dropped-accumulator
    // mutations: a flipped operator drives a total below zero, a swallowed
    // accumulator leaves one field at 0.
    const total = getTotalExperience();
    expect(total.coaching).toBeGreaterThan(0);
    expect(total.competing).toBeGreaterThan(0);
    expect(Number.isInteger(total.coaching)).toBe(true);
    expect(Number.isInteger(total.competing)).toBe(true);
  });
});

describe('coachesExpanded data integrity', () => {
  it('preserves canonical coachIds order', () => {
    // `coachesExpanded` is derived via `coachIds.map((id) => coachesById[id])`;
    // the derived array must mirror the canonical display order. Catches a
    // future re-map that reorders or drops an entry.
    expect(coachesExpanded.map((coach) => coach.id)).toEqual([...coachIds]);
  });

  it('every entry id matches its position in coachIds', () => {
    // The `as const satisfies Record<CoachId, CoachExpanded>` lift proves every
    // coachId has an entry, but does not guarantee the entry's `id` field
    // matches the id it was keyed under. Mirrors the successStoriesById
    // key/id-drift guard (successStories.test.ts).
    coachIds.forEach((id, index) => {
      expect(coachesExpanded[index]?.id, `coachesExpanded[${index}].id mismatch`).toBe(id);
    });
  });
});
