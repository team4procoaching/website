/**
 * @vitest-environment jsdom
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

import { bootstrapOnLoad } from './bootstrap';

/**
 * Tests for the dual-dispatch bootstrap helper.
 *
 * The helper dispatches an init function on either the current
 * `document.readyState` (if already past 'loading') or on
 * `DOMContentLoaded`, plus always on `astro:page-load`.
 *
 * Not tested here: the `{ once: true }` invariant on the
 * DOMContentLoaded listener. jsdom does not respect the `once` option
 * — a listener registered with `{ once: true }` in jsdom fires on
 * every dispatch, not exactly once. A jsdom-based assertion would
 * therefore not exercise the real browser semantics. The invariant is
 * carried by the platform and verified by manual / production
 * testing. This note exists so a future reader does not assume the
 * fourth test was forgotten.
 */

afterEach(() => {
  // Clean up any listeners left attached to document between tests —
  // each test adds one to `astro:page-load` (and possibly one to
  // `DOMContentLoaded`), so a shared document would accumulate them.
  vi.restoreAllMocks();
});

describe('bootstrapOnLoad', () => {
  it('invokes init immediately when document is already past loading', () => {
    // In jsdom the default readyState is 'complete', which satisfies
    // the `!== 'loading'` check. The init should run synchronously
    // during the bootstrap call, before the DOMContentLoaded pathway
    // would fire.
    const init = vi.fn();
    bootstrapOnLoad(init);
    expect(init).toHaveBeenCalledTimes(1);
  });

  it('defers init to DOMContentLoaded when document is still loading', () => {
    // Simulate the loading state: bootstrap should NOT run init
    // immediately; instead it should register a DOMContentLoaded
    // listener that fires init when the event dispatches.
    const init = vi.fn();
    vi.spyOn(document, 'readyState', 'get').mockReturnValue('loading');

    bootstrapOnLoad(init);
    expect(init, 'init must not run while still loading').not.toHaveBeenCalled();

    document.dispatchEvent(new Event('DOMContentLoaded'));
    expect(init, 'init must run on DOMContentLoaded').toHaveBeenCalledTimes(1);
  });

  it('also invokes init on astro:page-load, independent of the initial pathway', () => {
    // This is the second dispatch arm — every View Transition
    // navigation fires astro:page-load, and bootstrap must route it
    // back to init so the component re-mounts against the new DOM.
    const init = vi.fn();
    bootstrapOnLoad(init);
    // One call from the immediate pathway (readyState === 'complete').
    expect(init).toHaveBeenCalledTimes(1);

    document.dispatchEvent(new Event('astro:page-load'));
    expect(
      init,
      'astro:page-load must re-invoke init for View Transition navigation',
    ).toHaveBeenCalledTimes(2);
  });
});
