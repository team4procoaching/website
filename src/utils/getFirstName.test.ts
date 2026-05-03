import { describe, expect, it } from 'vitest';
import { getFirstName } from './getFirstName';

describe('getFirstName', () => {
  it('returns the first token of a typical "Firstname L." name', () => {
    expect(getFirstName('Sarah M.')).toBe('Sarah');
  });

  it('returns the single token of a one-word name', () => {
    expect(getFirstName('Helle')).toBe('Helle');
  });

  it('keeps hyphenated first names intact', () => {
    expect(getFirstName('Mary-Anne K.')).toBe('Mary-Anne');
  });

  it('trims leading and trailing whitespace before splitting', () => {
    expect(getFirstName('   Sarah M.   ')).toBe('Sarah');
  });

  it('returns null for whitespace-only input', () => {
    expect(getFirstName('   ')).toBeNull();
  });

  it('returns null for an empty string', () => {
    expect(getFirstName('')).toBeNull();
  });
});
