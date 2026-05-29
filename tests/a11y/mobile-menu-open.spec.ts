/**
 * Page-level accessibility scans for the MobileMenu open state (ADR-0057).
 *
 * Drives the MobileMenu on `/` into its open state via the hamburger button,
 * then asserts:
 *
 * 1. **A11y scan** — no WCAG 2.1 AA violation on the open slide-in menu via
 *    {@link expectPageNoA11yViolations}.
 * 2. **Focus-trap** — Tab cycles within the `<el-dialog-panel>` slide-in
 *    panel; focus does not escape behind the open menu.
 * 3. **Focus-return** — the hamburger trigger regains focus after the menu
 *    closes via its close button.
 *
 * **Mobile-only:** the hamburger button is inside a `div.lg:hidden` wrapper
 * and is only visible/interactive on the Mobile Playwright project
 * (412 × 823 viewport). This test is skipped via `test.skip` when the
 * viewport width exceeds 500 px (i.e. under the Desktop project).
 *
 * Open-trigger selector: `button[command="show-modal"][commandfor="mobile-menu"]`.
 * Dialog: `dialog#mobile-menu`. Panel: `el-dialog-panel` inside that dialog.
 * Close button: `button[command="close"][commandfor="mobile-menu"]`.
 */
import { test } from 'playwright/test';
import { expectPageNoA11yViolations } from '~/test-utils/a11yPage';

// Skip this spec when running under the Desktop project — the hamburger
// button is hidden (`lg:hidden`) in that viewport and the MobileMenu is
// not reachable via normal interaction. The Mobile project uses a 412 px
// viewport; the Desktop project uses 1350 px.
test.skip(
  ({ viewport }) => (viewport?.width ?? 1350) > 500,
  'MobileMenu is only reachable on the Mobile viewport (≤ 500 px)',
);

test('a11y / / — MobileMenu open state', async ({ page }) => {
  await page.goto('/');

  // Click the hamburger button to open MobileMenu.
  const trigger = page.locator('button[command="show-modal"][commandfor="mobile-menu"]');
  await trigger.click();

  // Wait for the <el-dialog-panel> to become visible inside the open dialog.
  // Using `state: 'visible'` on the panel rather than on `dialog[open]`
  // because the el-dialog custom element sets `open` immediately but
  // the CSS enter-transition can keep the panel visually hidden momentarily.
  await page.waitForSelector('dialog#mobile-menu el-dialog-panel', {
    state: 'visible',
  });

  // Scan the full page with the menu open — the slide-in panel is live DOM.
  await expectPageNoA11yViolations(page);

  // --- Focus-trap assertion ---
  // Tab once; the new focus target must still be inside el-dialog-panel.
  await page.keyboard.press('Tab');
  const panelContainsFocus = await page.evaluate(() => {
    const panel = document.querySelector('dialog#mobile-menu el-dialog-panel');
    return panel !== null && panel.contains(document.activeElement);
  });
  // Focus must remain inside the panel after a Tab press (trap is active).
  if (!panelContainsFocus) {
    throw new Error('Focus-trap failed: Tab moved focus outside MobileMenu el-dialog-panel');
  }

  // --- Focus-return assertion ---
  // Close the menu via its close button and verify the hamburger regains focus.
  const closeButton = page.locator('button[command="close"][commandfor="mobile-menu"]');
  await closeButton.click();

  // Wait for the dialog panel to be hidden (close animation completes).
  await page.waitForSelector('dialog#mobile-menu el-dialog-panel', {
    state: 'hidden',
  });

  const triggerHasFocus = await trigger.evaluate((el) => el === document.activeElement);
  // The hamburger trigger must regain focus after close (focus-return).
  if (!triggerHasFocus) {
    throw new Error(
      'Focus-return failed: hamburger trigger did not regain focus after MobileMenu close',
    );
  }
});
