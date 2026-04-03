import { describe, expect, it } from 'vitest';

import { checkFileNaming, checkNoInterface, checkNoParseInt, isCamelCase } from './checks.mjs';

// ---------------------------------------------------------------------------
// Helper: run a check and return the violations array
// ---------------------------------------------------------------------------

function runLineCheck(checkFn, lines) {
  const violations = [];
  checkFn('test.ts', lines, violations);
  return violations;
}

// ---------------------------------------------------------------------------
// isCamelCase
// ---------------------------------------------------------------------------

describe('isCamelCase', () => {
  it('accepts single-word lowercase names', () => {
    expect(isCamelCase('coaches')).toBe(true);
    expect(isCamelCase('slugify')).toBe(true);
    expect(isCamelCase('routes')).toBe(true);
  });

  it('accepts multi-word camelCase names', () => {
    expect(isCamelCase('quizContext')).toBe(true);
    expect(isCamelCase('isExternal')).toBe(true);
    expect(isCamelCase('successStories')).toBe(true);
    expect(isCamelCase('quizModalController')).toBe(true);
  });

  it('accepts names with digits', () => {
    expect(isCamelCase('step2Utils')).toBe(true);
    expect(isCamelCase('h264Encoder')).toBe(true);
  });

  it('accepts test/spec suffixes', () => {
    expect(isCamelCase('slugify.test')).toBe(true);
    expect(isCamelCase('counter.spec')).toBe(true);
    expect(isCamelCase('quizContext.test')).toBe(true);
  });

  it('rejects snake_case', () => {
    expect(isCamelCase('quiz_context')).toBe(false);
    expect(isCamelCase('success_stories')).toBe(false);
  });

  it('rejects PascalCase', () => {
    expect(isCamelCase('QuizContext')).toBe(false);
    expect(isCamelCase('ServiceCard')).toBe(false);
  });

  it('rejects kebab-case', () => {
    expect(isCamelCase('quiz-context')).toBe(false);
  });

  it('rejects names starting with uppercase', () => {
    expect(isCamelCase('Coaches')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// checkNoParseInt
// ---------------------------------------------------------------------------

describe('checkNoParseInt', () => {
  it('detects standalone parseInt call', () => {
    const v = runLineCheck(checkNoParseInt, ['const x = parseInt("42", 10);']);
    expect(v).toHaveLength(1);
    expect(v[0].rule).toBe('no-parse-int');
  });

  it('detects Number.parseInt call', () => {
    const v = runLineCheck(checkNoParseInt, ['const x = Number.parseInt("42", 10);']);
    expect(v).toHaveLength(1);
    expect(v[0].rule).toBe('no-parse-int');
  });

  it('detects parseFloat call with distinct rule', () => {
    const v = runLineCheck(checkNoParseInt, ['const x = parseFloat("3.14");']);
    expect(v).toHaveLength(1);
    expect(v[0].rule).toBe('no-parse-float');
  });

  it('reports both parseInt and parseFloat on separate lines', () => {
    const v = runLineCheck(checkNoParseInt, [
      'const a = parseInt("1");',
      'const b = parseFloat("2.5");',
    ]);
    expect(v).toHaveLength(2);
    expect(v[0].rule).toBe('no-parse-int');
    expect(v[1].rule).toBe('no-parse-float');
  });

  it('reports correct line numbers (1-based)', () => {
    const v = runLineCheck(checkNoParseInt, [
      'const a = 1;',
      'const b = 2;',
      'const c = parseInt("3");',
    ]);
    expect(v).toHaveLength(1);
    expect(v[0].line).toBe(3);
  });

  it('skips single-line comments', () => {
    const v = runLineCheck(checkNoParseInt, [
      '// const x = parseInt("42");',
      '  // parseInt is not allowed',
    ]);
    expect(v).toHaveLength(0);
  });

  it('skips JSDoc continuation lines', () => {
    const v = runLineCheck(checkNoParseInt, [' * Use Number() instead of parseInt()']);
    expect(v).toHaveLength(0);
  });

  it('passes clean code', () => {
    const v = runLineCheck(checkNoParseInt, [
      'const x = Number("42");',
      'const y = Math.trunc(Number(digits));',
    ]);
    expect(v).toHaveLength(0);
  });

  it('provides distinct messages for parseInt vs parseFloat', () => {
    const vInt = runLineCheck(checkNoParseInt, ['parseInt("1");']);
    const vFloat = runLineCheck(checkNoParseInt, ['parseFloat("1.5");']);
    expect(vInt[0].message).toContain('Math.trunc()');
    expect(vFloat[0].message).toContain('trailing non-numeric characters');
  });
});

// ---------------------------------------------------------------------------
// checkNoInterface
// ---------------------------------------------------------------------------

describe('checkNoInterface', () => {
  it('detects interface declaration', () => {
    const v = runLineCheck(checkNoInterface, ['interface Foo {']);
    expect(v).toHaveLength(1);
    expect(v[0].rule).toBe('no-interface (ADR-0009)');
  });

  it('detects exported interface declaration', () => {
    const v = runLineCheck(checkNoInterface, ['export interface Bar {']);
    expect(v).toHaveLength(1);
  });

  it('detects indented interface declaration', () => {
    const v = runLineCheck(checkNoInterface, ['  interface Indented {']);
    expect(v).toHaveLength(1);
  });

  it('reports correct line number', () => {
    const v = runLineCheck(checkNoInterface, [
      'type Good = {',
      '  x: string;',
      '};',
      'interface Bad {',
    ]);
    expect(v).toHaveLength(1);
    expect(v[0].line).toBe(4);
  });

  it('does not flag the word interface in mid-line text', () => {
    const v = runLineCheck(checkNoInterface, ['const msg = "implements the interface Foo";']);
    expect(v).toHaveLength(0);
  });

  it('does not flag import type statements', () => {
    const v = runLineCheck(checkNoInterface, ["import type { MyInterface } from './types';"]);
    expect(v).toHaveLength(0);
  });

  it('passes clean code using type aliases', () => {
    const v = runLineCheck(checkNoInterface, ['type Props = {', '  headline: string;', '};']);
    expect(v).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// checkFileNaming
// ---------------------------------------------------------------------------

describe('checkFileNaming', () => {
  it('accepts camelCase names', () => {
    const violations = [];
    checkFileNaming('src/utils/quizContext.ts', 'quizContext', violations);
    expect(violations).toHaveLength(0);
  });

  it('accepts single-word names', () => {
    const violations = [];
    checkFileNaming('src/data/coaches.ts', 'coaches', violations);
    expect(violations).toHaveLength(0);
  });

  it('accepts test file names', () => {
    const violations = [];
    checkFileNaming('src/utils/slugify.test.ts', 'slugify.test', violations);
    expect(violations).toHaveLength(0);
  });

  it('rejects snake_case names', () => {
    const violations = [];
    checkFileNaming('src/utils/quiz_context.ts', 'quiz_context', violations);
    expect(violations).toHaveLength(1);
    expect(violations[0].rule).toBe('file-naming');
  });

  it('rejects PascalCase names for .ts files', () => {
    const violations = [];
    checkFileNaming('src/utils/QuizContext.ts', 'QuizContext', violations);
    expect(violations).toHaveLength(1);
  });

  it('includes the bad filename in the message', () => {
    const violations = [];
    checkFileNaming('src/bad_name.ts', 'bad_name', violations);
    expect(violations[0].message).toContain('bad_name');
  });

  it('reports line 0 (file-level, not line-level)', () => {
    const violations = [];
    checkFileNaming('src/Bad.ts', 'Bad', violations);
    expect(violations[0].line).toBe(0);
  });
});
