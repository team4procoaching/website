/**
 * @vitest-environment jsdom
 */
import { afterEach, describe, expect, it } from 'vitest';
import { MODAL_IDS } from '~/data/ids';
import type { SerializedSuccessStoryModalPayload, StoryId } from '~/data/successStories';
import { assertNotNull } from '~/test-utils/assertions';
import { initSuccessStoryReadMoreModal } from './successStoryReadMoreModalController';

// ---------------------------------------------------------------------------
// Test fixtures — minimal payloads matching SerializedSuccessStoryModalPayload
// ---------------------------------------------------------------------------

const SARAH_FIXTURE: SerializedSuccessStoryModalPayload = {
  id: 'sarah-m' as StoryId,
  name: 'Sarah M.',
  transformation: 'Lost 30lbs',
  duration: '6 months',
  serviceId: 'get-lean',
  serviceName: 'Get Lean',
  serviceLinkHref: '/contact?service=get-lean',
  contactHref: '/contact?service=get-lean',
  coachFirstName: 'Gina',
  beforeImage: 'https://example.test/sarah-before.jpg',
  afterImage: 'https://example.test/sarah-after.jpg',
  longTestimony: 'First paragraph of testimony.\n\nSecond paragraph of testimony.',
};

const JESSICA_FIXTURE: SerializedSuccessStoryModalPayload = {
  id: 'jessica-k' as StoryId,
  name: 'Jessica K.',
  transformation: 'First Bikini Competition Win',
  duration: '16 weeks',
  serviceId: 'competition-prep',
  serviceName: 'Competition Prep',
  serviceLinkHref: '/services/competition-prep',
  contactHref: '/contact?service=competition-prep',
  coachFirstName: 'Helle',
  beforeImage: 'https://example.test/jessica-before.jpg',
  afterImage: 'https://example.test/jessica-after.jpg',
  longTestimony: null,
};

function buildStoryModalDom(
  stories: readonly SerializedSuccessStoryModalPayload[] = [SARAH_FIXTURE, JESSICA_FIXTURE],
): HTMLDialogElement {
  // The ID lives on the inner <dialog> in production (Modal.astro:43),
  // so the fixture constructs the modal as a <dialog> too.
  const modal = document.createElement('dialog');
  modal.id = MODAL_IDS.successStoryReadMore;
  modal.innerHTML = `
    <article data-success-story-detail-content>
      <img src="" alt="" data-success-story-before-image />
      <img src="" alt="" data-success-story-after-image />
      <h3 id="success-story-read-more-name" data-success-story-name></h3>
      <p data-success-story-transformation></p>
      <a href="" data-success-story-service-link></a>
      <div data-success-story-long-testimony></div>
      <a href="" data-success-story-cta></a>
    </article>
  `;
  document.body.appendChild(modal);

  // Story data template
  const template = document.createElement('template');
  template.id = 'success-story-read-more-data';
  template.dataset.json = JSON.stringify(stories);
  document.body.appendChild(template);

  // Trigger buttons under document — one per fixture story.
  for (const story of stories) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.dataset.successStoryId = story.id;
    btn.textContent = `Read more about ${story.name}`;
    document.body.appendChild(btn);
  }

  return modal;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Click the trigger button bound to a given story ID. */
function selectStory(storyId: StoryId): void {
  const btn = document.querySelector<HTMLButtonElement>(`[data-success-story-id="${storyId}"]`);
  assertNotNull(btn);
  btn.click();
}

