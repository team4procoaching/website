import { describe, expect, it } from 'vitest';
import { parseCounterValue } from './counter';

describe('parseCounterValue', () => {
  // --- JSDoc examples ---

  it('parses "500+" into target 500 with suffix "+"', () => {
    expect(parseCounterValue('500+')).toEqual({ target: 500, suffix: '+' });
  });

  it('parses "98%" into target 98 with suffix "%"', () => {
    expect(parseCounterValue('98%')).toEqual({ target: 98, suffix: '%' });
  });

  it('parses "3" into target 3 with empty suffix', () => {
    expect(parseCounterValue('3')).toEqual({ target: 3, suffix: '' });
  });

  it('strips commas from numbers', () => {
    expect(parseCounterValue('1,200')).toEqual({ target: 1200, suffix: '' });
  });

  it('trims whitespace from suffix', () => {
    expect(parseCounterValue('500 +')).toEqual({ target: 500, suffix: '+' });
  });

  // --- Documented limitations ---

  it('drops prefixes like "$" (no prefix field)', () => {
    expect(parseCounterValue('$500')).toEqual({ target: 500, suffix: '' });
  });

  it('treats decimals as integer-only (1.5x → 15)', () => {
    expect(parseCounterValue('1.5x')).toEqual({ target: 15, suffix: 'x' });
  });

  // --- Edge cases ---

  it('returns target 0 for non-numeric input', () => {
    expect(parseCounterValue('abc')).toEqual({ target: 0, suffix: '' });
  });

  it('returns target 0 for empty string', () => {
    expect(parseCounterValue('')).toEqual({ target: 0, suffix: '' });
  });

  // --- Real-world values from stats data ---

  it('handles actual stat values from the project', () => {
    expect(parseCounterValue('500+')).toEqual({ target: 500, suffix: '+' });
    expect(parseCounterValue('15+')).toEqual({ target: 15, suffix: '+' });
    expect(parseCounterValue('3')).toEqual({ target: 3, suffix: '' });
    expect(parseCounterValue('98%')).toEqual({ target: 98, suffix: '%' });
  });
});
