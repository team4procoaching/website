import { describe, expect, it } from 'vitest';
import { results, step1, step2 } from './quiz';

describe('quiz data integrity', () => {
  // --- Step 1 ---

  it('step1 has options for every category', () => {
    // step1.options is derived from categoryIds.map(), so length must match
    expect(step1.options.length).toBeGreaterThan(0);
  });

  it('step1 option IDs match the canonical category order', () => {
    // Verify options follow categoryIds order (bodybuilding, athletic, wellness, mindset)
    const ids = step1.options.map((o) => o.id);
    expect(ids).toEqual(['bodybuilding', 'athletic', 'wellness', 'mindset']);
  });

  // --- Step 2 ---

  it('every step2 category has at least one option', () => {
    for (const [category, step] of Object.entries(step2)) {
      expect(step.options.length, `${category} has no options`).toBeGreaterThan(0);
    }
  });

  it('step2 option IDs are globally unique', () => {
    // TypeScript cannot detect duplicate IDs across categories at compile time
    // (the union silently deduplicates). This test guards against that.
    const allIds = Object.values(step2).flatMap((step) => step.options.map((o) => o.id));
    const uniqueIds = new Set(allIds);
    expect(
      uniqueIds.size,
      `Duplicate option IDs found: ${allIds.filter((id, i) => allIds.indexOf(id) !== i)}`,
    ).toBe(allIds.length);
  });

  // --- Results ---

  it('every step2 option has a matching result', () => {
    const allOptionIds = Object.values(step2).flatMap((step) => step.options.map((o) => o.id));
    for (const id of allOptionIds) {
      expect(results, `Missing result for option '${id}'`).toHaveProperty(id);
    }
  });

  it('every result has a non-empty serviceName and href', () => {
    for (const [id, result] of Object.entries(results)) {
      expect(result.serviceName, `${id}: empty serviceName`).toBeTruthy();
      expect(result.href, `${id}: empty href`).toBeTruthy();
    }
  });

  it('result hrefs point to /services with valid anchors', () => {
    for (const [id, result] of Object.entries(results)) {
      expect(result.href, `${id}: invalid href format`).toMatch(/^\/services#[\w-]+$/);
    }
  });
});
