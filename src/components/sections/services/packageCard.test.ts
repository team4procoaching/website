// This file imports jsdom as a library (`new JSDOM(html)`) rather than
// switching the test environment to jsdom via Vitest's environment pragma.
// The pragma route conflicts with the Astro Container API's esbuild-init
// invariant on the current Vitest/Node/Astro/esbuild combo; the
// JSDOM-instance route sidesteps the realm clash. See ADR-0037
// §Conventions and the PR-body deviation note for the full chain.
import { JSDOM } from 'jsdom';
import { describe, expect, it } from 'vitest';
import { routes } from '~/data/routes';
import type { DurationMinutes, PackageSize, SessionPackage } from '~/data/services';
import { renderAstro } from '~/test-utils/renderAstro';
import PackageCard from './PackageCard.astro';

/**
 * Inline-fixture per-card package slices. The Posing record in
 * `~/data/services` carries six packages (3 sizes × 2 durations); the card
 * receives the two-entry slice for one size. Mirrors the inline-fixture
 * pattern in `serviceCard.test.ts` — builder helpers are pinned elsewhere
 * and constructing per-card slices inline keeps the test self-contained.
 */
const onePack: readonly SessionPackage[] = [
  { duration: 30, sessionCount: 1, price: '€149', amount: 149, currency: 'EUR' },
  { duration: 60, sessionCount: 1, price: '€249', amount: 249, currency: 'EUR' },
];

const fivePack: readonly SessionPackage[] = [
  { duration: 30, sessionCount: 5, price: '€699', amount: 699, currency: 'EUR' },
  { duration: 60, sessionCount: 5, price: '€1,149', amount: 1149, currency: 'EUR' },
];

const tenPack: readonly SessionPackage[] = [
  { duration: 30, sessionCount: 10, price: '€1,299', amount: 1299, currency: 'EUR' },
  { duration: 60, sessionCount: 10, price: '€2,149', amount: 2149, currency: 'EUR' },
];

const singleSessionPrices: Readonly<Record<DurationMinutes, number>> = {
  30: 149,
  60: 249,
};

function parse(html: string): Document {
  return new JSDOM(html).window.document;
}

type RenderOverrides = {
  sessionCount: PackageSize;
  packages: readonly SessionPackage[];
  description?: string;
  recommended?: boolean;
};

async function render({
  sessionCount,
  packages,
  description = 'Test description for the package card.',
  recommended = false,
}: RenderOverrides): Promise<Document> {
  const html = await renderAstro(PackageCard, {
    props: { sessionCount, packages, description, recommended, singleSessionPrices },
  });
  return parse(html);
}

