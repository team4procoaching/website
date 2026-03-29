import { describe, expect, it } from 'vitest';
import { results, step1, step2, step3, step4, stepLabels } from './quiz';
import { categoryIds } from './services';

describe('quiz data integrity', () => {
  // --- Step 1 ---

  it('step1 has exactly one option per category', () => {
    expect(step1.options).toHaveLength(categoryIds.length);
  });

  it('step1 option IDs match the canonical category order', () => {
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
    const allIds = Object.values(step2).flatMap((step) => step.options.map((o) => o.id));
    const uniqueIds = new Set(allIds);
    expect(
      uniqueIds.size,
      `Duplicate option IDs found: ${allIds.filter((id, i) => allIds.indexOf(id) !== i)}`,
    ).toBe(allIds.length);
  });

  // --- Steps 3 & 4 (context-only) ---

  it('step3 has at least 2 experience options', () => {
    expect(step3.options.length).toBeGreaterThanOrEqual(2);
  });

  it('step4 has at least 2 timeline options', () => {
    expect(step4.options.length).toBeGreaterThanOrEqual(2);
  });

  it('step3 and step4 option IDs are unique within their step', () => {
    const step3Ids = step3.options.map((o) => o.id);
    expect(new Set(step3Ids).size).toBe(step3Ids.length);

    const step4Ids = step4.options.map((o) => o.id);
    expect(new Set(step4Ids).size).toBe(step4Ids.length);
  });

  // --- Step labels ---

  it('stepLabels has exactly 4 entries', () => {
    expect(stepLabels).toHaveLength(4);
  });

  it('every stepLabel has label and shortLabel', () => {
    for (const entry of stepLabels) {
      expect(entry.label).toBeTruthy();
      expect(entry.shortLabel).toBeTruthy();
    }
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

  it('result hrefs point to /services with category and service parameters', () => {
    for (const [id, result] of Object.entries(results)) {
      expect(result.href, `${id}: invalid href format`).toMatch(
        /^\/services\?category=[\w-]+&service=[\w-]+$/,
      );
    }
  });

  it('result href category matches the step2 category that contains the option', () => {
    const optionToCategory = new Map<string, string>();
    for (const [category, step] of Object.entries(step2)) {
      for (const option of step.options) {
        optionToCategory.set(option.id, category);
      }
    }

    for (const [optionId, result] of Object.entries(results)) {
      const expectedCategory = optionToCategory.get(optionId);
      expect(expectedCategory, `${optionId}: not found in any step2 category`).toBeDefined();

      const urlCategory = new URLSearchParams(result.href.split('?')[1]).get('category');
      expect(urlCategory, `${optionId}: href category mismatch`).toBe(expectedCategory);
    }
  });

  it('result href service parameter matches the option ID', () => {
    for (const [optionId, result] of Object.entries(results)) {
      const urlService = new URLSearchParams(result.href.split('?')[1]).get('service');
      expect(urlService, `${optionId}: href service mismatch`).toBe(optionId);
    }
  });
});
