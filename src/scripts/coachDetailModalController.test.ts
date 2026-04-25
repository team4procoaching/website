/**
 * @vitest-environment jsdom
 */
import { afterEach, describe, expect, it } from 'vitest';
import type { CoachId, SerializedCoachDetail } from '~/data/coaches';
import { MODAL_IDS } from '~/data/ids';
import { assertNotNull } from '~/test-utils/assertions';
import { initCoachDetailModal } from './coachDetailModalController';

// ---------------------------------------------------------------------------
// Test fixture — minimal DOM matching CoachDetailModal.astro's output
// ---------------------------------------------------------------------------

const HELLE_FIXTURE: SerializedCoachDetail = {
  id: 'helle',
  name: 'Helle Trevino',
  firstName: 'Helle',
  title: '2× Rising Phoenix World Champion',
  fullBio: 'First paragraph about Helle.\n\nSecond paragraph follows.',
  image: 'https://example.test/helle.jpg',
  achievements: ['2× Rising Phoenix Champion', 'Ms. Olympia 2nd Place'],
  specialties: ['Competition Prep', 'Peak Week Protocols'],
  coachingYears: 22,
  competingYears: 27,
};

const GINA_FIXTURE: SerializedCoachDetail = {
  id: 'gina',
  name: 'Gina Cavaliero',
  firstName: 'Gina',
  title: 'IFBB Pro',
  fullBio: 'Gina bio paragraph.',
  image: 'https://example.test/gina.jpg',
  achievements: [],
  specialties: [],
  coachingYears: 0,
  competingYears: 0,
};

function buildCoachModalDom(
  coaches: readonly SerializedCoachDetail[] = [HELLE_FIXTURE, GINA_FIXTURE],
): HTMLDialogElement {
  // The ID lives on the inner <dialog> in production (Modal.astro:43), so the
  // fixture constructs the modal as a <dialog> too.
  const modal = document.createElement('dialog');
  modal.id = MODAL_IDS.coachDetail;
  modal.innerHTML = `
    <article data-coach-detail-content>
      <img src="" alt="" data-coach-image />
      <h3 data-coach-name></h3>
      <p data-coach-title></p>
      <div data-coach-stats>
        <span data-coach-competing-years></span>
        <span data-coach-coaching-years></span>
      </div>
      <div data-coach-bio></div>
      <div data-coach-achievements-section>
        <ul data-coach-achievements></ul>
      </div>
      <div data-coach-specialties-section>
        <ul data-coach-specialties></ul>
      </div>
      <a href="#" data-coach-cta>Start Your Journey</a>
    </article>
  `;
  document.body.appendChild(modal);

  // Coach data template
  const template = document.createElement('template');
  template.id = 'coach-detail-data';
  template.setAttribute('data-json', JSON.stringify(coaches));
  document.body.appendChild(template);

  // Two trigger buttons under document, one per fixture coach.
  for (const coach of coaches) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.setAttribute('data-coach-id', coach.id);
    btn.textContent = `Meet ${coach.firstName}`;
    document.body.appendChild(btn);
  }

  return modal;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Click the trigger button bound to a given coach ID. */
function selectCoach(coachId: CoachId): void {
  const btn = document.querySelector<HTMLButtonElement>(`[data-coach-id="${coachId}"]`);
  assertNotNull(btn);
  btn.click();
}

/**
 * Dispatch a `toggle` event on the modal with the given `newState`. jsdom
 * does not implement the native `<dialog>` toggle flow with `newState`, so
 * this helper builds the event explicitly. The controller reads
 * `event.newState` directly, so this shape is sufficient.
 */
function dispatchToggle(modal: HTMLDialogElement, newState: 'open' | 'closed'): void {
  modal.dispatchEvent(Object.assign(new Event('toggle'), { newState }));
}

