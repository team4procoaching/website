/**
 * QuizModal controller — manages the 4-step quiz flow.
 *
 * Extracted from QuizModal.astro's inline `<script>` to make each concern
 * individually readable, modifiable, and testable. The Astro component
 * imports and calls {@link initQuizModal} — this module owns all runtime logic.
 *
 * Concerns (as named functions, not one monolith):
 * - {@link parseQuizData} — read and validate serialized quiz data
 * - {@link cacheDom} — query and cache all DOM references once
 * - {@link showStep} / {@link updateProgress} — step visibility and progress bar
 * - {@link populateStep2} — dynamic DOM for category-specific options
 * - {@link displayResult} — result screen with service link + contact link
 * - {@link resetQuiz} — full state and UI reset
 * - {@link bindEvents} — radio, navigation, close, and result-link listeners
 */

import type { QuizResult, SerializedQuizData } from '~/data/quiz';
import { quizOptionClasses } from '~/styles/quizClasses';
import { saveQuizAnswers } from '~/utils/quizContext';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Total number of quiz steps (excluding result screen) */
const TOTAL_STEPS = 4;

// Progress indicator classes
const ACTIVE_INDICATOR = 'border-accent-600 dark:border-accent-500';
const INACTIVE_INDICATOR = 'border-foreground-200 dark:border-white/10';
const ACTIVE_TEXT = 'text-accent-600 dark:text-accent-400';
const INACTIVE_TEXT = 'text-foreground-500 dark:text-gray-400';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type QuizState = {
  currentStep: number | 'result';
  category: string | null;
  service: string | null;
  experience: string | null;
  timeline: string | null;
};

/** Cached DOM references — queried once at init */
type QuizDom = {
  modal: HTMLElement;
  stepEls: Map<number | 'result', HTMLElement>;
  progressNav: HTMLElement | null;
  indicators: (HTMLElement | null)[];
  resultServiceEl: HTMLElement | null;
  resultTaglineEl: HTMLElement | null;
  resultServiceLink: HTMLAnchorElement | null;
  resultContactLink: HTMLAnchorElement | null;
  dynamicQuestion: HTMLElement | null;
  dynamicLegend: HTMLElement | null;
  dynamicOptions: HTMLElement | null;
};

// ---------------------------------------------------------------------------
// Data parsing
// ---------------------------------------------------------------------------

