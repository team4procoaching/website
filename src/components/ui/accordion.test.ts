// This file imports jsdom as a library (`new JSDOM(html)`) rather than
// switching the test environment to jsdom via Vitest's environment pragma.
// The pragma route conflicts with the Astro Container API's esbuild-init
// invariant on the current Vitest/Node/Astro/esbuild combo; the
// JSDOM-instance route sidesteps the realm clash. See ADR-0037
// §Conventions and the PR-body deviation note for the full chain.
import { JSDOM } from 'jsdom';
import { describe, expect, it } from 'vitest';
import Accordion from '~/components/ui/Accordion.astro';
import { expectNoA11yViolations } from '~/test-utils/a11y';
import { assertNotNull } from '~/test-utils/assertions';
import { buildFaqItems } from '~/test-utils/fixtures';
import { renderAstro } from '~/test-utils/renderAstro';

function parse(html: string): Document {
  return new JSDOM(html).window.document;
}

describe('Accordion (component layer)', () => {
  it('renders no <section> when items is empty', async () => {
    // Locks the `items.length > 0 && (...)` gate at Accordion.astro:64.
    // Removing the gate would emit an empty <section> with header chrome
    // and a stray <dl>; this test fails in that case.
    const html = await renderAstro(Accordion, {
      props: { items: [], idPrefix: 'faq' },
    });
    expect(parse(html).querySelector('section')).toBeNull();
  });

  it('omits data-accordion-exclusive on the root <dl> when exclusive defaults to false', async () => {
    // Astro collapses `undefined` props to absent attributes, so the root
    // <dl> must not carry `data-accordion-exclusive` at all — not even with
    // an empty value. The exclusive-mode controller bootstraps via this
    // attribute (Accordion.astro:143), so its absence is the load-bearing
    // wire for the default-mode behaviour.
    const html = await renderAstro(Accordion, {
      props: { items: buildFaqItems(2), idPrefix: 'faq' },
    });
    const dl = parse(html).querySelector('dl');
    assertNotNull(dl);
    expect('accordionExclusive' in dl.dataset).toBe(false);
  });

  it('emits data-accordion-exclusive on the root <dl> when exclusive is true', async () => {
    const html = await renderAstro(Accordion, {
      props: { items: buildFaqItems(2), idPrefix: 'faq', exclusive: true },
    });
    const dl = parse(html).querySelector('dl');
    assertNotNull(dl);
    expect('accordionExclusive' in dl.dataset).toBe(true);
    expect(dl.dataset.accordionExclusive).toBe('');
  });

  it('pairs each trigger button commandfor with an <el-disclosure> id in the same DOM', async () => {
    // Parse pairwise from the rendered DOM rather than from the input data —
    // the assertion proves the wire (Accordion.astro:86 ↔ :116), not the
    // input. The custom element <el-disclosure> is unknown to jsdom and
    // renders as a generic HTMLElement; that is fine because the assertion
    // targets attributes (`commandfor`, `id`), not custom-element behaviour.
    const html = await renderAstro(Accordion, {
      props: { items: buildFaqItems(2), idPrefix: 'faq' },
    });
    const doc = parse(html);
    const buttons = doc.querySelectorAll<HTMLButtonElement>('button[commandfor]');
    expect(buttons.length).toBe(2);
    for (const button of buttons) {
      const targetId = button.getAttribute('commandfor');
      assertNotNull(targetId);
      const disclosure = doc.querySelector(`el-disclosure[id="${targetId}"]`);
      assertNotNull(disclosure);
    }
  });

  // Three independent cases — not collapsed into a parametrised test.
  // The boolean spread at Accordion.astro:116 manifests at a different
  // <el-disclosure> index per case (first, second, none); an inversion
  // turns all three red simultaneously, so each block is its own
  // failure-witness rather than a redundant restatement.
  it('opens the first item by default (defaultOpenIndex defaults to 0)', async () => {
    const html = await renderAstro(Accordion, {
      props: { items: buildFaqItems(2), idPrefix: 'faq' },
    });
    const disclosures = parse(html).querySelectorAll<HTMLElement>('el-disclosure');
    expect(disclosures.length).toBe(2);
    expect(disclosures[0]?.hasAttribute('hidden')).toBe(false);
    expect(disclosures[1]?.hasAttribute('hidden')).toBe(true);
  });

  it('opens the explicit defaultOpenIndex and hides the others', async () => {
    const html = await renderAstro(Accordion, {
      props: { items: buildFaqItems(2), idPrefix: 'faq', defaultOpenIndex: 1 },
    });
    const disclosures = parse(html).querySelectorAll<HTMLElement>('el-disclosure');
    expect(disclosures.length).toBe(2);
    expect(disclosures[0]?.hasAttribute('hidden')).toBe(true);
    expect(disclosures[1]?.hasAttribute('hidden')).toBe(false);
  });

  it('hides every <el-disclosure> when defaultOpenIndex is -1', async () => {
    // The highest-value test in this file: it locks the boolean-spread
    // `{...(isOpen ? {} : { hidden: true })}` at Accordion.astro:116. An AI
    // edit silently inverting the ternary (e.g.
    // `{...(isOpen ? { hidden: true } : {})}`) turns this assertion red.
    const html = await renderAstro(Accordion, {
      props: { items: buildFaqItems(2), idPrefix: 'faq', defaultOpenIndex: -1 },
    });
    const disclosures = parse(html).querySelectorAll<HTMLElement>('el-disclosure');
    expect(disclosures.length).toBe(2);
    expect(disclosures[0]?.hasAttribute('hidden')).toBe(true);
    expect(disclosures[1]?.hasAttribute('hidden')).toBe(true);
  });

  it('round-trips idPrefix into <el-disclosure> ids and matching button commandfor values', async () => {
    const html = await renderAstro(Accordion, {
      props: { items: buildFaqItems(2), idPrefix: 'faq' },
    });
    const doc = parse(html);
    const disclosures = doc.querySelectorAll<HTMLElement>('el-disclosure');
    expect(disclosures.length).toBe(2);
    expect(disclosures[0]?.getAttribute('id')).toBe('faq-0');
    expect(disclosures[1]?.getAttribute('id')).toBe('faq-1');
    const buttons = doc.querySelectorAll<HTMLButtonElement>('button[commandfor]');
    expect(buttons[0]?.getAttribute('commandfor')).toBe('faq-0');
    expect(buttons[1]?.getAttribute('commandfor')).toBe('faq-1');
  });

  it('nests <dt> and <dd> as direct children of the group <div>, with <el-disclosure> inside the <dd>', async () => {
    // Locks the B4 content-model invariant the a11y pass depends on: the <dd>
    // must be a direct child of the per-item group <div> (not separated from
    // <dt> by an interloping <el-disclosure>), and <el-disclosure> must live
    // inside the <dd>. Regressing either turns the unmodified `definition-list`/
    // `dlitem` axe rules red.
    const html = await renderAstro(Accordion, {
      props: { items: buildFaqItems(2), idPrefix: 'faq' },
    });
    const doc = parse(html);
    const dl = doc.querySelector('dl');
    assertNotNull(dl);
    for (const group of dl.querySelectorAll(':scope > div')) {
      const dt = group.querySelector(':scope > dt');
      const dd = group.querySelector(':scope > dd');
      assertNotNull(dt);
      assertNotNull(dd);
      const disclosure = dd.querySelector(':scope > el-disclosure');
      assertNotNull(disclosure);
    }
  });

  describe('a11y (axe)', () => {
    // No rule disables. The `definition-list`/`dlitem` checks read the DOM
    // content model by element type via getComposedParent — they never read
    // computed `display` (axe-core@4.11.4: dlitemEvaluate, invalidChildrenEvaluate).
    // The markup nests <dt> and <dd> as direct children of the group <div>, with
    // <el-disclosure> relocated inside the <dd>, so both checks pass on the real
    // tree. These assertions run the unmodified rules — they are the witness that
    // the <dl> content model is genuinely valid, not merely suppressed.
    //
    // A `[hidden]` <el-disclosure> subtree is pruned from the screen-reader tree
    // axe walks, so an all-collapsed render can read green even on broken markup.
    // The fix-witnesses are therefore the renders with at least one open
    // disclosure (default + exclusive, both open item 0); the all-collapsed case
    // below is a non-regression check, not a fix-witness.
    it('has no axe violations in the default render', async () => {
      const html = await renderAstro(Accordion, {
        props: { items: buildFaqItems(2), idPrefix: 'faq' },
      });
      await expectNoA11yViolations(html);
    });

    it('has no axe violations in exclusive mode', async () => {
      const html = await renderAstro(Accordion, {
        props: { items: buildFaqItems(2), idPrefix: 'faq', exclusive: true },
      });
      await expectNoA11yViolations(html);
    });

    it('has no axe violations with all items collapsed', async () => {
      const html = await renderAstro(Accordion, {
        props: { items: buildFaqItems(2), idPrefix: 'faq', defaultOpenIndex: -1 },
      });
      await expectNoA11yViolations(html);
    });

    it('has no axe violations when items is empty (vacuous render)', async () => {
      const html = await renderAstro(Accordion, {
        props: { items: [], idPrefix: 'faq' },
      });
      await expectNoA11yViolations(html);
    });
  });
});
