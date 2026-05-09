/**
 * CoachDetailModal controller — populates the shared coach-detail dialog.
 *
 * Extracted from CoachDetailModal.astro's previous `is:inline` script per
 * ADR-0020 to make each concern individually readable, modifiable, and
 * testable. The Astro component imports and calls {@link initCoachDetailModal}
 * — this module owns all runtime logic.
 *
 * Concerns (as named functions, not one monolith):
 * - {@link parseCoachData} — read and validate the serialized coach payload
 * - {@link cacheDom} — query and cache all DOM references once
 * - {@link populateCoach} — fill every `data-coach-*` surface from one entry
 * - {@link bindEvents} — document-level click capture (scoped to an
 *   `AbortController` aborted on `astro:before-swap`, per ADR-0026) plus the
 *   modal `toggle` listener that runs `populateCoach` on open
 *
 * The document click listener is born with `AbortController`-scoped teardown,
 * mirroring `servicesFilterController.ts`. The previous IIFE leaked its
 * `document` click listener across View Transitions; the new controller does
 * not.
 */

import type { CoachId, SerializedCoachDetail } from '~/data/coaches';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Cached DOM references — queried once at init. */
type CoachModalDom = {
  modal: HTMLElement;
  imageEl: HTMLImageElement | null;
  nameEl: HTMLElement | null;
  titleEl: HTMLElement | null;
  bioEl: HTMLElement | null;
  achievementsEl: HTMLElement | null;
  achievementsSectionEl: HTMLElement | null;
  specialtiesEl: HTMLElement | null;
  specialtiesSectionEl: HTMLElement | null;
  competingYearsEl: HTMLElement | null;
  coachingYearsEl: HTMLElement | null;
  statsEl: HTMLElement | null;
  ctaEl: HTMLElement | null;
};

// ---------------------------------------------------------------------------
// Data parsing
// ---------------------------------------------------------------------------

