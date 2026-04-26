import { describe, expect, it } from 'vitest';
import type { SecondaryCta } from '~/types/components';
import { buildCtaProps, buildFaqItems, buildSectionHeaderProps, buildStats } from './fixtures';

// The `readonly` return types on `buildFaqItems` / `buildStats` are a
// compile-time contract enforced by TypeScript; they are not testable at
// runtime (`Array.isArray` does not distinguish mutable from readonly).
// The static type signatures in `fixtures.ts` carry this guarantee.

describe('buildFaqItems', () => {
  it('returns an empty array for n = 0', () => {
    expect(buildFaqItems(0)).toEqual([]);
  });

  it('returns one item for n = 1 with the expected question/answer shape', () => {
    expect(buildFaqItems(1)).toEqual([{ question: 'Q1', answer: 'A1' }]);
  });

  it('returns two items for n = 2 with sequential placeholder text', () => {
    expect(buildFaqItems(2)).toEqual([
      { question: 'Q1', answer: 'A1' },
      { question: 'Q2', answer: 'A2' },
    ]);
  });

  it('returns three items for n = 3 — proves Array.from length drives the count', () => {
    expect(buildFaqItems(3)).toEqual([
      { question: 'Q1', answer: 'A1' },
      { question: 'Q2', answer: 'A2' },
      { question: 'Q3', answer: 'A3' },
    ]);
  });
});

describe('buildStats', () => {
  it('returns an empty array for n = 0', () => {
    expect(buildStats(0)).toEqual([]);
  });

  it('returns one item for n = 1 with target 100 and label L1', () => {
    expect(buildStats(1)).toEqual([{ target: 100, label: 'L1' }]);
  });

  it('returns two items for n = 2 with sequential placeholder labels', () => {
    expect(buildStats(2)).toEqual([
      { target: 100, label: 'L1' },
      { target: 100, label: 'L2' },
    ]);
  });

  it('returns three items for n = 3', () => {
    expect(buildStats(3)).toEqual([
      { target: 100, label: 'L1' },
      { target: 100, label: 'L2' },
      { target: 100, label: 'L3' },
    ]);
  });
});

describe('buildCtaProps', () => {
  it('returns the three required fields and all four optional keys absent when no overrides are given', () => {
    const result = buildCtaProps();
    expect(result.headline).toBe('Ready to Get Started?');
    expect(result.description).toBe('Join us today.');
    expect(result.primaryCta).toEqual({ label: 'Sign Up', href: '/signup' });
    expect('secondaryCta' in result).toBe(false);
    expect('headingLevel' in result).toBe(false);
    expect('size' in result).toBe(false);
    expect('variant' in result).toBe(false);
  });

  it('overriding a required field leaves all four optional keys absent', () => {
    const result = buildCtaProps({ headline: 'X' });
    expect(result.headline).toBe('X');
    expect(result.description).toBe('Join us today.');
    expect('secondaryCta' in result).toBe(false);
    expect('headingLevel' in result).toBe(false);
    expect('size' in result).toBe(false);
    expect('variant' in result).toBe(false);
  });

  it('overriding secondaryCta sets only that key — the other three optionals stay absent', () => {
    const secondaryCta: SecondaryCta = { label: 'Learn More', href: '/about' };
    const result = buildCtaProps({ secondaryCta });
    expect(result.secondaryCta).toEqual(secondaryCta);
    expect('headingLevel' in result).toBe(false);
    expect('size' in result).toBe(false);
    expect('variant' in result).toBe(false);
  });

  it('overriding headingLevel sets only that key — the other three optionals stay absent', () => {
    const result = buildCtaProps({ headingLevel: 'h3' });
    expect(result.headingLevel).toBe('h3');
    expect('secondaryCta' in result).toBe(false);
    expect('size' in result).toBe(false);
    expect('variant' in result).toBe(false);
  });

  it('overriding size sets only that key — the other three optionals stay absent', () => {
    const result = buildCtaProps({ size: 'compact' });
    expect(result.size).toBe('compact');
    expect('secondaryCta' in result).toBe(false);
    expect('headingLevel' in result).toBe(false);
    expect('variant' in result).toBe(false);
  });

  it('overriding variant sets only that key — the other three optionals stay absent', () => {
    const result = buildCtaProps({ variant: 'glass' });
    expect(result.variant).toBe('glass');
    expect('secondaryCta' in result).toBe(false);
    expect('headingLevel' in result).toBe(false);
    expect('size' in result).toBe(false);
  });
});

describe('buildSectionHeaderProps', () => {
  it('returns just the headline and all five optional keys absent when no overrides are given', () => {
    const result = buildSectionHeaderProps();
    expect(result.headline).toBe('X');
    expect('eyebrow' in result).toBe(false);
    expect('headingLevel' in result).toBe(false);
    expect('headingId' in result).toBe(false);
    expect('align' in result).toBe(false);
    expect('background' in result).toBe(false);
  });

  it('overriding eyebrow sets only that key — the other four optionals stay absent', () => {
    const result = buildSectionHeaderProps({ eyebrow: 'Testimonials' });
    expect(result.eyebrow).toBe('Testimonials');
    expect('headingLevel' in result).toBe(false);
    expect('headingId' in result).toBe(false);
    expect('align' in result).toBe(false);
    expect('background' in result).toBe(false);
  });

  it('overriding headingLevel sets only that key — the other four optionals stay absent', () => {
    const result = buildSectionHeaderProps({ headingLevel: 'h3' });
    expect(result.headingLevel).toBe('h3');
    expect('eyebrow' in result).toBe(false);
    expect('headingId' in result).toBe(false);
    expect('align' in result).toBe(false);
    expect('background' in result).toBe(false);
  });

  it('overriding headingId sets only that key — the other four optionals stay absent', () => {
    const result = buildSectionHeaderProps({ headingId: 'foo' });
    expect(result.headingId).toBe('foo');
    expect('eyebrow' in result).toBe(false);
    expect('headingLevel' in result).toBe(false);
    expect('align' in result).toBe(false);
    expect('background' in result).toBe(false);
  });

  it('overriding align sets only that key — the other four optionals stay absent', () => {
    const result = buildSectionHeaderProps({ align: 'left' });
    expect(result.align).toBe('left');
    expect('eyebrow' in result).toBe(false);
    expect('headingLevel' in result).toBe(false);
    expect('headingId' in result).toBe(false);
    expect('background' in result).toBe(false);
  });

  it('overriding background sets only that key — the other four optionals stay absent', () => {
    const result = buildSectionHeaderProps({ background: 'teal' });
    expect(result.background).toBe('teal');
    expect('eyebrow' in result).toBe(false);
    expect('headingLevel' in result).toBe(false);
    expect('headingId' in result).toBe(false);
    expect('align' in result).toBe(false);
  });
});

describe('shared properties', () => {
  it('calling buildFaqItems(2) twice returns two arrays with equal contents and no shared reference', () => {
    const a = buildFaqItems(2);
    const b = buildFaqItems(2);
    expect(a).toEqual(b);
    expect(a).not.toBe(b);
  });

  it('calling buildStats(2) twice returns two arrays with equal contents and no shared reference', () => {
    const a = buildStats(2);
    const b = buildStats(2);
    expect(a).toEqual(b);
    expect(a).not.toBe(b);
  });
});
