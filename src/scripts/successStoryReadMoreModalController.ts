/**
 * SuccessStoryReadMoreModal controller — populates the shared
 * read-more dialog from the per-story payload serialized on the
 * Astro frontmatter.
 *
 * Mirrors {@link import('./coachDetailModalController').initCoachDetailModal}
 * in shape: parse the serialized payload, cache DOM references, bind a
 * document-level capture for `[data-success-story-id]` triggers and a
 * modal `toggle` listener that runs `populateStory` on open. The
 * document click listener is born with `AbortController`-scoped
 * teardown aborted on `astro:before-swap`, so successive
 * View-Transition navigations do not accumulate listeners.
 *
 * The in-popup CTA's `href` is sourced from the payload's `contactHref`
 * field unconditionally — there is no detail-page fallback for this
 * surface, by design (CRO-A2-1, see SuccessStoryReadMoreModal.astro
 * "Two link targets" docstring).
 */

import type { SerializedSuccessStoryModalPayload, StoryId } from '~/data/successStories';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Cached DOM references — queried once at init. */
type StoryModalDom = {
  modal: HTMLElement;
  beforeImageEl: HTMLImageElement | null;
  afterImageEl: HTMLImageElement | null;
  nameEl: HTMLElement | null;
  transformationEl: HTMLElement | null;
  serviceLinkEl: HTMLAnchorElement | null;
  longTestimonyEl: HTMLElement | null;
  ctaEl: HTMLAnchorElement | null;
};

// ---------------------------------------------------------------------------
// Data parsing
// ---------------------------------------------------------------------------

