/**
 * Page-level accessibility scans for the CoachDetailModal open state
 * (ADR-0057).
 *
 * Drives the CoachDetailModal on `/coaches` into its open state via the
 * Invokers API trigger, then asserts:
 *
 * 1. **A11y scan** — no WCAG 2.1 AA violation on the open dialog via
 *    {@link expectPageNoA11yViolations}.
 * 2. **Focus-trap** — Tab cycles within the `<el-dialog-panel>` content
 *    area; focus does not escape to the document behind the open dialog.
 * 3. **Focus-return** — the trigger button regains focus after the dialog
 *    closes via its close button.
 *
 * The test runs under both the Mobile and Desktop Playwright projects
 * because the coaches page renders the modal in both viewports.
 *
 * Open-trigger selector: `button[command="show-modal"][commandfor="coach-detail-modal"]`
 * excluding the `aria-hidden="true"` stretched-card overlay — the visible
 * Button component with `:not([aria-hidden])` is the accessible trigger.
 * Dialog panel: `el-dialog-panel` inside `dialog#coach-detail-modal`.
 * Close button: `button[command="close"][commandfor="coach-detail-modal"]`.
 */
import { test } from 'playwright/test';
import { expectPageNoA11yViolations } from '~/test-utils/a11yPage';

test('a11y / /coaches — CoachDetailModal open state', async ({ page }) => {
  await page.goto('/coaches');

  // Click the first accessible (non-hidden) "Meet …" button to open
  // CoachDetailModal. The stretched invisible overlay uses aria-hidden="true"
  // and tabindex="-1"; :not([aria-hidden]) selects the visible Button CTA.
  const trigger = page
    .locator('button[command="show-modal"][commandfor="coach-detail-modal"]:not([aria-hidden])')
    .first();
  await trigger.click();

  // Wait for the <el-dialog-panel> to become visible inside the open dialog.
  // Using `state: 'visible'` on the panel rather than on `dialog[open]`
  // because the el-dialog custom element sets `open` immediately but
  // the CSS enter-transition can keep the panel visually hidden momentarily.
  await page.waitForSelector('dialog#coach-detail-modal el-dialog-panel', {
    state: 'visible',
  });

  // Scan the full page with the dialog open — axe inspects the live DOM,
  // which includes the dialog panel markup.
  await expectPageNoA11yViolations(page);

  // --- Focus-trap assertion ---
  // The <el-dialog-panel> inside the open dialog must contain focus.
  // Tab once; the new focus target must still be inside el-dialog-panel.
  await page.keyboard.press('Tab');
  const panelContainsFocus = await page.evaluate(() => {
    const panel = document.querySelector('dialog#coach-detail-modal el-dialog-panel');
    return panel !== null && panel.contains(document.activeElement);
  });
  // Focus must remain inside the panel after a Tab press (trap is active).
  if (!panelContainsFocus) {
    throw new Error('Focus-trap failed: Tab moved focus outside el-dialog-panel');
  }

  // --- Focus-return assertion ---
  // Close the dialog via its close button and verify the trigger regains focus.
  const closeButton = page.locator('button[command="close"][commandfor="coach-detail-modal"]');
  await closeButton.click();

  // Wait for the dialog panel to be hidden (close animation completes).
  await page.waitForSelector('dialog#coach-detail-modal el-dialog-panel', {
    state: 'hidden',
  });

  const triggerHasFocus = await trigger.evaluate((el) => el === document.activeElement);
  // The trigger element must regain focus after close (focus-return).
  if (!triggerHasFocus) {
    throw new Error(
      'Focus-return failed: trigger did not regain focus after CoachDetailModal close',
    );
  }
});
