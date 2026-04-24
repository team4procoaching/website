/**
 * @vitest-environment jsdom
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { animateCounter, composeCounterText } from './counterController';

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
}): HTMLElement {
  const el = document.createElement('dd');
  el.setAttribute('data-countup', '');
  el.dataset.countupTarget = String(options.target);
  if (options.prefix !== undefined) el.dataset.countupPrefix = options.prefix;
  if (options.suffix !== undefined) el.dataset.countupSuffix = options.suffix;
  if (options.initial !== undefined) el.textContent = options.initial;
  document.body.appendChild(el);
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

afterEach(() => {
  document.body.innerHTML = '';
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

// ---------------------------------------------------------------------------
// composeCounterText — pure composition
// ---------------------------------------------------------------------------

describe('composeCounterText', () => {
  it('concatenates prefix, number, and suffix without adding spaces', () => {
    expect(composeCounterText(45, '+', ' lbs')).toBe('+45 lbs');
  });

  it('handles an empty prefix with a leading-space suffix', () => {
    expect(composeCounterText(30, '', ' lbs')).toBe('30 lbs');
  });

  it('handles an empty prefix with a non-space suffix', () => {
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

  it('writes the target text synchronously and marks data-counted without scheduling RAF', () => {
    const rafSpy = vi.spyOn(window, 'requestAnimationFrame');
    const el = buildCounter({ target: 45, prefix: '+', suffix: ' lbs' });

    animateCounter(el);

    expect(el.textContent).toBe('+45 lbs');
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

  it('advances monotonically toward the target and lands exactly on it', () => {
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

    const observedNumbers: number[] = [];
    // 2000ms duration at 16ms/frame = 125 frames; give the loop plenty of
    // headroom so it terminates naturally at progress >= 1. The while-loop
    // bound is a safety net against an infinite scheduling bug.
    let iterations = 0;
    while (pendingFrames.length > 0 && iterations < 500) {
      const cb = pendingFrames.shift();
      if (!cb) break;
      now += 16;
      cb(now);
      const n = Number.parseInt((el.textContent ?? '').replace(/\D/g, ''), 10);
      observedNumbers.push(n);
      iterations += 1;
    }

    // Monotonic: every tick's number is >= the previous tick's.
    for (let i = 1; i < observedNumbers.length; i += 1) {
      expect(observedNumbers[i]).toBeGreaterThanOrEqual(observedNumbers[i - 1]);
    }
    // Final tick lands exactly on the target (no off-by-one from Math.floor).
    expect(el.textContent).toBe('+45 lbs');
  });
});

// ---------------------------------------------------------------------------
// animateCounter — idempotency
// ---------------------------------------------------------------------------

describe('animateCounter — idempotency', () => {
  beforeEach(() => {
    stubMatchMedia(false);
  });

  it('returns immediately when the element already has data-counted="true"', () => {
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