/** Read and parse the story payload from the hidden `<template>` element. */
function parseStoryData(): readonly SerializedSuccessStoryModalPayload[] | null {
  const dataEl = document.getElementById('success-story-read-more-data');
  const json = dataEl?.getAttribute('data-json');
  if (!json) return null;

  try {
    // Safe: JSON is serialized by SuccessStoryReadMoreModal.astro
    // frontmatter from typed story data.
    return JSON.parse(json) as readonly SerializedSuccessStoryModalPayload[];
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// DOM caching
// ---------------------------------------------------------------------------

/** Query and cache all DOM references the controller needs. */
function cacheDom(modal: HTMLElement): StoryModalDom {
  return {
    modal,
    beforeImageEl: modal.querySelector<HTMLImageElement>('[data-success-story-before-image]'),
    afterImageEl: modal.querySelector<HTMLImageElement>('[data-success-story-after-image]'),
    nameEl: modal.querySelector<HTMLElement>('[data-success-story-name]'),
    transformationEl: modal.querySelector<HTMLElement>('[data-success-story-transformation]'),
    serviceLinkEl: modal.querySelector<HTMLAnchorElement>('[data-success-story-service-link]'),
    longTestimonyEl: modal.querySelector<HTMLElement>('[data-success-story-long-testimony]'),
    ctaEl: modal.querySelector<HTMLAnchorElement>('[data-success-story-cta]'),
  };
}

// ---------------------------------------------------------------------------
// Populate
// ---------------------------------------------------------------------------

/** Fill every `data-success-story-*` surface in the modal from one entry. */
function populateStory(dom: StoryModalDom, story: SerializedSuccessStoryModalPayload): void {
  // Before / After images
  if (dom.beforeImageEl) {
    dom.beforeImageEl.src = story.beforeImage;
    dom.beforeImageEl.alt = `${story.name} before transformation`;
  }
  if (dom.afterImageEl) {
    dom.afterImageEl.src = story.afterImage;
    dom.afterImageEl.alt = `${story.name} after transformation`;
  }

  // Name and transformation
  if (dom.nameEl) dom.nameEl.textContent = story.name;
  if (dom.transformationEl) {
    dom.transformationEl.textContent = `${story.transformation} · ${story.duration}`;
  }

  // Service-name link — discovery affordance (detail-page-or-contact)
  if (dom.serviceLinkEl) {
    dom.serviceLinkEl.href = story.serviceLinkHref;
    dom.serviceLinkEl.textContent = `» ${story.serviceName} →`;
  }

  // Long testimony — split on double newlines into paragraphs (textContent only, XSS-safe)
  if (dom.longTestimonyEl) {
    dom.longTestimonyEl.replaceChildren();
    if (story.longTestimony !== null && story.longTestimony.length > 0) {
      dom.longTestimonyEl.classList.remove('hidden');
      const paragraphs = story.longTestimony.split(/\n\s*\n/);
      for (const text of paragraphs) {
        const trimmed = text.trim();
        if (trimmed) {
          const p = document.createElement('p');
          p.textContent = trimmed;
          dom.longTestimonyEl.appendChild(p);
        }
      }
    } else {
      dom.longTestimonyEl.classList.add('hidden');
    }
  }

  // In-popup CTA — always routes to `contactHref`, no detail-page
  // fallback. The split between this and the service-name link above is
  // deliberate (CRO-A2-1 vs CRO-A2-2).
  if (dom.ctaEl) {
    dom.ctaEl.href = story.contactHref;
    dom.ctaEl.textContent = `Work with ${story.coachFirstName}`;
  }

  // Test seam — the idempotency test reads this counter to detect double-binding.
  const prev = Number(dom.modal.getAttribute('data-populate-count') ?? '0');
  dom.modal.setAttribute('data-populate-count', String(prev + 1));
}

// ---------------------------------------------------------------------------
// Event binding
// ---------------------------------------------------------------------------

/**
 * Bind the document-level trigger capture and the modal toggle listener.
 *
 * The document click listener is scoped to an `AbortController` aborted
 * on `astro:before-swap`, mirroring `coachDetailModalController.ts`
 * exactly. Without this, each ClientRouter navigation would accumulate
 * another document-scoped listener over the lifetime of the session.
 */
function bindEvents(
  dom: StoryModalDom,
  storyMap: ReadonlyMap<StoryId, SerializedSuccessStoryModalPayload>,
): void {
  // Track the last clicked trigger's story id. Captured at click time,
  // before `commandfor` invokes `showModal()`, so the toggle handler
  // knows which story to render.
  let lastStoryId: StoryId | null = null;

  const controller = new AbortController();
  document.addEventListener(
    'click',
    (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const btn = target.closest<HTMLElement>('[data-success-story-id]');
      if (!btn) return;
      const id = btn.getAttribute('data-success-story-id');
      if (id !== null) lastStoryId = id as StoryId;
    },
    { signal: controller.signal },
  );
  // The before-swap listener shares the controller's signal so it
  // cleans itself up on abort — we don't need to keep it after the
  // click listener is gone.
  document.addEventListener('astro:before-swap', () => controller.abort(), {
    signal: controller.signal,
  });

  dom.modal.addEventListener('toggle', (event) => {
    if ((event as ToggleEvent).newState !== 'open' || lastStoryId === null) return;
    const story = storyMap.get(lastStoryId);
    if (story) populateStory(dom, story);
  });
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Initialize the SuccessStoryReadMoreModal. Idempotent — skips if
 * already initialized. Called by SuccessStoryReadMoreModal.astro's
 * `<script>` via `bootstrapOnLoad`.
 */
export function initSuccessStoryReadMoreModal(modal: HTMLElement): void {
  if (modal.hasAttribute('data-success-story-read-more-initialized')) return;

  const stories = parseStoryData();
  if (!stories) return;

  // Guard set after successful parse so a missing template on cold
  // load can recover on `astro:page-load` (deviates intentionally from
  // `quizModalController`, which guards before parsing — same shape as
  // `coachDetailModalController`).
  modal.setAttribute('data-success-story-read-more-initialized', '');

  const storyMap = new Map<StoryId, SerializedSuccessStoryModalPayload>();
  for (const story of stories) storyMap.set(story.id, story);

  const dom = cacheDom(modal);
  bindEvents(dom, storyMap);
}
