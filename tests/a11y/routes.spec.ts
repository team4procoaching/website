/**
 * Page-level accessibility scans for the 9 canonical routes (ADR-0057).
 *
 * Parametrises the canonical URL set ADR-0053 audits — `/`, `/services`,
 * `/coaches`, `/success-stories`, `/how-it-works`, `/contact`,
 * `/services/competition-prep`, `/services/posing`, `/success-stories/sarah-m`
 * — and asserts each renders with no WCAG 2.1 AA violation via
 * {@link expectPageNoA11yViolations}. The `playwright.config.ts` Mobile and
 * Desktop projects expand each `test(...)` to two project runs, producing 18
 * (URL × viewport) assertions in total.
 *
 * Both `<Accordion>`-bearing routes (`/how-it-works`,
 * `/services/competition-prep`) ride the same loop — no separate diagnostic
 * spec. The OQ6 contradiction (component-layer disables `definition-list` and
 * `dlitem` as JSDOM false positives; ADR-0053's bundled axe surfaced them on
 * those routes in a real browser) is settled empirically by this scan, with
 * the outcome captured in the introducing commit's body per ADR-0057's
 * resolution rule.
 */
import { test } from 'playwright/test';
import { expectPageNoA11yViolations } from '~/test-utils/a11yPage';

/**
 * The nine canonical URLs audited by both the Playwright a11y gate (ADR-0057)
 * and the Lighthouse gate (ADR-0053). One oracle, one URL set across the two
 * gates.
 */
const URLS = [
  '/',
  '/services',
  '/coaches',
  '/success-stories',
  '/how-it-works',
  '/contact',
  '/services/competition-prep',
  '/services/posing',
  '/success-stories/sarah-m',
] as const;

for (const url of URLS) {
  test(`a11y / ${url}`, async ({ page }) => {
    await page.goto(url);
    await expectPageNoA11yViolations(page);
  });
}
