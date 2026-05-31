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
import { expectDialogA11y } from '~/test-utils/dialogA11y';

// Skip this spec when running under the Desktop project — the hamburger
// button is hidden (`lg:hidden`) in that viewport and the MobileMenu is
// not reachable via normal interaction. The Mobile project uses a 412 px
// viewport; the Desktop project uses 1350 px.
test.skip(
  ({ viewport }) => (viewport?.width ?? 1350) > 500,
  'MobileMenu is only reachable on the Mobile viewport (≤ 500 px)',
);

test('a11y / / — MobileMenu open state', async ({ page }) => {
  await expectDialogA11y(page, {
    route: '/',
    openTrigger: 'button[command="show-modal"][commandfor="mobile-menu"]',
    dialogSelector: 'dialog#mobile-menu',
    closeTrigger: 'button[command="close"][commandfor="mobile-menu"]',
  });
});
