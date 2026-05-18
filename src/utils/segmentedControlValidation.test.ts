import { describe, expect, it } from 'vitest';
import { validateSegmentedControlLabelling } from './segmentedControlValidation';

describe('validateSegmentedControlLabelling — XOR contract', () => {
  it('passes with ariaLabelledBy only', () => {
    expect(() => validateSegmentedControlLabelling('toggle-label', undefined)).not.toThrow();
  });

  it('passes with ariaLabel only', () => {
    expect(() =>
      validateSegmentedControlLabelling(undefined, 'Select billing period'),
    ).not.toThrow();
  });

  it('throws "not both" when both are provided', () => {
    expect(() =>
      validateSegmentedControlLabelling('toggle-label', 'Select billing period'),
    ).toThrow(/not both/i);
  });

  it('throws "exactly one … required" when neither is provided', () => {
    expect(() => validateSegmentedControlLabelling(undefined, undefined)).toThrow(/exactly one/i);
  });

  it('throws "invalid value" when ariaLabelledBy is an empty string (pre-empts the "neither" path)', () => {
    // Empty string is "provided but invalid", not "absent" — reject before
    // falling through to the neither/exactly-one path so the error message
    // names the real violation.
    expect(() => validateSegmentedControlLabelling('', '')).toThrow(/invalid value/i);
  });

  it('throws "invalid value" when ariaLabelledBy is empty and ariaLabel is undefined', () => {
    expect(() => validateSegmentedControlLabelling('', undefined)).toThrow(/invalid value/i);
  });

  it('throws "invalid value" when ariaLabel is empty and ariaLabelledBy is valid', () => {
    expect(() => validateSegmentedControlLabelling('toggle-label', '')).toThrow(/invalid value/i);
  });

  it('throws "whitespace-only" on whitespace-only ariaLabel', () => {
    // Whitespace-only would produce an empty Accessible Name at render time.
    // Reject at the validator rather than letting the DOM end up with
    // aria-label="   ".
    expect(() => validateSegmentedControlLabelling(undefined, '   ')).toThrow(/whitespace-only/i);
  });

  it('throws "whitespace-only" on whitespace-only ariaLabelledBy', () => {
    expect(() => validateSegmentedControlLabelling('   ', undefined)).toThrow(/whitespace-only/i);
  });

  it('throws "whitespace-only" even when only one side is whitespace and the other is valid', () => {
    // A valid ariaLabelledBy does not excuse a whitespace-only ariaLabel —
    // the whitespace-only prop would still leak to the DOM.
    expect(() => validateSegmentedControlLabelling('toggle-label', '   ')).toThrow(
      /whitespace-only/i,
    );
  });
});
