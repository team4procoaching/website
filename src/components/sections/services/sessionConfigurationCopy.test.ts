import { describe, expect, it } from 'vitest';
import { formatSessionConfigurationCopy, joinAsProse } from './sessionConfigurationCopy';

describe('joinAsProse', () => {
  it('returns the empty string for an empty list', () => {
    expect(joinAsProse([])).toBe('');
  });

  it('returns the single item unchanged for a one-element list', () => {
    expect(joinAsProse(['30'])).toBe('30');
  });

  it('joins two items with " or "', () => {
    expect(joinAsProse(['30', '60'])).toBe('30 or 60');
  });

  it('joins three or more items as "a, b or c"', () => {
    expect(joinAsProse(['1', '5', '10'])).toBe('1, 5 or 10');
    expect(joinAsProse(['1', '2', '3', '4'])).toBe('1, 2, 3 or 4');
  });
});

describe('formatSessionConfigurationCopy', () => {
  it("renders the Posing card's configuration as the documented micro-copy line", () => {
    expect(formatSessionConfigurationCopy({ sessionCounts: [1, 5, 10], durations: [30, 60] })).toBe(
      '1, 5 or 10 sessions · 30 or 60 min',
    );
  });

  it('joins the two clauses with a spaced middle dot (U+00B7)', () => {
    const copy = formatSessionConfigurationCopy({ sessionCounts: [1], durations: [60] });
    expect(copy).toBe('1 sessions · 60 min');
    expect(copy).toContain(' · ');
  });

  it('is data-driven — a different configuration yields a different line', () => {
    expect(formatSessionConfigurationCopy({ sessionCounts: [4], durations: [45, 90] })).toBe(
      '4 sessions · 45 or 90 min',
    );
    expect(formatSessionConfigurationCopy({ sessionCounts: [2, 8], durations: [25] })).toBe(
      '2 or 8 sessions · 25 min',
    );
  });
});
