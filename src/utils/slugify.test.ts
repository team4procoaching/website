import { describe, expect, it } from 'vitest';
import { slugify } from './slugify';

describe('slugify', () => {
  // --- Basic transformations ---

  it('lowercases and replaces spaces with hyphens', () => {
    expect(slugify('Hello World!')).toBe('hello-world');
  });

  it('collapses multiple spaces into a single hyphen', () => {
    expect(slugify('  Multiple   Spaces  ')).toBe('multiple-spaces');
  });

  it('strips non-alphanumeric characters', () => {
    expect(slugify('Hello & Goodbye')).toBe('hello-goodbye');
  });

  it('handles numbers', () => {
    expect(slugify('2× Rising Phoenix 2017')).toBe('2-rising-phoenix-2017');
  });

  // --- NFD diacritics (decomposable by Unicode normalization) ---

  it('strips NFD-decomposable diacritics', () => {
    expect(slugify('Ümlauts & Spëcial')).toBe('umlauts-special');
  });

  it('handles accented characters in French loanwords', () => {
    expect(slugify('café résumé')).toBe('cafe-resume');
  });

  // --- CHAR_MAP: characters that NFD cannot decompose ---

  it('transliterates ø → oe (Danish/Norwegian)', () => {
    expect(slugify('Sønderborg')).toBe('soenderborg');
  });

  it('transliterates ß → ss (German)', () => {
    expect(slugify('Straße')).toBe('strasse');
  });

  it('transliterates æ → ae', () => {
    expect(slugify('Ærø')).toBe('aeroe');
  });

  it('transliterates œ → oe', () => {
    expect(slugify('cœur')).toBe('coeur');
  });

  it('transliterates ð → d (Icelandic)', () => {
    expect(slugify('Guðmundur')).toBe('gudmundur');
  });

  it('transliterates þ → th (Icelandic)', () => {
    expect(slugify('Þór')).toBe('thor');
  });

  it('transliterates ł → l (Polish)', () => {
    expect(slugify('Łódź')).toBe('lodz');
  });

  // --- Edge cases ---

  it('strips leading and trailing hyphens', () => {
    expect(slugify('---hello---')).toBe('hello');
  });

  it('handles a single word', () => {
    expect(slugify('Bodybuilding')).toBe('bodybuilding');
  });

  it('treats apostrophes as separators', () => {
    expect(slugify("What's Your Main Goal?")).toBe('what-s-your-main-goal');
  });

  // --- Error cases ---

  it('throws on empty string', () => {
    expect(() => slugify('')).toThrow('produced an empty slug');
  });

  it('throws on whitespace-only input', () => {
    expect(() => slugify('   ')).toThrow('produced an empty slug');
  });

  it('throws on symbols-only input', () => {
    expect(() => slugify('!@#$%')).toThrow('produced an empty slug');
  });

  // --- Real-world values from the project ---

  it('handles actual section headlines', () => {
    expect(slugify('Meet Your Coaches')).toBe('meet-your-coaches');
    expect(slugify('Our Most Popular Services')).toBe('our-most-popular-services');
    expect(slugify("Our Clients' Success Stories")).toBe('our-clients-success-stories');
    expect(slugify('What Makes Team 4 Pro Unique')).toBe('what-makes-team-4-pro-unique');
  });
});
