import { describe, expect, it } from 'vitest';
import { isExternal } from './isExternal';

describe('isExternal', () => {
  // --- External URLs ---

  it('detects https URLs as external', () => {
    expect(isExternal('https://instagram.com/team4procoaching')).toBe(true);
  });

  it('detects http URLs as external', () => {
    expect(isExternal('http://example.com')).toBe(true);
  });

  it('is case-insensitive', () => {
    expect(isExternal('HTTPS://EXAMPLE.COM')).toBe(true);
    expect(isExternal('Http://Example.Com')).toBe(true);
  });

  it('trims whitespace', () => {
    expect(isExternal('  https://example.com  ')).toBe(true);
  });

  // --- Internal paths ---

  it('treats relative paths as internal', () => {
    expect(isExternal('/contact')).toBe(false);
    expect(isExternal('/services#competition-prep')).toBe(false);
  });

  it('treats anchor links as internal', () => {
    expect(isExternal('#section')).toBe(false);
  });

  // --- Non-http protocols (intentionally not external) ---

  it('treats mailto: as non-external', () => {
    expect(isExternal('mailto:hello@team4pro.com')).toBe(false);
  });

  it('treats tel: as non-external', () => {
    expect(isExternal('tel:+1234567890')).toBe(false);
  });

  // --- Real-world values from the project ---

  it('handles actual project URLs', () => {
    expect(isExternal('https://www.instagram.com/team4procoaching')).toBe(true);
    expect(isExternal('/contact?service=competition-prep')).toBe(false);
    expect(isExternal('mailto:hello@example.com')).toBe(false);
  });
});