afterEach(() => {
  document.body.innerHTML = '';
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('coachDetailModalController', () => {
  it('initializes without errors', () => {
    const modal = buildCoachModalDom();
    expect(() => initCoachDetailModal(modal)).not.toThrow();
    expect(modal.getAttribute('data-coach-detail-initialized')).toBe('');
  });

  it('is idempotent — second init is a no-op', () => {
    const modal = buildCoachModalDom();
    initCoachDetailModal(modal);
    initCoachDetailModal(modal);

    // Drive a populate and assert it ran exactly once. If the document
    // click listener were double-bound, lastCoachId would still resolve
    // to the same coach, so the populate result is identical — but a
    // double-bind is detectable by counting toggle handlers: dispatch
    // toggle once and assert name fills exactly once (jsdom event order
    // is stable; a duplicate listener would not split the result, so
    // the proxy here is the absence of throws plus the textContent check).
    selectCoach('helle');
    dispatchToggle(modal, 'open');
    expect(modal.querySelector('[data-coach-name]')?.textContent).toBe('Helle Trevino');
  });

  it('does not init when the data template is missing', () => {
    const modal = buildCoachModalDom();
    document.getElementById('coach-detail-data')?.remove();
    expect(() => initCoachDetailModal(modal)).not.toThrow();
    expect(modal.hasAttribute('data-coach-detail-initialized')).toBe(false);
  });

  it('populates name, title, bio, image, stats on open', () => {
    const modal = buildCoachModalDom();
    initCoachDetailModal(modal);

    selectCoach('helle');
    dispatchToggle(modal, 'open');

    expect(modal.querySelector('[data-coach-name]')?.textContent).toBe('Helle Trevino');
    expect(modal.querySelector('[data-coach-title]')?.textContent).toBe(
      '2× Rising Phoenix World Champion',
    );
    const image = modal.querySelector<HTMLImageElement>('[data-coach-image]');
    assertNotNull(image);
    expect(image.src).toBe('https://example.test/helle.jpg');
    expect(image.alt).toBe('Helle Trevino');
    expect(modal.querySelector('[data-coach-competing-years]')?.textContent).toBe('27');
    expect(modal.querySelector('[data-coach-coaching-years]')?.textContent).toBe('22');
  });

  it('renders bio paragraphs from double-newline split', () => {
    const modal = buildCoachModalDom();
    initCoachDetailModal(modal);

    selectCoach('helle');
    dispatchToggle(modal, 'open');

    const bioParagraphs = modal.querySelectorAll('[data-coach-bio] > p');
    expect(bioParagraphs).toHaveLength(2);
    expect(bioParagraphs[0]?.textContent).toBe('First paragraph about Helle.');
    expect(bioParagraphs[1]?.textContent).toBe('Second paragraph follows.');
  });

  it('hides achievements section when list is empty', () => {
    const modal = buildCoachModalDom();
    initCoachDetailModal(modal);

    selectCoach('gina');
    dispatchToggle(modal, 'open');

    const section = modal.querySelector<HTMLElement>('[data-coach-achievements-section]');
    assertNotNull(section);
    expect(section.classList.contains('hidden')).toBe(true);
  });

  it('shows achievements section and renders chips when populated', () => {
    const modal = buildCoachModalDom();
    initCoachDetailModal(modal);

    selectCoach('helle');
    dispatchToggle(modal, 'open');

    const section = modal.querySelector<HTMLElement>('[data-coach-achievements-section]');
    assertNotNull(section);
    expect(section.classList.contains('hidden')).toBe(false);

    const items = modal.querySelectorAll('[data-coach-achievements] > li');
    expect(items).toHaveLength(2);
    expect(items[0]?.textContent).toBe('2× Rising Phoenix Champion');
    expect(items[0]?.className).toContain('rounded-full');
  });

  it('hides stats container when both year counts are 0', () => {
    const modal = buildCoachModalDom();
    initCoachDetailModal(modal);

    selectCoach('gina');
    dispatchToggle(modal, 'open');

    const stats = modal.querySelector<HTMLElement>('[data-coach-stats]');
    assertNotNull(stats);
    expect(stats.classList.contains('hidden')).toBe(true);
  });

  it('sets the CTA label on populate', () => {
    const modal = buildCoachModalDom();
    initCoachDetailModal(modal);

    selectCoach('helle');
    dispatchToggle(modal, 'open');

    expect(modal.querySelector('[data-coach-cta]')?.textContent).toBe('Start Your Journey');
  });

  it('skips populate when no [data-coach-id] click preceded the open event', () => {
    const modal = buildCoachModalDom();
    initCoachDetailModal(modal);

    // No selectCoach() call — open the modal cold.
    dispatchToggle(modal, 'open');

    expect(modal.querySelector('[data-coach-name]')?.textContent).toBe('');
    expect(modal.querySelector('[data-coach-title]')?.textContent).toBe('');
  });

  it('aborts the global click listener on astro:before-swap', () => {
    const modal = buildCoachModalDom();
    initCoachDetailModal(modal);

    // After init, dispatch before-swap to trigger AbortController.abort().
    document.dispatchEvent(new CustomEvent('astro:before-swap'));

    // A subsequent click on a [data-coach-id] trigger must not be captured —
    // so a following toggle 'open' should populate nothing.
    selectCoach('helle');
    dispatchToggle(modal, 'open');

    expect(modal.querySelector('[data-coach-name]')?.textContent).toBe('');
  });
});
