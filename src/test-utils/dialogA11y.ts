/**
 * Page-level a11y choreography helper for command-API dialogs (ADR-0057).
 *
 * The dialog-open page-a11y specs (`tests/a11y/modal-open.spec.ts`,
 * `tests/a11y/mobile-menu-open.spec.ts`) share an identical
 * open → a11y-scan → focus-trap → close → focus-return choreography against
 * different `el-dialog` instances. That choreography lives here once,
 * parameterised by the per-dialog selectors; each spec keeps only its
 * file-level narrative and its single {@link expectDialogA11y} call.
 *
 * This helper imports {@link expectPageNoA11yViolations} from
 * `~/test-utils/a11yPage` and does **not** import axe-core itself — it carries
 * no axe execution site, so the two-execution-sites invariant (see
 * `src/test-utils/a11yCore.ts`) stays intact.
 */
import type { Page } from 'playwright/test';
import { expectPageNoA11yViolations } from '~/test-utils/a11yPage';

/** Per-dialog selectors that parameterise {@link expectDialogA11y}. */
type DialogA11yOptions = {
  /** Route the dialog lives on, navigated via `page.goto`. */
  readonly route: string;
  /** CSS selector for the button that opens the dialog. */
  readonly openTrigger: string;
  /** CSS selector for the dialog element, e.g. `dialog#coach-detail-modal`. */
  readonly dialogSelector: string;
  /** CSS selector for the button that closes the dialog. */
  readonly closeTrigger: string;
};

/**
 * Drive a command-API dialog (`el-dialog`) into its open state on `route`,
 * a11y-scan the open page, assert the focus-trap holds on Tab, close via the
 * close button, and assert focus returns to the trigger.
 *
 * The panel-visibility wait targets `el-dialog-panel` rather than `dialog[open]`
 * because the `el-dialog` custom element sets `open` immediately while the CSS
 * enter-transition can keep the panel visually hidden momentarily.
 *
 * @param page - Playwright `Page` for the test under which the dialog renders.
 * @param opts - Per-dialog selectors (see {@link DialogA11yOptions}).
 */
export async function expectDialogA11y(page: Page, opts: DialogA11yOptions): Promise<void> {
  const panelSelector = `${opts.dialogSelector} el-dialog-panel`;

  await page.goto(opts.route);

  const trigger = page.locator(opts.openTrigger).first();
  await trigger.click();

  // Wait for the <el-dialog-panel> to become visible inside the open dialog.
  await page.waitForSelector(panelSelector, { state: 'visible' });

  // Scan the full page with the dialog open — axe inspects the live DOM,
  // which includes the dialog panel markup.
  await expectPageNoA11yViolations(page);

  // --- Focus-trap assertion ---
  // Tab once; the new focus target must still be inside el-dialog-panel.
  await page.keyboard.press('Tab');
  const panelContainsFocus = await page.evaluate((sel) => {
    const panel = document.querySelector(sel);
    return panel?.contains(document.activeElement) ?? false;
  }, panelSelector);
  if (!panelContainsFocus) {
    throw new Error(`Focus-trap failed: Tab moved focus outside ${panelSelector}`);
  }

  // --- Focus-return assertion ---
  // Close the dialog via its close button and verify the trigger regains focus.
  await page.locator(opts.closeTrigger).click();
  await page.waitForSelector(panelSelector, { state: 'hidden' });

  const triggerHasFocus = await trigger.evaluate((el) => el === document.activeElement);
  if (!triggerHasFocus) {
    throw new Error(
      `Focus-return failed: trigger did not regain focus after ${opts.dialogSelector} close`,
    );
  }
}
