import { describe, expect, it } from 'vitest';
import { assertDefined, assertNotNull } from './assertions';

describe('assertNotNull', () => {
  it('passes for a non-null value', () => {
    expect(() => assertNotNull('hello')).not.toThrow();
  });

  it('fails for null', () => {
    expect(() => assertNotNull(null)).toThrow();
  });
});

describe('assertDefined', () => {
  it('passes for a defined value', () => {
    expect(() => assertDefined('hello')).not.toThrow();
  });

  it('passes for zero and empty string', () => {
    expect(() => assertDefined(0)).not.toThrow();
    expect(() => assertDefined('')).not.toThrow();
  });

  it('fails for null', () => {
    expect(() => assertDefined(null)).toThrow();
  });

  it('fails for undefined', () => {
    expect(() => assertDefined(undefined)).toThrow();
  });
});
