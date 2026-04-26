// This file imports jsdom as a library (`new JSDOM(html)`) rather than
// switching the test environment to jsdom via Vitest's environment pragma.
// The pragma route conflicts with the Astro Container API's esbuild-init
// invariant on the current Vitest/Node/Astro/esbuild combo; the
// JSDOM-instance route sidesteps the realm clash. See ADR-0037
// §Conventions and the PR-body deviation note for the full chain.
import { JSDOM } from 'jsdom';
import { describe, expect, it } from 'vitest';
import StatsGrid from '~/components/ui/StatsGrid.astro';
import type { Stat } from '~/data/stats';
import { composeCounterText } from '~/scripts/counterController';
import { assertNotNull } from '~/test-utils/assertions';
import { buildStats } from '~/test-utils/fixtures';
import { renderAstro } from '~/test-utils/renderAstro';

function parse(html: string): Document {
  return new JSDOM(html).window.document;
}

describe('StatsGrid (component layer)', () => {
  it('paints the 2-col token on the root <dl> when stats.length is 2', async () => {
    // classList.contains is token-aware and whitespace-insensitive — defends
    // against the trailing-space substring trap when one Tailwind utility is
    // a prefix of another. Locks the `stats.length <= 2 ? 2 : …` branch at
    // StatsGrid.astro:55 → the 2-col entry of `gridColumnClasses`.
    const html = await renderAstro(StatsGrid, { props: { stats: buildStats(2) } });
    const dl = parse(html).querySelector('dl');
    assertNotNull(dl);
    expect(dl.classList.contains('sm:grid-cols-2')).toBe(true);
  });

  it('paints the 3-col token on the root <dl> when stats.length is 3', async () => {
    const html = await renderAstro(StatsGrid, { props: { stats: buildStats(3) } });
    const dl = parse(html).querySelector('dl');
    assertNotNull(dl);
    expect(dl.classList.contains('sm:grid-cols-3')).toBe(true);
    expect(dl.classList.contains('sm:grid-cols-2')).toBe(false);
  });

  it('paints the 4-col token on the root <dl> when stats.length is 4 or more', async () => {
    const html = await renderAstro(StatsGrid, { props: { stats: buildStats(4) } });
    const dl = parse(html).querySelector('dl');
    assertNotNull(dl);
    expect(dl.classList.contains('lg:grid-cols-4')).toBe(true);
  });

  it('honours explicit columns prop and ignores the derivation', async () => {
    // 4 stats would derive to the 4-col token; explicit `columns: 2` must
    // override that and select the 2-col entry of `gridColumnClasses`. Locks
    // the `columns = stats.length <= 2 ? … : 4` default-only behaviour at
    // StatsGrid.astro:55.
    const html = await renderAstro(StatsGrid, {
      props: { stats: buildStats(4), columns: 2 },
    });
    const dl = parse(html).querySelector('dl');
    assertNotNull(dl);
    expect(dl.classList.contains('sm:grid-cols-2')).toBe(true);
    expect(dl.classList.contains('lg:grid-cols-4')).toBe(false);
  });

  it('wires data-countup, data-countup-target, and composeCounterText text on every <dd>', async () => {
    // The text-content assertion locks the helper-call wiring at
    // StatsGrid.astro:85 — defends against an AI edit that keeps the
    // `composeCounterText` import but replaces the call with a hardcoded
    // number. Per §Scope condition 2 of ADR-0037, a function call whose
    // arguments and return value carry meaning is in scope at the unit layer.
    // Per-entry literal stays inline: the target/prefix/suffix values are the
    // assertion target, so `buildStats` would obscure rather than clarify.
    const stats: Stat[] = [
      { target: 45, label: 'Reps' },
      { target: 100, prefix: '$', suffix: 'M', label: 'Revenue' },
    ];
    const html = await renderAstro(StatsGrid, { props: { stats } });
    const dds = parse(html).querySelectorAll<HTMLElement>('dd');
    expect(dds.length).toBe(2);
    const [first, second] = dds;
    assertNotNull(first);
    assertNotNull(second);
    expect(first.hasAttribute('data-countup')).toBe(true);
    expect(second.hasAttribute('data-countup')).toBe(true);
    expect(first.getAttribute('data-countup-target')).toBe('45');
    expect(second.getAttribute('data-countup-target')).toBe('100');
    expect((first.textContent ?? '').trim()).toBe(composeCounterText(45, '', ''));
    expect((second.textContent ?? '').trim()).toBe(composeCounterText(100, '$', 'M'));
  });

  it('emits data-countup-prefix and data-countup-suffix only when truthy', async () => {
    // The conditional spread at StatsGrid.astro:81-82
    // `{...(stat.prefix ? { 'data-countup-prefix': stat.prefix } : {})}` is
    // the wire `counterController.test.ts:330` observes: an absent
    // `data-countup-prefix` reaches the controller as `''` because the
    // attribute is *not set*, not set to `''`. Weakening the spread to
    // `{ 'data-countup-prefix': stat.prefix ?? '' }` would emit
    // `data-countup-prefix=""` on the bare stat and turn this test red.
    const stats: Stat[] = [
      { target: 100, prefix: '$', suffix: 'M', label: 'With' },
      { target: 100, label: 'Without' },
    ];
    const html = await renderAstro(StatsGrid, { props: { stats } });
    const dds = parse(html).querySelectorAll<HTMLElement>('dd');
    expect(dds.length).toBe(2);
    const [withAffixes, withoutAffixes] = dds;
    assertNotNull(withAffixes);
    assertNotNull(withoutAffixes);
    expect(withAffixes.getAttribute('data-countup-prefix')).toBe('$');
    expect(withAffixes.getAttribute('data-countup-suffix')).toBe('M');
    expect(withoutAffixes.hasAttribute('data-countup-prefix')).toBe(false);
    expect(withoutAffixes.hasAttribute('data-countup-suffix')).toBe(false);
  });
});
