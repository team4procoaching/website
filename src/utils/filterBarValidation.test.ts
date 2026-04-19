import { describe, expect, it } from 'vitest';
import { validateFilterBarLabelling } from './filterBarValidation';

describe('validateFilterBarLabelling — XOR contract', () => {
  it('passes with ariaLabelledBy only', () => {
    expect(() => validateFilterBarLabelling('filter-label', undefined)).not.toThrow();
  });

  it('passes with ariaLabel only', () => {
    expect(() => validateFilterBarLabelling(undefined, 'Filter services')).not.toThrow();
  });

  it('throws "not both" when both are provided', () => {
    expect(() => validateFilterBarLabelling('filter-label', 'Filter services')).toThrow(
      /not both/i,
    );
  });

  it('throws "exactly one … required" when neither is provided', () => {
    expect(() => validateFilterBarLabelling(undefined, undefined)).toThrow(/exactly one/i);
  });

  it('throws "invalid value" when ariaLabelledBy is an empty string (pre-empts the "neither" path)', () => {
    // Empty string is "provided but invalid", not "absent" — reject before
    // falling through to the neither/exactly-one path so the error message
    // names the real violation.
    expect(() => validateFilterBarLabelling('', '')).toThrow(/invalid value/i);
  });

  it('throws "invalid value" when ariaLabelledBy is empty and ariaLabel is undefined', () => {
    expect(() => validateFilterBarLabelling('', undefined)).toThrow(/invalid value/i);
  });

  it('throws "invalid value" when ariaLabel is empty and ariaLabelledBy is valid', () => {
    expect(() => validateFilterBarLabelling('filter-label', '')).toThrow(/invalid value/i);
  });

  it('throws "whitespace-only" on whitespace-only ariaLabel', () => {
    // Whitespace-only would produce an empty Accessible Name at render time.
    // Reject at the validator rather than letting the DOM end up with
    // aria-label="   ".
    expect(() => validateFilterBarLabelling(undefined, '   ')).toThrow(/whitespace-only/i);
  });

  it('throws "whitespace-only" on whitespace-only ariaLabelledBy', () => {
    expect(() => validateFilterBarLabelling('   ', undefined)).toThrow(/whitespace-only/i);
  });

  it('throws "whitespace-only" even when only one side is whitespace and the other is valid', () => {
    // A valid ariaLabelledBy does not excuse a whitespace-only ariaLabel —
    // the whitespace-only prop would still leak to the DOM.
    expect(() => validateFilterBarLabelling('filter-label', '   ')).toThrow(/whitespace-only/i);
  });
});
