/**
 * @vitest-environment jsdom
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type CounterModule = typeof import('./counterController');

/**
 * Load a fresh `counterController` module per test. The module keeps its
 * IntersectionObserver handle in a module-level `let`; without reset that
 * handle would leak across tests together with the stubbed `IntersectionObserver`
 * global from a prior test. Dynamic import + `vi.resetModules` keeps each
 * test's module scope independent.
 */
async function loadController(): Promise<CounterModule> {
  vi.resetModules();
  return import('./counterController');
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

/**
 * Build a minimal `[data-countup]` element matching what `StatsGrid.astro`
 * renders at build time. `initial` is the server-rendered placeholder text
 * (useful for the idempotency assertion below).
 */
function buildCounter(options: {
  target: number;
  prefix?: string;
  suffix?: string;
  initial?: string;
  parent?: HTMLElement;
}): HTMLElement {
  const el = document.createElement('dd');
  el.setAttribute('data-countup', '');
  el.dataset.countupTarget = String(options.target);
  if (options.prefix !== undefined) el.dataset.countupPrefix = options.prefix;
  if (options.suffix !== undefined) el.dataset.countupSuffix = options.suffix;
  if (options.initial !== undefined) el.textContent = options.initial;
  (options.parent ?? document.body).appendChild(el);
  return el;
}

/**
 * Install a `matchMedia` stub that returns the given `matches` value for any
 * query. jsdom does not implement `matchMedia`; tests must provide their own.
 */
function stubMatchMedia(matches: boolean): void {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }));
}

/**
 * Controllable `IntersectionObserver` stub. jsdom does not ship one. Each
 * instance records its callback and observed elements and exposes
 * {@link IOHandle.trigger} to synthesise an intersection for a specific
 * element. {@link IOHandle.instances} collects every constructed observer
 * so tests can assert on allocation counts (idempotency across re-init
 * calls).
 */
type FakeIO = {
  callback: IntersectionObserverCallback;
  observed: HTMLElement[];
  unobserved: HTMLElement[];
  disconnected: boolean;
};

type IOHandle = {
  instances: FakeIO[];
  trigger: (el: HTMLElement) => void;
};

function installIntersectionObserverStub(): IOHandle {
  const instances: FakeIO[] = [];
  class StubObserver {
    private readonly state: FakeIO;
    constructor(callback: IntersectionObserverCallback) {
      this.state = { callback, observed: [], unobserved: [], disconnected: false };
      instances.push(this.state);
    }
    observe(el: HTMLElement): void {
      this.state.observed.push(el);
    }
    unobserve(el: HTMLElement): void {
      this.state.unobserved.push(el);
    }
    disconnect(): void {
      this.state.disconnected = true;
    }
    takeRecords(): IntersectionObserverEntry[] {
      return [];
    }
  }
  vi.stubGlobal('IntersectionObserver', StubObserver);

  function trigger(el: HTMLElement): void {
    for (const instance of instances) {
      if (!instance.observed.includes(el)) continue;
      if (instance.unobserved.includes(el)) continue;
      const entry = {
        isIntersecting: true,
        target: el,
        intersectionRatio: 1,
        boundingClientRect: el.getBoundingClientRect(),
        intersectionRect: el.getBoundingClientRect(),
        rootBounds: null,
        time: 0,
      } as IntersectionObserverEntry;
      instance.callback([entry], instance as unknown as IntersectionObserver);
    }
  }

  return { instances, trigger };
}

