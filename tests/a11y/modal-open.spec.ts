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
import { expectDialogA11y } from '~/test-utils/dialogA11y';

test('a11y / /coaches — CoachDetailModal open state', async ({ page }) => {
  // The stretched invisible overlay uses aria-hidden="true" and tabindex="-1";
  // :not([aria-hidden]) selects the visible Button CTA as the accessible trigger.
  await expectDialogA11y(page, {
    route: '/coaches',
    openTrigger: 'button[command="show-modal"][commandfor="coach-detail-modal"]:not([aria-hidden])',
    dialogSelector: 'dialog#coach-detail-modal',
    closeTrigger: 'button[command="close"][commandfor="coach-detail-modal"]',
  });
});
