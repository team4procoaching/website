/**
 * Client chat screenshots — phone-frame screenshots of real coach-to-client
 * messages, surfaced on the homepage as a "What Our Clients Say"
 * social-proof section.
 *
 * Data-presence flag: the array is empty until coaches deliver real
 * exports. The `ClientChatScreenshots.astro` section component returns
 * nothing when `screenshots.length === 0`, so the homepage call-site
 * can invoke it unconditionally — no env var, no runtime branch in
 * `index.astro`. Pushing entries into this array flips the section on.
 *
 * @see {@link ../components/sections/successStories/ClientChatScreenshots.astro}
 */

import type { ImageSource } from '~/types/components';

/** Single chat-screenshot card payload. */
type ClientChatScreenshot = {
  /** Stable identifier — string slug, used as key in render loops. */
  id: string;
  /**
   * First name shown in the caption strip below the phone frame —
   * typically a coach's client (e.g. "Sarah, week 12").
   */
  captionFirstName: string;
  /** Short context line, e.g. "week 12" or "after stage one". */
  captionContext: string;
  /** Screenshot image at 9:19.5 portrait aspect ratio. */
  screenshotImage: ImageSource;
  /** Alt text for accessibility. */
  screenshotAlt: string;
};

/**
 * Public list — empty at launch. When real exports arrive, add entries
 * here and the section flips on automatically.
 */
const clientChatScreenshots: readonly ClientChatScreenshot[] = [];

// Export
export { clientChatScreenshots };
export type { ClientChatScreenshot };
