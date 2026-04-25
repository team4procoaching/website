import { describe, expect, it } from 'vitest';
import { pickStepText } from './processStepText';

describe('pickStepText', () => {
  it('returns shortDescription in compact when present', () => {
    expect(pickStepText({ description: 'B', shortDescription: 'A' }, 'compact')).toBe('A');
  });

  it('returns description in default even when shortDescription is present', () => {
    expect(pickStepText({ description: 'B', shortDescription: 'A' }, 'default')).toBe('B');
  });

  it('falls back to description in compact when shortDescription is absent', () => {
    expect(pickStepText({ description: 'B' }, 'compact')).toBe('B');
  });

  it('treats empty-string shortDescription as absent in compact', () => {
    expect(pickStepText({ description: 'B', shortDescription: '' }, 'compact')).toBe('B');
  });
});