/**
 * Dispatch a `toggle` event on the modal with the given `newState`.
 * jsdom does not implement the native `<dialog>` toggle flow with
 * `newState`, so this helper builds the event explicitly. The
 * controller reads `event.newState` directly, so this shape is
 * sufficient.
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

describe('successStoryReadMoreModalController', () => {
  it('initializes without errors', () => {
    const modal = buildStoryModalDom();
    expect(() => initSuccessStoryReadMoreModal(modal)).not.toThrow();
    expect(modal.dataset.successStoryReadMoreInitialized).toBe('');
  });

  it('is idempotent — second init does not double-bind populate', () => {
    const modal = buildStoryModalDom();
    initSuccessStoryReadMoreModal(modal);
    initSuccessStoryReadMoreModal(modal);

    selectStory('sarah-m' as StoryId);
    dispatchToggle(modal, 'open');

    // populateStory increments `data-populate-count` once per call. A
    // double-bound modal-toggle listener would run populate twice for
    // one dispatched event and produce 2; the guard keeps the count
    // at 1.
    expect(modal.dataset.populateCount).toBe('1');
  });

  it('does not init when the data template is missing', () => {
    const modal = buildStoryModalDom();
    document.getElementById('success-story-read-more-data')?.remove();
    expect(() => initSuccessStoryReadMoreModal(modal)).not.toThrow();
    expect('successStoryReadMoreInitialized' in modal.dataset).toBe(false);
  });

  it('populates name, transformation, service link, and CTA on open', () => {
    const modal = buildStoryModalDom();
    initSuccessStoryReadMoreModal(modal);

    selectStory('sarah-m' as StoryId);
    dispatchToggle(modal, 'open');

    expect(modal.querySelector('[data-success-story-name]')?.textContent).toBe('Sarah M.');
    expect(modal.querySelector('[data-success-story-transformation]')?.textContent).toBe(
      'Lost 30lbs · 6 months',
    );
    const serviceLink = modal.querySelector<HTMLAnchorElement>('[data-success-story-service-link]');
    assertNotNull(serviceLink);
    expect(serviceLink.getAttribute('href')).toBe('/contact?service=get-lean');
    expect(serviceLink.textContent).toBe('» Get Lean →');
    expect(modal.querySelector('[data-success-story-cta]')?.textContent).toBe('Work with Gina');
  });

  it('populates the before/after image src and alt text', () => {
    const modal = buildStoryModalDom();
    initSuccessStoryReadMoreModal(modal);

    selectStory('sarah-m' as StoryId);
    dispatchToggle(modal, 'open');

    const before = modal.querySelector<HTMLImageElement>('[data-success-story-before-image]');
    const after = modal.querySelector<HTMLImageElement>('[data-success-story-after-image]');
    assertNotNull(before);
    assertNotNull(after);
    expect(before.src).toBe('https://example.test/sarah-before.jpg');
    expect(before.alt).toBe('Sarah M. before transformation');
    expect(after.src).toBe('https://example.test/sarah-after.jpg');
    expect(after.alt).toBe('Sarah M. after transformation');
  });

  it('hides the long-testimony block when the field is null', () => {
    const modal = buildStoryModalDom();
    initSuccessStoryReadMoreModal(modal);

    selectStory('jessica-k' as StoryId);
    dispatchToggle(modal, 'open');

    const block = modal.querySelector<HTMLElement>('[data-success-story-long-testimony]');
    assertNotNull(block);
    expect(block.classList.contains('hidden')).toBe(true);
    // Defensive: no leftover <p> children from a prior populate.
    expect(block.children.length).toBe(0);
  });

  it('renders long-testimony paragraphs from double-newline split', () => {
    const modal = buildStoryModalDom();
    initSuccessStoryReadMoreModal(modal);

    selectStory('sarah-m' as StoryId);
    dispatchToggle(modal, 'open');

    const block = modal.querySelector<HTMLElement>('[data-success-story-long-testimony]');
    assertNotNull(block);
    expect(block.classList.contains('hidden')).toBe(false);
    const paragraphs = block.querySelectorAll('p');
    expect(paragraphs).toHaveLength(2);
    expect(paragraphs[0]?.textContent).toBe('First paragraph of testimony.');
    expect(paragraphs[1]?.textContent).toBe('Second paragraph of testimony.');
  });

  it('in-popup CTA href always resolves to the payload contactHref', () => {
    // Mutation pair: a future change that accidentally points the
    // popup CTA at `serviceLinkHref` (the discovery target) would fail
    // this case for Jessica, whose `serviceLinkHref` differs from
    // `contactHref` in the fixture.
    const modal = buildStoryModalDom();
    initSuccessStoryReadMoreModal(modal);

    selectStory('jessica-k' as StoryId);
    dispatchToggle(modal, 'open');

    const cta = modal.querySelector<HTMLAnchorElement>('[data-success-story-cta]');
    assertNotNull(cta);
    expect(cta.getAttribute('href')).toBe('/contact?service=competition-prep');
    expect(cta.getAttribute('href')).not.toBe('/services/competition-prep');
  });

  it('personalises the CTA label per story on populate', () => {
    const modal = buildStoryModalDom();
    initSuccessStoryReadMoreModal(modal);

    selectStory('sarah-m' as StoryId);
    dispatchToggle(modal, 'open');
    expect(modal.querySelector('[data-success-story-cta]')?.textContent).toBe('Work with Gina');

    selectStory('jessica-k' as StoryId);
    dispatchToggle(modal, 'open');
    expect(modal.querySelector('[data-success-story-cta]')?.textContent).toBe('Work with Helle');
  });

  it('switches content per trigger across multiple opens', () => {
    const modal = buildStoryModalDom();
    initSuccessStoryReadMoreModal(modal);

    selectStory('sarah-m' as StoryId);
    dispatchToggle(modal, 'open');
    expect(modal.querySelector('[data-success-story-name]')?.textContent).toBe('Sarah M.');

    dispatchToggle(modal, 'closed');

    selectStory('jessica-k' as StoryId);
    dispatchToggle(modal, 'open');
    expect(modal.querySelector('[data-success-story-name]')?.textContent).toBe('Jessica K.');
  });

  it('skips populate when no [data-success-story-id] click preceded the open event', () => {
    const modal = buildStoryModalDom();
    initSuccessStoryReadMoreModal(modal);

    // No selectStory() call — open the modal cold.
    dispatchToggle(modal, 'open');

    expect(modal.querySelector('[data-success-story-name]')?.textContent).toBe('');
    expect(modal.querySelector('[data-success-story-transformation]')?.textContent).toBe('');
  });

  it('aborts the global click listener on astro:before-swap', () => {
    const modal = buildStoryModalDom();
    initSuccessStoryReadMoreModal(modal);

    // After init, dispatch before-swap to trigger AbortController.abort().
    document.dispatchEvent(new CustomEvent('astro:before-swap'));

    // A subsequent click on a [data-success-story-id] trigger must
    // not be captured — so a following toggle 'open' should populate
    // nothing.
    selectStory('sarah-m' as StoryId);
    dispatchToggle(modal, 'open');

    expect(modal.querySelector('[data-success-story-name]')?.textContent).toBe('');
  });
});
