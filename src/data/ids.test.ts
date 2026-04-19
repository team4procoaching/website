import { describe, expect, it } from 'vitest';
import { MODAL_IDS } from './ids';

describe('MODAL_IDS registry', () => {
  it('all registered values are unique', () => {
    // Uniqueness matters because MODAL_IDS values become DOM ids. Two modals
    // with the same id would silently break the Invokers API — the trigger
    // would dispatch to whichever element resolves first — without any
    // TypeScript or runtime error surface. This test closes that gap.
    const values = Object.values(MODAL_IDS);
    const unique = new Set(values);
    expect(unique.size).toBe(values.length);
  });

  it('keys are camelCase, values are kebab-case', () => {
    // Naming convention: keys read like TypeScript identifiers at call
    // sites (`MODAL_IDS.quiz`), values read like HTML ids in the DOM
    // (`id="quiz-modal"`). Codifying the convention here catches drift
    // when a new modal is added without matching the pattern.
    const camelCase = /^[a-z][a-zA-Z0-9]*$/;
    const kebabCase = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;
    for (const [key, value] of Object.entries(MODAL_IDS)) {
      expect(key, `key ${key}`).toMatch(camelCase);
      expect(value, `value ${value} for key ${key}`).toMatch(kebabCase);
    }
  });
});