/** Read and parse quiz data from the hidden `<template>` element. */
function parseQuizData(): SerializedQuizData | null {
  const dataEl = document.getElementById('quiz-data');
  const json = dataEl?.dataset.json;
  if (!json) return null;

  try {
    // Safe: JSON is serialized by QuizModal.astro frontmatter from typed quiz data
    return JSON.parse(json) as SerializedQuizData;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// DOM caching
// ---------------------------------------------------------------------------

/** Query and cache all DOM references the controller needs. */
function cacheDom(modal: HTMLElement): QuizDom {
  const stepEls = new Map<number | 'result', HTMLElement>();
  for (let i = 1; i <= TOTAL_STEPS; i++) {
    const el = modal.querySelector<HTMLElement>(`[data-quiz-step="${i}"]`);
    if (el) stepEls.set(i, el);
  }
  const resultEl = modal.querySelector<HTMLElement>('[data-quiz-step="result"]');
  if (resultEl) stepEls.set('result', resultEl);

  return {
    modal,
    stepEls,
    progressNav: modal.querySelector('[data-quiz-progress]'),
    indicators: Array.from({ length: TOTAL_STEPS }, (_, i) =>
      modal.querySelector<HTMLElement>(`[data-step-indicator="${i + 1}"]`),
    ),
    resultServiceEl: modal.querySelector('[data-result-service]'),
    resultTaglineEl: modal.querySelector('[data-result-tagline]'),
    resultServiceLink: modal.querySelector('[data-result-service-link]'),
    resultContactLink: modal.querySelector('[data-result-contact-link]'),
    dynamicQuestion: modal.querySelector('[data-dynamic-question]'),
    dynamicLegend: modal.querySelector('[data-dynamic-legend]'),
    dynamicOptions: modal.querySelector('[data-dynamic-options]'),
  };
}

// ---------------------------------------------------------------------------
// Progress & step visibility
// ---------------------------------------------------------------------------

function updateProgress(dom: QuizDom, step: number): void {
  dom.indicators.forEach((indicator, i) => {
    if (!indicator) return;
    const isActive = i < step;
    indicator.className = `flex flex-col border-t-4 pt-3 sm:pt-4 ${isActive ? ACTIVE_INDICATOR : INACTIVE_INDICATOR}`;
    const stepSpan = indicator.querySelector('span');
    if (stepSpan) {
      stepSpan.className = `text-xs sm:text-sm font-medium ${isActive ? ACTIVE_TEXT : INACTIVE_TEXT}`;
    }
  });
}

function showStep(dom: QuizDom, state: QuizState, step: number | 'result'): void {
  state.currentStep = step;

  dom.stepEls.forEach((el, key) => {
    el.classList.toggle('hidden', key !== step);
  });

  if (dom.progressNav) {
    dom.progressNav.classList.toggle('hidden', step === 'result');
    if (typeof step === 'number') updateProgress(dom, step);
  }
}

// ---------------------------------------------------------------------------
// Button state
// ---------------------------------------------------------------------------

function updateNextButton(stepEl: HTMLElement, enabled: boolean): void {
  const nextBtn = stepEl.querySelector<HTMLButtonElement>('[data-quiz-nav="next"]');
  const finishBtn = stepEl.querySelector<HTMLButtonElement>('[data-quiz-nav="finish"]');
  if (nextBtn) nextBtn.disabled = !enabled;
  if (finishBtn) finishBtn.disabled = !enabled;
}

// ---------------------------------------------------------------------------
// Step 2 — dynamic options
// ---------------------------------------------------------------------------

function populateStep2(
  dom: QuizDom,
  state: QuizState,
  quizData: SerializedQuizData,
  categoryId: string,
): void {
  const step2Data = quizData.step2[categoryId];
  if (!step2Data || !dom.dynamicOptions) return;

  if (dom.dynamicQuestion) dom.dynamicQuestion.textContent = step2Data.question;
  if (dom.dynamicLegend) dom.dynamicLegend.textContent = step2Data.question;

  dom.dynamicOptions.replaceChildren();

  for (const option of step2Data.options) {
    const label = document.createElement('label');
    label.className = quizOptionClasses;

    const input = document.createElement('input');
    input.type = 'radio';
    input.name = 'quiz-service';
    input.value = option.id;
    input.className = 'sr-only';
    input.dataset.quizRadio = '2';

    input.addEventListener('change', () => {
      state.service = input.value;
      const step2El = dom.stepEls.get(2);
      if (step2El) updateNextButton(step2El, true);
    });

    const spanWrapper = document.createElement('span');
    spanWrapper.className = 'flex flex-col';

    const spanLabel = document.createElement('span');
    spanLabel.className = 'font-semibold text-foreground-950 dark:text-white';
    spanLabel.textContent = option.label;

    const spanDesc = document.createElement('span');
    spanDesc.className = 'mt-1 text-sm text-foreground-600 dark:text-gray-400';
    spanDesc.textContent = option.description;

    spanWrapper.appendChild(spanLabel);
    spanWrapper.appendChild(spanDesc);
    label.appendChild(input);
    label.appendChild(spanWrapper);
    dom.dynamicOptions.appendChild(label);
  }

  // Reset service selection — previous choice is invalid after category change
  state.service = null;
  const step2El = dom.stepEls.get(2);
  if (step2El) updateNextButton(step2El, false);
}

// ---------------------------------------------------------------------------
// Result display
// ---------------------------------------------------------------------------

/** Write the result-screen text (service name, tagline, service-link href). */
function populateResultText(dom: QuizDom, result: QuizResult): void {
  if (dom.resultServiceEl) dom.resultServiceEl.textContent = result.serviceName;
  if (dom.resultTaglineEl) dom.resultTaglineEl.textContent = result.tagline;
  if (dom.resultServiceLink) dom.resultServiceLink.href = result.href;
}

/**
 * Build the contact URL with the quiz answers attached as query params —
 * a fallback for sessionStorage so the Contact page can prefill even
 * when storage is unavailable or cleared.
 */
function buildContactHref(quizData: SerializedQuizData, state: QuizState): string {
  const params = new URLSearchParams();
  if (state.category) params.set('goal', state.category);
  if (state.service) params.set('service', state.service);
  if (state.experience) params.set('experience', state.experience);
  if (state.timeline) params.set('timeline', state.timeline);
  return `${quizData.contactRoute}?${params.toString()}`;
}

function displayResult(dom: QuizDom, state: QuizState, quizData: SerializedQuizData): void {
  if (!state.service) return;
  const result = quizData.results[state.service];
  if (!result) return;

  populateResultText(dom, result);

  // Persist quiz answers for the Contact page
  saveQuizAnswers({
    goal: state.category ?? undefined,
    service: state.service ?? undefined,
    experience: state.experience ?? undefined,
    timeline: state.timeline ?? undefined,
  });

  if (dom.resultContactLink) {
    dom.resultContactLink.href = buildContactHref(quizData, state);
  }

  showStep(dom, state, 'result');
}

// ---------------------------------------------------------------------------
// Reset
// ---------------------------------------------------------------------------

function resetQuiz(dom: QuizDom, state: QuizState): void {
  state.category = null;
  state.service = null;
  state.experience = null;
  state.timeline = null;

  dom.modal.querySelectorAll<HTMLInputElement>('input[type="radio"]').forEach((input) => {
    input.checked = false;
  });

  dom.stepEls.forEach((el, key) => {
    if (typeof key === 'number') updateNextButton(el, false);
  });

  showStep(dom, state, 1);
}

// ---------------------------------------------------------------------------
// Event binding
// ---------------------------------------------------------------------------

function bindEvents(dom: QuizDom, state: QuizState, quizData: SerializedQuizData): void {
  // Radio change listeners for server-rendered steps (1, 3, 4).
  // Step 2 radios are handled in populateStep2() (dynamic DOM).
  const stepToStateKey: Record<number, 'category' | 'experience' | 'timeline'> = {
    1: 'category',
    3: 'experience',
    4: 'timeline',
  };

  for (const [stepNum, stateKey] of Object.entries(stepToStateKey)) {
    dom.modal
      .querySelectorAll<HTMLInputElement>(`[data-quiz-radio="${stepNum}"]`)
      .forEach((input) => {
        input.addEventListener('change', () => {
          state[stateKey] = input.value;
          const stepEl = dom.stepEls.get(Number(stepNum));
          if (stepEl) updateNextButton(stepEl, true);
        });
      });
  }

  // Navigation buttons (next, back, finish, restart)
  dom.modal.querySelectorAll<HTMLButtonElement>('[data-quiz-nav]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const action = btn.dataset.quizNav;
      if (action === 'restart') {
        resetQuiz(dom, state);
        return;
      }

      if (typeof state.currentStep !== 'number') return;

      if (action === 'next' && state.currentStep < TOTAL_STEPS) {
        if (state.currentStep === 1 && state.category) {
          populateStep2(dom, state, quizData, state.category);
        }
        showStep(dom, state, state.currentStep + 1);
      } else if (action === 'back' && state.currentStep > 1) {
        showStep(dom, state, state.currentStep - 1);
      } else if (action === 'finish') {
        displayResult(dom, state, quizData);
      }
    });
  });

  // Close modal on result link clicks.
  // Safe: dom.modal is always a <dialog> element (QuizModal.astro renders it as one).
  dom.resultServiceLink?.addEventListener('click', () => {
    (dom.modal as HTMLDialogElement).close?.();
  });
  dom.resultContactLink?.addEventListener('click', () => {
    (dom.modal as HTMLDialogElement).close?.();
  });

  // Reset when modal is closed
  dom.modal.addEventListener('close', () => {
    const panel = dom.modal.querySelector('el-dialog-panel');
    if (panel) {
      const fallbackTimer = setTimeout(() => resetQuiz(dom, state), 500);
      const handleTransitionEnd = (): void => {
        clearTimeout(fallbackTimer);
        resetQuiz(dom, state);
        panel.removeEventListener('transitionend', handleTransitionEnd);
      };
      panel.addEventListener('transitionend', handleTransitionEnd);
    } else {
      resetQuiz(dom, state);
    }
  });
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Initialize a QuizModal instance. Idempotent — skips if already initialized.
 * Called by QuizModal.astro's `<script>` on `astro:page-load`.
 */
export function initQuizModal(modal: HTMLElement): void {
  if ('quizInitialized' in modal.dataset) return;
  modal.dataset.quizInitialized = '';

  const quizData = parseQuizData();
  if (!quizData) return;

  const dom = cacheDom(modal);
  const state: QuizState = {
    currentStep: 1,
    category: null,
    service: null,
    experience: null,
    timeline: null,
  };

  bindEvents(dom, state, quizData);
}
