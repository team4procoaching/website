/**
 * @vitest-environment jsdom
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { initAccordion } from './accordionController';

// ---------------------------------------------------------------------------
// Fixture — minimal DOM matching Accordion.astro's exclusive-mode output.
// `<el-disclosure>` is not registered in jsdom; it behaves as an unknown
// HTMLElement. The controller targets DOM attributes and calls `.hide()`
// if present — we stub that method per test to observe calls.
// ---------------------------------------------------------------------------

type Item = { id: string; hidden: boolean };

function buildDom(items: readonly Item[]): HTMLElement {
  const container = document.createElement('dl');
  container.setAttribute('data-accordion-exclusive', '');
  for (const { id, hidden } of items) {
    const row = document.createElement('div');
    const dt = document.createElement('dt');
    const button = document.createElement('button');
    button.type = 'button';
    button.setAttribute('command', '--toggle');
    button.setAttribute('commandfor', id);
    button.textContent = `Trigger ${id}`;
    dt.append(button);

    const disclosure = document.createElement('el-disclosure');
    disclosure.id = id;
    if (hidden) disclosure.setAttribute('hidden', '');
    const dd = document.createElement('dd');
    dd.textContent = `Panel ${id}`;
    disclosure.append(dd);

    row.append(dt, disclosure);
    container.append(row);
  }
  document.body.append(container);
  return container;
}

/** Attach a `.hide()` spy to each `<el-disclosure>` in the container. */
function stubHide(container: HTMLElement): Map<string, ReturnType<typeof vi.fn>> {
  const spies = new Map<string, ReturnType<typeof vi.fn>>();
  for (const el of container.querySelectorAll<HTMLElement>('el-disclosure')) {
    const spy = vi.fn(() => el.setAttribute('hidden', ''));
    (el as HTMLElement & { hide: () => void }).hide = spy;
    spies.set(el.id, spy);
  }
  return spies;
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('initAccordion', () => {
  it('is idempotent — second init call does not attach a duplicate listener', () => {
    const container = buildDom([
      { id: 'faq-0', hidden: false },
      { id: 'faq-1', hidden: false },
    ]);
    const spies = stubHide(container);

    initAccordion(container);
    initAccordion(container);

    // Click button for faq-0. If two listeners were attached, faq-1 would
    // see two `.hide()` calls. With idempotency guard, it should be one.
    const button = container.querySelector<HTMLButtonElement>('button[commandfor="faq-0"]');
    expect(button).not.toBeNull();
    button?.click();

    expect(spies.get('faq-1')?.mock.calls).toHaveLength(1);
  });

  it('sets the initialization guard attribute', () => {
    const container = buildDom([{ id: 'faq-0', hidden: false }]);
    initAccordion(container);
    expect(container.hasAttribute('data-accordion-initialized')).toBe(true);
  });

  it('hides every other open disclosure when a trigger button is clicked', () => {
    const container = buildDom([
      { id: 'faq-0', hidden: false },
      { id: 'faq-1', hidden: false },
      { id: 'faq-2', hidden: false },
    ]);
    const spies = stubHide(container);
    initAccordion(container);

    const button = container.querySelector<HTMLButtonElement>('button[commandfor="faq-1"]');
    button?.click();

    expect(spies.get('faq-0')).toHaveBeenCalledTimes(1);
    expect(spies.get('faq-1')).not.toHaveBeenCalled();
    expect(spies.get('faq-2')).toHaveBeenCalledTimes(1);
  });

  it('skips disclosures that are already hidden', () => {
    const container = buildDom([
      { id: 'faq-0', hidden: true },
      { id: 'faq-1', hidden: false },
      { id: 'faq-2', hidden: true },
    ]);
    const spies = stubHide(container);
    initAccordion(container);

    const button = container.querySelector<HTMLButtonElement>('button[commandfor="faq-1"]');
    button?.click();

    expect(spies.get('faq-0')).not.toHaveBeenCalled();
    expect(spies.get('faq-2')).not.toHaveBeenCalled();
  });

  it('leaves the clicked disclosure alone — the Invokers API handles it', () => {
    const container = buildDom([
      { id: 'faq-0', hidden: false },
      { id: 'faq-1', hidden: true },
    ]);
    const spies = stubHide(container);
    initAccordion(container);

    const button = container.querySelector<HTMLButtonElement>('button[commandfor="faq-0"]');
    button?.click();

    expect(spies.get('faq-0')).not.toHaveBeenCalled();
  });

  it('falls back to setting the hidden attribute when `.hide()` is unavailable', () => {
    const container = buildDom([
      { id: 'faq-0', hidden: false },
      { id: 'faq-1', hidden: false },
    ]);
    // No stubHide() — disclosures have no `.hide()` method available.
    initAccordion(container);

    const button = container.querySelector<HTMLButtonElement>('button[commandfor="faq-0"]');
    button?.click();

    const faq1 = container.querySelector<HTMLElement>('#faq-1');
    expect(faq1?.hasAttribute('hidden')).toBe(true);
  });

  it('ignores clicks outside any trigger button', () => {
    const container = buildDom([
      { id: 'faq-0', hidden: false },
      { id: 'faq-1', hidden: false },
    ]);
    const spies = stubHide(container);
    initAccordion(container);

    // Click on the container padding, not on a trigger button.
    container.click();

    expect(spies.get('faq-0')).not.toHaveBeenCalled();
    expect(spies.get('faq-1')).not.toHaveBeenCalled();
  });

  it('ignores trigger buttons whose commandfor is an empty string', () => {
    const container = buildDom([{ id: 'faq-0', hidden: false }]);
    const button = container.querySelector<HTMLButtonElement>('button');
    button?.setAttribute('commandfor', '');
    const spies = stubHide(container);
    initAccordion(container);

    button?.click();

    expect(spies.get('faq-0')).not.toHaveBeenCalled();
  });
});
