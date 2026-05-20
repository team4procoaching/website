import { describe, expect, it } from 'vitest';
import { validateLabellingXor } from './labellingValidation';

describe('validateLabellingXor — XOR contract', () => {
  it('passes with ariaLabelledBy only', () => {
    expect(() => validateLabellingXor('FilterBar', 'visible-label-id', undefined)).not.toThrow();
  });

  it('passes with ariaLabel only', () => {
    expect(() => validateLabellingXor('FilterBar', undefined, 'An accessible name')).not.toThrow();
  });

  it('throws "not both" when both are provided', () => {
    expect(() =>
      validateLabellingXor('FilterBar', 'visible-label-id', 'An accessible name'),
    ).toThrow(/not both/i);
  });

  it('throws "exactly one … required" when neither is provided', () => {
    expect(() => validateLabellingXor('FilterBar', undefined, undefined)).toThrow(/exactly one/i);
  });

  it('throws "invalid value" when ariaLabelledBy is an empty string (pre-empts the "neither" path)', () => {
    // Empty string is "provided but invalid", not "absent" — reject before
    // falling through to the neither/exactly-one path so the error message
    // names the real violation.
    expect(() => validateLabellingXor('FilterBar', '', '')).toThrow(/invalid value/i);
  });

  it('throws "invalid value" when ariaLabelledBy is empty and ariaLabel is undefined', () => {
    expect(() => validateLabellingXor('FilterBar', '', undefined)).toThrow(/invalid value/i);
  });

  it('throws "invalid value" when ariaLabel is empty and ariaLabelledBy is valid', () => {
    expect(() => validateLabellingXor('FilterBar', 'visible-label-id', '')).toThrow(
      /invalid value/i,
    );
  });

  it('throws "whitespace-only" on whitespace-only ariaLabel', () => {
    // Whitespace-only would produce an empty Accessible Name at render time.
    // Reject at the validator rather than letting the DOM end up with
    // aria-label="   ".
    expect(() => validateLabellingXor('FilterBar', undefined, '   ')).toThrow(/whitespace-only/i);
  });

  it('throws "whitespace-only" on whitespace-only ariaLabelledBy', () => {
    expect(() => validateLabellingXor('FilterBar', '   ', undefined)).toThrow(/whitespace-only/i);
  });

  it('throws "whitespace-only" even when only one side is whitespace and the other is valid', () => {
    // A valid ariaLabelledBy does not excuse a whitespace-only ariaLabel —
    // the whitespace-only prop would still leak to the DOM.
    expect(() => validateLabellingXor('FilterBar', 'visible-label-id', '   ')).toThrow(
      /whitespace-only/i,
    );
  });
});

describe('validateLabellingXor — component name reaches the thrown message', () => {
  // The component name is the generic's first argument; it exists so one
  // shared implementation produces per-component-precise error prefixes.
  it('prefixes the message with the component name passed by the caller', () => {
    expect(() => validateLabellingXor('FilterBar', '', undefined)).toThrow(/^FilterBar:/);
    expect(() => validateLabellingXor('SegmentedControl', undefined, undefined)).toThrow(
      /^SegmentedControl:/,
    );
  });
});
