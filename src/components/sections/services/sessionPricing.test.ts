import { describe, expect, it } from 'vitest';
import { formatPerSessionPrice, formatSavingsCaption } from './sessionPricing';

describe('formatPerSessionPrice', () => {
  it('returns the same anchor for a single-session package', () => {
    expect(formatPerSessionPrice(149, 1, 'EUR')).toBe('€149 / session');
    expect(formatPerSessionPrice(249, 1, 'EUR')).toBe('€249 / session');
  });

  it('truncates the per-session amount to whole euros (5-pack)', () => {
    // 1149 / 5 = 229.80 → 229
    expect(formatPerSessionPrice(1149, 5, 'EUR')).toBe('€229 / session');
    // 699 / 5 = 139.80 → 139
    expect(formatPerSessionPrice(699, 5, 'EUR')).toBe('€139 / session');
  });

  it('truncates the per-session amount to whole euros (10-pack)', () => {
    // 1299 / 10 = 129.90 → 129
    expect(formatPerSessionPrice(1299, 10, 'EUR')).toBe('€129 / session');
    // 2149 / 10 = 214.90 → 214
    expect(formatPerSessionPrice(2149, 10, 'EUR')).toBe('€214 / session');
  });

  it('renders the per-session anchor with a thousands separator when applicable', () => {
    // Defensive: even though Posing prices never produce a four-digit
    // per-session amount today, the formatter must keep the same locale
    // separator as the savings caption.
    expect(formatPerSessionPrice(20_000, 10, 'EUR')).toBe('€2,000 / session');
  });
});

describe('formatSavingsCaption', () => {
  it('renders the 5-pack / 60-min caption against the 1-session 60-min anchor', () => {
    // 5 × 249 = 1245; package = 1149; save = 96.
    expect(formatSavingsCaption(1149, 249, 5, 'EUR')).toBe(
      'Save €96 — 5 × €249 single-session = €1,245',
    );
  });

  it('renders the 5-pack / 30-min caption against the 1-session 30-min anchor', () => {
    // 5 × 149 = 745; package = 699; save = 46.
    expect(formatSavingsCaption(699, 149, 5, 'EUR')).toBe(
      'Save €46 — 5 × €149 single-session = €745',
    );
  });

  it('renders the 10-pack / 60-min caption with thousands separators', () => {
    // 10 × 249 = 2490; package = 2149; save = 341.
    expect(formatSavingsCaption(2149, 249, 10, 'EUR')).toBe(
      'Save €341 — 10 × €249 single-session = €2,490',
    );
  });

  it('renders the 10-pack / 30-min caption with a thousands separator on the anchor', () => {
    // 10 × 149 = 1490; package = 1299; save = 191.
    expect(formatSavingsCaption(1299, 149, 10, 'EUR')).toBe(
      'Save €191 — 10 × €149 single-session = €1,490',
    );
  });
});
