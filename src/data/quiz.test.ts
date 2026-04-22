import { describe, expect, it } from 'vitest';
import { results, step1, step2, step3, step4, stepLabels } from './quiz';
import { categoryIds, getServicesByIds, type ServiceId } from './services';

/**
 * Extract the `service` query parameter from a result href. Factored out
 * so the two tests that need it use a single implementation — format
 * assertions against the href string remain regex-based below.
 */
function getServiceIdFromHref(href: string): string | null {
  const queryString = href.includes('?') ? href.split('?')[1] : '';
  return new URLSearchParams(queryString).get('service');
}

describe('quiz data integrity', () => {
  // --- Step 1 ---

  it('step1 has exactly one option per category', () => {
    expect(step1.options).toHaveLength(categoryIds.length);
  });

  it('step1 option IDs match the canonical category order', () => {
    const ids = step1.options.map((o) => o.id);
    expect(ids).toEqual(['bodybuilding', 'athletic', 'wellness']);
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

  it('result hrefs point to /services with a service parameter', () => {
    for (const [id, result] of Object.entries(results)) {
      expect(result.href, `${id}: invalid href format`).toMatch(/^\/services\?service=[\w-]+$/);
    }
  });

  it('every result option ID appears in exactly one step2 category', () => {
    for (const resultId of Object.keys(results)) {
      const matches = Object.entries(step2).filter(([, step]) =>
        step.options.some((o) => o.id === resultId),
      );
      expect(matches, `${resultId}: must appear in exactly one step2 category`).toHaveLength(1);
    }
  });

  it('result href service parameter matches the option ID', () => {
    for (const [optionId, result] of Object.entries(results)) {
      const urlService = getServiceIdFromHref(result.href);
      expect(urlService, `${optionId}: href service mismatch`).toBe(optionId);
    }
  });

  // ---------------------------------------------------------------------------
  // Cross-module integrity: quiz IDs must resolve to real services
  //
  // The quiz depends on services.ts for category definitions and on service
  // IDs matching up. If a service is renamed in services.ts without updating
  // quiz.ts, the services-filter controller would silently fall back to the
  // "All" view when a user submits the quiz. These tests catch that class of
  // drift at build time rather than in the browser.
  // ---------------------------------------------------------------------------

  it('every step2 option ID resolves to a real service', () => {
    const ids = Object.values(step2).flatMap((step) => step.options.map((o) => o.id));
    expect(() => getServicesByIds(ids)).not.toThrow();
  });

  it('every result href service parameter resolves to a real service', () => {
    // Service IDs are parsed from result hrefs at runtime, so they arrive
    // as untyped strings. The cast lets the compile-time ServiceId check
    // through; the runtime guard in getServicesByIds catches drift.
    const parsedServiceIds: ServiceId[] = [];
    for (const [resultId, result] of Object.entries(results)) {
      const serviceId = getServiceIdFromHref(result.href);
      expect(serviceId, `${resultId}: no service parameter in href`).toBeTruthy();
      if (serviceId) parsedServiceIds.push(serviceId as ServiceId);
    }
    expect(() => getServicesByIds(parsedServiceIds)).not.toThrow();
  });
});
