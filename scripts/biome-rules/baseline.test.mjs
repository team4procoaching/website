import { describe, expect, it } from 'vitest';

import { BASELINE, formatActual, matchesExpectation } from './baseline.mjs';

// ---------------------------------------------------------------------------
// matchesExpectation
// ---------------------------------------------------------------------------

describe('matchesExpectation', () => {
  describe('expectedExit = success', () => {
    it('returns true when exit code is 0', () => {
      expect(matchesExpectation('success', 0, 'any output')).toBe(true);
    });

    it('returns false when exit code is non-zero', () => {
      expect(matchesExpectation('success', 1, 'any output')).toBe(false);
    });

    it('returns false when spawn failed (exit code -1)', () => {
      expect(matchesExpectation('success', -1, 'any output')).toBe(false);
    });
  });

  describe('expectedExit = unrecognized', () => {
    it('returns true when exit is non-zero and output contains "Unrecognized option"', () => {
      expect(matchesExpectation('unrecognized', 1, 'Unrecognized option useGlobalThis')).toBe(true);
    });

    it('returns true when exit is non-zero and output contains "unknown rule"', () => {
      expect(matchesExpectation('unrecognized', 1, 'error: unknown rule someRule')).toBe(true);
    });

    it('returns false when exit is non-zero but output mentions neither phrasing', () => {
      expect(matchesExpectation('unrecognized', 1, 'Some other error')).toBe(false);
    });

    it('returns false when output mentions "unrecognized" but exit code is 0', () => {
      expect(matchesExpectation('unrecognized', 0, 'unrecognized appears here')).toBe(false);
    });
  });

  describe('default branch', () => {
    it('returns false for an unknown expectedExit value', () => {
      expect(matchesExpectation('wrongValue', 1, 'any output')).toBe(false);
    });
  });
});

// ---------------------------------------------------------------------------
// formatActual
// ---------------------------------------------------------------------------

describe('formatActual', () => {
  it('returns "success" for exit code 0', () => {
    expect(formatActual(0)).toBe('success');
  });

  it('returns "non-zero (exit 1)" for exit code 1', () => {
    expect(formatActual(1)).toBe('non-zero (exit 1)');
  });

  it('returns "spawn-failed" for negative exit codes', () => {
    expect(formatActual(-1)).toBe('spawn-failed');
  });

  it('returns "non-zero (exit 127)" for exit code 127', () => {
    expect(formatActual(127)).toBe('non-zero (exit 127)');
  });
});

// ---------------------------------------------------------------------------
// BASELINE
// ---------------------------------------------------------------------------

describe('BASELINE', () => {
  it('contains exactly six entries (one per ADR-0041 evidence row)', () => {
    expect(BASELINE).toHaveLength(6);
  });

  it('every entry exposes the required fields', () => {
    for (const entry of BASELINE) {
      expect(entry).toHaveProperty('rule');
      expect(entry).toHaveProperty('expectedExit');
      expect(entry).toHaveProperty('adrDisposition');
      expect(entry).toHaveProperty('note');
      expect(typeof entry.rule).toBe('string');
      expect(typeof entry.expectedExit).toBe('string');
      expect(typeof entry.adrDisposition).toBe('string');
      expect(typeof entry.note).toBe('string');
    }
  });

  it('every expectedExit value is "success" or "unrecognized"', () => {
    for (const entry of BASELINE) {
      expect(['success', 'unrecognized']).toContain(entry.expectedExit);
    }
  });

  it('rule names are unique across entries', () => {
    const ruleNames = BASELINE.map((entry) => entry.rule);
    const unique = new Set(ruleNames);
    expect(unique.size).toBe(ruleNames.length);
  });

  it('rule set matches the ADR-0041 empirical-evidence table exactly', () => {
    const expected = [
      'useGlobalThis',
      'useRegexpExec',
      'useAtIndex',
      'noNegationElse',
      'noExcessiveCognitiveComplexity',
      'noNestedTernary',
    ];
    const actual = BASELINE.map((entry) => entry.rule);
    expect(new Set(actual)).toEqual(new Set(expected));
  });
});