afterEach(() => {
  document.body.innerHTML = '';
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

// ---------------------------------------------------------------------------
// composeCounterText — pure composition
// ---------------------------------------------------------------------------

describe('composeCounterText', () => {
  it('concatenates prefix, number, and suffix without adding spaces', async () => {
    const { composeCounterText } = await loadController();
    expect(composeCounterText(45, '+', ' lbs')).toBe('+45 lbs');
  });

  it('handles an empty prefix with a leading-space suffix', async () => {
    const { composeCounterText } = await loadController();
    expect(composeCounterText(30, '', ' lbs')).toBe('30 lbs');
  });

  it('handles an empty prefix with a non-space suffix', async () => {
    const { composeCounterText } = await loadController();
    expect(composeCounterText(100, '', '%')).toBe('100%');
  });
});

// ---------------------------------------------------------------------------
// animateCounter — reduced motion
// ---------------------------------------------------------------------------

describe('animateCounter — prefers-reduced-motion', () => {
  beforeEach(() => {
    stubMatchMedia(true);
  });

  it('writes the target text synchronously and marks data-counted without scheduling RAF', async () => {
    const { animateCounter, composeCounterText } = await loadController();
    const rafSpy = vi.spyOn(window, 'requestAnimationFrame');
    const el = buildCounter({ target: 45, prefix: '+', suffix: ' lbs' });

    animateCounter(el);

    expect(el.textContent).toBe(composeCounterText(45, '+', ' lbs'));
    expect(el.dataset.counted).toBe('true');
    expect(rafSpy).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// animateCounter — RAF loop (reduced motion off)
// ---------------------------------------------------------------------------

describe('animateCounter — RAF loop', () => {
  beforeEach(() => {
    stubMatchMedia(false);
  });

  it('advances monotonically toward the target and lands exactly on it', async () => {
    const { animateCounter, composeCounterText } = await loadController();
    const el = buildCounter({ target: 45, prefix: '+', suffix: ' lbs' });

    // Deterministic clock: performance.now returns the current fake time;
    // requestAnimationFrame schedules the callback to run at time+16ms. The
    // harness then drives the loop tick-by-tick and records the observed
    // `textContent` after each tick.
    let now = 0;
    const pendingFrames: Array<(t: number) => void> = [];
    vi.spyOn(performance, 'now').mockImplementation(() => now);
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      pendingFrames.push(cb);
      return pendingFrames.length;
    });

    animateCounter(el);

    const observedTexts: string[] = [];
    // 2000ms duration at 16ms/frame = 125 frames; give the loop plenty of
    // headroom so it terminates naturally at progress >= 1. The while-loop
    // bound is a safety net against an infinite scheduling bug.
    let iterations = 0;
    while (pendingFrames.length > 0 && iterations < 500) {
      const cb = pendingFrames.shift();
      if (!cb) break;
      now += 16;
      cb(now);
      observedTexts.push(el.textContent ?? '');
      iterations += 1;
    }

    // Every tick is a `composeCounterText(current, '+', ' lbs')` result for
    // some `current` in [0, 45]. Asserting the full rendered string shape
    // also locks down the composition contract: a future bug that drops
    // the prefix would produce `"0 lbs"` instead of `"+0 lbs"` and fail
    // here, not just at the final-tick check.
    for (const text of observedTexts) {
      expect(text).toMatch(/^\+\d+ lbs$/);
    }
    // Monotonic: every tick's numeric value is >= the previous tick's. The
    // rendered strings are structured, so parse the number by stripping the
    // known prefix and suffix rather than stripping all non-digits.
    const parseRendered = (text: string): number => Number(text.slice(1, -' lbs'.length));
    for (let i = 1; i < observedTexts.length; i += 1) {
      expect(parseRendered(observedTexts[i])).toBeGreaterThanOrEqual(
        parseRendered(observedTexts[i - 1]),
      );
    }
    // Final tick lands exactly on the target (no off-by-one from Math.floor).
    expect(el.textContent).toBe(composeCounterText(45, '+', ' lbs'));
  });

  it('animates a target of 0 to the `0` rendered text on the first tick', async () => {
    const { animateCounter, composeCounterText } = await loadController();
    const el = buildCounter({ target: 0, suffix: ' refunds' });

    let now = 0;
    const pendingFrames: Array<(t: number) => void> = [];
    vi.spyOn(performance, 'now').mockImplementation(() => now);
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      pendingFrames.push(cb);
      return pendingFrames.length;
    });

    animateCounter(el);

    // Drive one tick past the full duration; `progress >= 1` short-circuits
    // to the target value.
    const cb = pendingFrames.shift();
    expect(cb).toBeDefined();
    now += 2000;
    cb?.(now);

    expect(el.textContent).toBe(composeCounterText(0, '', ' refunds'));
    expect(el.dataset.counted).toBe('true');
  });

  it('ignores an element whose data-countup-target is missing', async () => {
    const { animateCounter } = await loadController();
    const el = document.createElement('dd');
    el.setAttribute('data-countup', '');
    el.textContent = 'placeholder';
    document.body.appendChild(el);
    const rafSpy = vi.spyOn(window, 'requestAnimationFrame');

    animateCounter(el);

    expect(el.textContent).toBe('placeholder');
    expect(el.dataset.counted).toBeUndefined();
    expect(rafSpy).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// animateCounter — idempotency
// ---------------------------------------------------------------------------

describe('animateCounter — idempotency', () => {
  beforeEach(() => {
    stubMatchMedia(false);
  });

  it('returns immediately when the element already has data-counted="true"', async () => {
    const { animateCounter } = await loadController();
    const rafSpy = vi.spyOn(window, 'requestAnimationFrame');
    const el = buildCounter({
      target: 45,
      prefix: '+',
      suffix: ' lbs',
      initial: 'already-set',
    });
    el.dataset.counted = 'true';

    animateCounter(el);

    expect(el.textContent).toBe('already-set');
    expect(rafSpy).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// initCounters — observer bootstrap, idempotency, scoping
// ---------------------------------------------------------------------------

describe('initCounters', () => {
  beforeEach(() => {
    stubMatchMedia(true); // reduced-motion path — avoids RAF for assertions.
  });

  it('observes every [data-countup]:not([data-counted]) under the root and animates on intersection', async () => {
    const io = installIntersectionObserverStub();
    const { initCounters, composeCounterText } = await loadController();
    const a = buildCounter({ target: 45, prefix: '+', suffix: ' lbs' });
    const b = buildCounter({ target: 100, suffix: '%' });

    initCounters(document);

    expect(io.instances).toHaveLength(1);
    expect(io.instances[0].observed).toEqual([a, b]);

    io.trigger(a);
    io.trigger(b);

    expect(a.textContent).toBe(composeCounterText(45, '+', ' lbs'));
    expect(b.textContent).toBe(composeCounterText(100, '', '%'));
    expect(a.dataset.counted).toBe('true');
    expect(b.dataset.counted).toBe('true');
  });

  it('is idempotent across re-calls — does not construct a second observer and does not re-fire animation on already-counted elements', async () => {
    const io = installIntersectionObserverStub();
    const { initCounters } = await loadController();
    const a = buildCounter({ target: 45, prefix: '+', suffix: ' lbs' });

    initCounters(document);
    io.trigger(a); // animate a on first batch.
    expect(a.dataset.counted).toBe('true');

    // Re-call with the same DOM. The query filter `:not([data-counted])`
    // drops `a`, so nothing new is observed; no second observer is built.
    initCounters(document);

    expect(io.instances).toHaveLength(1);
    // No additional observe() calls for `a` — it was already unobserved and
    // now carries data-counted, so the re-scan skips it entirely.
    expect(io.instances[0].observed).toEqual([a]);
  });

  it('picks up newly-added counters on re-call and attaches them to the same observer', async () => {
    const io = installIntersectionObserverStub();
    const { initCounters, composeCounterText } = await loadController();
    const a = buildCounter({ target: 45, prefix: '+', suffix: ' lbs' });

    initCounters(document);
    io.trigger(a);

    // Later insertion (View Transition navigation injects new tiles, or a
    // dynamic subtree adds more counters).
    const b = buildCounter({ target: 100, suffix: '%' });
    initCounters(document);

    expect(io.instances).toHaveLength(1);
    expect(io.instances[0].observed).toEqual([a, b]);

    io.trigger(b);
    expect(b.textContent).toBe(composeCounterText(100, '', '%'));
  });

  it('scopes the scan to the provided root — counters outside the subtree are ignored', async () => {
    const io = installIntersectionObserverStub();
    const { initCounters } = await loadController();
    const subroot = document.createElement('section');
    document.body.appendChild(subroot);
    const inside = buildCounter({ target: 45, prefix: '+', suffix: ' lbs', parent: subroot });
    const outside = buildCounter({ target: 100, suffix: '%' });

    initCounters(subroot);

    expect(io.instances).toHaveLength(1);
    expect(io.instances[0].observed).toEqual([inside]);
    expect(io.instances[0].observed).not.toContain(outside);
  });

  it('no-ops when the root contains no counters', async () => {
    const io = installIntersectionObserverStub();
    const { initCounters } = await loadController();
    document.body.appendChild(document.createElement('section'));

    initCounters(document);

    expect(io.instances).toHaveLength(0);
  });
});
