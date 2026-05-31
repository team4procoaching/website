import { describe, expect, it } from 'vitest';

import { formatSentinel, SENTINEL_PREFIX } from './sentinel.mjs';

// ---------------------------------------------------------------------------
// SENTINEL_PREFIX — the byte-exact CI discriminator
// ---------------------------------------------------------------------------

describe('SENTINEL_PREFIX', () => {
  it('is byte-for-byte the fixed prefix the CI step keys on', () => {
    // A single-byte drift (a lost trailing space, a lower-case d, a different
    // colon) blinds the CI discriminator. This assertion fails on any such
    // drift — the literal on the right is the canonical contract (ADR-0060,
    // docs/CONVENTIONS.md § Canonical-Pointer-Note Contract).
    expect(SENTINEL_PREFIX).toBe('Doc-consistency findings: ');
  });

  it('ends with a single trailing space separating the prefix from the count', () => {
    expect(SENTINEL_PREFIX.endsWith(' ')).toBe(true);
    expect(SENTINEL_PREFIX.endsWith('  ')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// formatSentinel — prefix + count, byte-exact
// ---------------------------------------------------------------------------

describe('formatSentinel', () => {
  it('formats a zero (clean-run) count exactly', () => {
    expect(formatSentinel(0)).toBe('Doc-consistency findings: 0');
  });

  it('formats a non-zero count exactly', () => {
    expect(formatSentinel(7)).toBe('Doc-consistency findings: 7');
  });

  it('is exactly the prefix concatenated with the count (no extra bytes)', () => {
    expect(formatSentinel(3)).toBe(`${SENTINEL_PREFIX}3`);
  });
});