/** Read and parse the coach payload from the hidden `<template>` element. */
function parseCoachData(): readonly SerializedCoachDetail[] | null {
  const dataEl = document.getElementById('coach-detail-data');
  const json = dataEl?.dataset.json;
  if (!json) return null;

  try {
    // Safe: JSON is serialized by CoachDetailModal.astro frontmatter from typed coach data.
    return JSON.parse(json) as readonly SerializedCoachDetail[];
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// DOM caching
// ---------------------------------------------------------------------------

/** Query and cache all DOM references the controller needs. */
function cacheDom(modal: HTMLElement): CoachModalDom {
  return {
    modal,
    imageEl: modal.querySelector<HTMLImageElement>('[data-coach-image]'),
    nameEl: modal.querySelector<HTMLElement>('[data-coach-name]'),
    titleEl: modal.querySelector<HTMLElement>('[data-coach-title]'),
    bioEl: modal.querySelector<HTMLElement>('[data-coach-bio]'),
    achievementsEl: modal.querySelector<HTMLElement>('[data-coach-achievements]'),
    achievementsSectionEl: modal.querySelector<HTMLElement>('[data-coach-achievements-section]'),
    specialtiesEl: modal.querySelector<HTMLElement>('[data-coach-specialties]'),
    specialtiesSectionEl: modal.querySelector<HTMLElement>('[data-coach-specialties-section]'),
    competingYearsEl: modal.querySelector<HTMLElement>('[data-coach-competing-years]'),
    coachingYearsEl: modal.querySelector<HTMLElement>('[data-coach-coaching-years]'),
    statsEl: modal.querySelector<HTMLElement>('[data-coach-stats]'),
    ctaEl: modal.querySelector<HTMLElement>('[data-coach-cta]'),
  };
}

// ---------------------------------------------------------------------------
// Populate
// ---------------------------------------------------------------------------

/** Fill every `data-coach-*` surface in the modal from a coach entry. */
function populateCoach(dom: CoachModalDom, coach: SerializedCoachDetail): void {
  // Image
  if (dom.imageEl) {
    dom.imageEl.src = coach.image;
    dom.imageEl.alt = coach.name;
  }

  // Name and title
  if (dom.nameEl) dom.nameEl.textContent = coach.name;
  if (dom.titleEl) dom.titleEl.textContent = coach.title;

  // Stats
  if (dom.statsEl) {
    const hasStats = coach.competingYears > 0 || coach.coachingYears > 0;
    dom.statsEl.classList.toggle('hidden', !hasStats);
    if (dom.competingYearsEl) dom.competingYearsEl.textContent = String(coach.competingYears);
    if (dom.coachingYearsEl) dom.coachingYearsEl.textContent = String(coach.coachingYears);
  }

  // Bio — split on double newlines into paragraphs (textContent only, XSS-safe)
  if (dom.bioEl) {
    dom.bioEl.replaceChildren();
    const paragraphs = coach.fullBio.split(/\n\s*\n/);
    for (const text of paragraphs) {
      const trimmed = text.trim();
      if (trimmed) {
        const p = document.createElement('p');
        p.textContent = trimmed;
        dom.bioEl.appendChild(p);
      }
    }
  }

  // Achievements
  if (dom.achievementsEl && dom.achievementsSectionEl) {
    dom.achievementsEl.replaceChildren();
    if (coach.achievements.length > 0) {
      dom.achievementsSectionEl.classList.remove('hidden');
      for (const achievement of coach.achievements) {
        const li = document.createElement('li');
        li.className =
          'bg-accent-100 text-accent-700 dark:bg-accent-900/30 dark:text-accent-300 rounded-full px-3 py-1 text-xs font-medium';
        li.textContent = achievement;
        dom.achievementsEl.appendChild(li);
      }
    } else {
      dom.achievementsSectionEl.classList.add('hidden');
    }
  }

  // Specialties
  if (dom.specialtiesEl && dom.specialtiesSectionEl) {
    dom.specialtiesEl.replaceChildren();
    if (coach.specialties.length > 0) {
      dom.specialtiesSectionEl.classList.remove('hidden');
      for (const specialty of coach.specialties) {
        const li = document.createElement('li');
        li.className =
          'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300 rounded-full px-3 py-1 text-xs font-medium';
        li.textContent = specialty;
        dom.specialtiesEl.appendChild(li);
      }
    } else {
      dom.specialtiesSectionEl.classList.add('hidden');
    }
  }

  // CTA
  if (dom.ctaEl) {
    dom.ctaEl.textContent = `Work with ${coach.firstName}`;
  }

  // Test seam — the idempotency test reads this counter to detect double-binding.
  const prev = Number(dom.modal.dataset.populateCount ?? '0');
  dom.modal.dataset.populateCount = String(prev + 1);
}

// ---------------------------------------------------------------------------
// Event binding
// ---------------------------------------------------------------------------

/**
 * Bind the document-level trigger capture and the modal toggle listener.
 *
 * The document click listener is scoped to an `AbortController` aborted on
 * `astro:before-swap`, mirroring `servicesFilterController.ts`. Without
 * this, each ClientRouter navigation would accumulate another
 * document-scoped listener over the lifetime of the session.
 */
function bindEvents(
  dom: CoachModalDom,
  coachMap: ReadonlyMap<CoachId, SerializedCoachDetail>,
): void {
  // Track the last clicked trigger's coach ID. Captured at click time, before
  // `commandfor` invokes `showModal()`, so the toggle handler knows which
  // coach to render.
  let lastCoachId: CoachId | null = null;

  const controller = new AbortController();
  document.addEventListener(
    'click',
    (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const btn = target.closest<HTMLElement>('[data-coach-id]');
      if (!btn) return;
      const id = btn.dataset.coachId;
      if (id !== undefined) lastCoachId = id as CoachId;
    },
    { signal: controller.signal },
  );
  // The before-swap listener shares the controller's signal so it cleans
  // itself up on abort — we don't need to keep it after the click listener
  // is gone.
  document.addEventListener('astro:before-swap', () => controller.abort(), {
    signal: controller.signal,
  });

  dom.modal.addEventListener('toggle', (event) => {
    if (event.newState !== 'open' || lastCoachId === null) return;
    const coach = coachMap.get(lastCoachId);
    if (coach) populateCoach(dom, coach);
  });
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Initialize the CoachDetailModal. Idempotent — skips if already initialized.
 * Called by CoachDetailModal.astro's `<script>` via `bootstrapOnLoad`.
 */
export function initCoachDetailModal(modal: HTMLElement): void {
  if ('coachDetailInitialized' in modal.dataset) return;

  const coaches = parseCoachData();
  if (!coaches) return;

  // Guard set after successful parse so a missing template on cold load can
  // recover on `astro:page-load` (deviates intentionally from
  // `quizModalController`, which guards before parsing).
  modal.dataset.coachDetailInitialized = '';

  const coachMap = new Map<CoachId, SerializedCoachDetail>();
  for (const coach of coaches) coachMap.set(coach.id, coach);

  const dom = cacheDom(modal);
  bindEvents(dom, coachMap);
}