describe('PackageCard (component layer)', () => {
  it('renders one price-line block per duration for each card (six total across the three sizes)', async () => {
    // The configurator emits three cards × two durations = six price-line
    // blocks across the suite. A regression that collapses the per-duration
    // structure into a single dynamic block would break the static-class
    // invariant the CSS-only toggle depends on.
    const docs = await Promise.all([
      render({ sessionCount: 1, packages: onePack }),
      render({ sessionCount: 5, packages: fivePack, recommended: true }),
      render({ sessionCount: 10, packages: tenPack }),
    ]);

    const totalBlocks = docs.reduce((sum, doc) => {
      const blocks = doc.querySelectorAll(
        '[class*="group-not-has-[[name=duration][value=min-30]:checked]"], ' +
          '[class*="group-not-has-[[name=duration][value=min-60]:checked]"]',
      );
      return sum + blocks.length;
    }, 0);

    // Two price-block divs per card × three cards = six. CTAs add another
    // two per card (also gated by the same selector), so the wider
    // [class*=…] match counts price-blocks and CTAs together: 4 × 3 = 12.
    expect(totalBlocks).toBe(12);
  });

  it('emits static per-duration visibility classes on every price block', async () => {
    // Tailwind detects each utility at build time. Hand-rolling the selector
    // (which the configurator depends on) is the load-bearing invariant —
    // if a refactor switches to dynamically-constructed class strings,
    // Tailwind drops them from the build and the toggle silently breaks.
    const doc = await render({ sessionCount: 5, packages: fivePack, recommended: true });

    const thirtyMinBlock = doc.querySelector(
      '[class*="group-not-has-[[name=duration][value=min-30]:checked]/tiers:hidden"]',
    );
    const sixtyMinBlock = doc.querySelector(
      '[class*="group-not-has-[[name=duration][value=min-60]:checked]/tiers:hidden"]',
    );

    expect(thirtyMinBlock).not.toBeNull();
    expect(sixtyMinBlock).not.toBeNull();
  });

  it('renders savings caption on 5-pack and 10-pack cards (both durations)', async () => {
    const fiveDoc = await render({ sessionCount: 5, packages: fivePack, recommended: true });
    const tenDoc = await render({ sessionCount: 10, packages: tenPack });

    // Five-pack: 5 × 149 single = 745, package 699, save 46 (30 min); 5 × 249
    // single = 1245, package 1149, save 96 (60 min). Both must render.
    expect(fiveDoc.body.textContent).toContain('Save €46');
    expect(fiveDoc.body.textContent).toContain('Save €96');

    // Ten-pack: 10 × 149 = 1490, package 1299, save 191 (30 min); 10 × 249 =
    // 2490, package 2149, save 341 (60 min).
    expect(tenDoc.body.textContent).toContain('Save €191');
    expect(tenDoc.body.textContent).toContain('Save €341');
  });

  it('omits savings caption on the 1-pack card', async () => {
    // Savings against the single-session anchor is zero by definition for
    // the 1-pack — the helper would still render a structurally-formed
    // string, but the component is responsible for suppressing it. A
    // regression that calls the helper unconditionally would leak a
    // misleading `'Save €0'` line into the UI.
    const doc = await render({ sessionCount: 1, packages: onePack });

    expect(doc.body.textContent).not.toContain('Save €');
  });

  it('renders the Recommended marker visibly on the recommended card', async () => {
    const doc = await render({ sessionCount: 5, packages: fivePack, recommended: true });
    const marker = doc.querySelector('[aria-hidden="true"]');
    const recommendedSpan = Array.from(doc.querySelectorAll('span')).find(
      (s) => s.textContent?.trim() === 'Recommended',
    );

    if (recommendedSpan === undefined) throw new Error('Recommended span not found');
    expect(recommendedSpan.classList.contains('invisible')).toBe(false);
    expect(recommendedSpan.getAttribute('aria-hidden')).toBeNull();
    // The visible marker is not the same node as the aria-hidden CTA arrow.
    expect(marker).not.toBe(recommendedSpan);
  });

  it('reserves the Recommended slot on non-recommended cards with `invisible` + `aria-hidden="true"`', async () => {
    // Round-1 UX finding: the three cards must align vertically regardless
    // of which one carries the marker. The non-recommended cards keep the
    // marker in the DOM but hide it from both sighted users (CSS
    // `visibility: hidden` via Tailwind `invisible`) and assistive tech
    // (`aria-hidden="true"`). A regression that drops the marker entirely
    // would re-introduce the vertical mis-alignment.
    const doc = await render({ sessionCount: 5, packages: fivePack, recommended: false });
    const recommendedSpan = Array.from(doc.querySelectorAll('span')).find(
      (s) => s.textContent?.trim() === 'Recommended',
    );

    if (recommendedSpan === undefined) throw new Error('reserved Recommended span not found');
    expect(recommendedSpan.classList.contains('invisible')).toBe(true);
    expect(recommendedSpan.getAttribute('aria-hidden')).toBe('true');
  });

  it('emits per-duration CTA hrefs with the configurator URL contract', async () => {
    // ADR-0051 contract: the configurator emits
    // `?service=posing&duration=<D>&package=<N>` with numeric values from
    // the typed SessionPackage. Both the URL shape and the typed source are
    // load-bearing — the contact form's reader narrows on the same literal
    // types, and a drift here breaks the prefill flow at the read site
    // (Commit 6).
    const doc = await render({ sessionCount: 5, packages: fivePack, recommended: true });
    const anchors = Array.from(doc.querySelectorAll<HTMLAnchorElement>('a'));
    const hrefs = anchors.map((a) => a.getAttribute('href'));

    expect(hrefs).toContain(`${routes.contact}?service=posing&duration=30min&package=5`);
    expect(hrefs).toContain(`${routes.contact}?service=posing&duration=60min&package=5`);
  });

  it('emits per-duration CTA hrefs across all three pack sizes', async () => {
    const docs = await Promise.all([
      render({ sessionCount: 1, packages: onePack }),
      render({ sessionCount: 5, packages: fivePack, recommended: true }),
      render({ sessionCount: 10, packages: tenPack }),
    ]);

    const allHrefs = docs.flatMap((doc) =>
      Array.from(doc.querySelectorAll<HTMLAnchorElement>('a')).map((a) => a.getAttribute('href')),
    );

    // Six combinations: three sizes × two durations.
    for (const sessionCount of [1, 5, 10] as const) {
      for (const duration of [30, 60] as const) {
        expect(allHrefs).toContain(
          `${routes.contact}?service=posing&duration=${duration}min&package=${sessionCount}`,
        );
      }
    }
  });

  it('renders the CTA label with session count and per-package price for both duration variants', async () => {
    // Reinforcement 2: the CTA the visitor clicks on the configurator
    // already commits to a price; embedding `pkg.price` in the label
    // closes the "what am I requesting?" gap. The label shape is
    // `Request <N> session(s) · <price>` with a U+00B7 middle dot, and
    // each card renders TWO buttons (one per duration entry), so both
    // duration-variant prices must appear on the same card.
    const oneDoc = await render({ sessionCount: 1, packages: onePack });
    const fiveDoc = await render({ sessionCount: 5, packages: fivePack, recommended: true });
    const tenDoc = await render({ sessionCount: 10, packages: tenPack });

    expect(oneDoc.body.textContent).toContain('Request 1 session · €149');
    expect(oneDoc.body.textContent).toContain('Request 1 session · €249');
    expect(fiveDoc.body.textContent).toContain('Request 5 sessions · €699');
    expect(fiveDoc.body.textContent).toContain('Request 5 sessions · €1,149');
    expect(tenDoc.body.textContent).toContain('Request 10 sessions · €1,299');
    expect(tenDoc.body.textContent).toContain('Request 10 sessions · €2,149');
  });

  it('emits distinct CTA label suffixes for the 30-min vs. 60-min duration on the same card', async () => {
    // Contract pin: `Request 5 sessions` is shared across both duration
    // variants and would silently survive a regression that re-collapsed
    // the per-package label to a card-level constant. Reading the price
    // suffix from the two duration-gated anchors makes that regression
    // fail loudly: the 30-min anchor must carry `€699`, the 60-min
    // anchor must carry `€1,149`, and the two suffixes must differ.
    const doc = await render({ sessionCount: 5, packages: fivePack, recommended: true });

    const thirtyMinAnchor = doc.querySelector<HTMLAnchorElement>(
      'a[class*="group-not-has-[[name=duration][value=min-30]:checked]/tiers:hidden"]',
    );
    const sixtyMinAnchor = doc.querySelector<HTMLAnchorElement>(
      'a[class*="group-not-has-[[name=duration][value=min-60]:checked]/tiers:hidden"]',
    );

    if (thirtyMinAnchor === null) throw new Error('30-min CTA anchor not found');
    if (sixtyMinAnchor === null) throw new Error('60-min CTA anchor not found');

    const thirtyText = thirtyMinAnchor.textContent ?? '';
    const sixtyText = sixtyMinAnchor.textContent ?? '';

    expect(thirtyText).toContain('Request 5 sessions · €699');
    expect(sixtyText).toContain('Request 5 sessions · €1,149');
    expect(thirtyText).not.toBe(sixtyText);
  });
});
