/**
 * @vitest-environment jsdom
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MODAL_IDS } from '~/data/ids';
import { assertDefined, assertNotNull } from '~/test-utils/assertions';
import { initQuizModal } from './quizModalController';

// Mock sessionStorage for saveQuizAnswers
const mockStorage = new Map<string, string>();
beforeEach(() => {
  mockStorage.clear();
  vi.stubGlobal('sessionStorage', {
    getItem: (key: string) => mockStorage.get(key) ?? null,
    setItem: (key: string, value: string) => mockStorage.set(key, value),
    removeItem: (key: string) => mockStorage.delete(key),
  });
});

afterEach(() => {
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// Test fixture — minimal DOM matching QuizModal.astro's output
// ---------------------------------------------------------------------------

const QUIZ_DATA = {
  step1: {
    id: 'goal',
    question: "What's your main goal?",
    options: [
      { id: 'wellness', label: 'Transform', description: 'Body transformation' },
      { id: 'bodybuilding', label: 'Compete', description: 'Step on stage' },
    ],
  },
  step2: {
    wellness: {
      id: 'wellness-detail',
      question: 'Your situation?',
      options: [
        { id: 'get-lean', label: 'Get Lean', description: 'Fat loss' },
        { id: 'get-jacked', label: 'Get Jacked', description: 'Muscle' },
      ],
    },
    bodybuilding: {
      id: 'bb-detail',
      question: 'Competition journey?',
      options: [{ id: 'competition-prep', label: 'Comp Prep', description: 'Show time' }],
    },
  },
  step3: {
    id: 'experience',
    question: 'Training experience?',
    options: [
      { id: 'beginner', label: 'Beginner', description: 'New' },
      { id: 'advanced', label: 'Advanced', description: 'Experienced' },
    ],
  },
  step4: {
    id: 'timeline',
    question: 'Timeline?',
    options: [
      { id: 'soon', label: 'Soon', description: 'This month' },
      { id: 'flexible', label: 'Flexible', description: 'No rush' },
    ],
  },
  stepLabels: [
    { label: 'Goal', shortLabel: 'Goal' },
    { label: 'Details', shortLabel: 'Details' },
    { label: 'Experience', shortLabel: 'Exp' },
    { label: 'Timeline', shortLabel: 'Time' },
  ],
  results: {
    'get-lean': {
      serviceName: 'Get Lean',
      tagline: 'Reveal Your Best Self.',
      href: '/services?category=wellness&service=get-lean',
    },
    'get-jacked': {
      serviceName: 'Get Jacked',
      tagline: 'Look Like You Lift.',
      href: '/services?category=wellness&service=get-jacked',
    },
    'competition-prep': {
      serviceName: 'Competition Prep',
      tagline: 'Peak perfectly.',
      href: '/services?category=bodybuilding&service=competition-prep',
    },
  },
  contactRoute: '/contact',
};

function makeRadioOption(name: string, value: string, stepNum: number): string {
  return `<label><input type="radio" name="${name}" value="${value}" class="sr-only" data-quiz-radio="${stepNum}" /></label>`;
}

function buildQuizDom(): HTMLElement {
  const modal = document.createElement('div');
  modal.id = MODAL_IDS.quiz;

  // Progress nav
  modal.innerHTML = `
    <nav data-quiz-progress>
      <ol>
        <li><div data-step-indicator="1"><span>Step 1</span></div></li>
        <li><div data-step-indicator="2"><span>Step 2</span></div></li>
        <li><div data-step-indicator="3"><span>Step 3</span></div></li>
        <li><div data-step-indicator="4"><span>Step 4</span></div></li>
      </ol>
    </nav>
    <div data-quiz-content>
      <!-- Step 1 -->
      <div data-quiz-step="1">
        <h3>Goal?</h3>
        <fieldset>
          ${makeRadioOption('quiz-category', 'wellness', 1)}
          ${makeRadioOption('quiz-category', 'bodybuilding', 1)}
        </fieldset>
        <button data-quiz-nav="next" disabled>Next</button>
      </div>
      <!-- Step 2 (dynamic) -->
      <div data-quiz-step="2" class="hidden">
        <h3 data-dynamic-question></h3>
        <fieldset>
          <legend data-dynamic-legend></legend>
          <div data-dynamic-options></div>
        </fieldset>
        <button data-quiz-nav="back">Back</button>
        <button data-quiz-nav="next" disabled>Next</button>
      </div>
      <!-- Step 3 -->
      <div data-quiz-step="3" class="hidden">
        <h3>Experience?</h3>
        <fieldset>
          ${makeRadioOption('quiz-experience', 'beginner', 3)}
          ${makeRadioOption('quiz-experience', 'advanced', 3)}
        </fieldset>
        <button data-quiz-nav="back">Back</button>
        <button data-quiz-nav="next" disabled>Next</button>
      </div>
      <!-- Step 4 -->
      <div data-quiz-step="4" class="hidden">
        <h3>Timeline?</h3>
        <fieldset>
          ${makeRadioOption('quiz-timeline', 'soon', 4)}
          ${makeRadioOption('quiz-timeline', 'flexible', 4)}
        </fieldset>
        <button data-quiz-nav="back">Back</button>
        <button data-quiz-nav="finish" disabled>See Recommendation</button>
      </div>
      <!-- Result -->
      <div data-quiz-step="result" class="hidden">
        <p data-result-service></p>
        <p data-result-tagline></p>
        <a href="#" data-result-service-link>View Service</a>
        <a href="#" data-result-contact-link>Get in Touch</a>
        <button data-quiz-nav="restart">Start Over</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  // Quiz data template
  const template = document.createElement('template');
  template.id = 'quiz-data';
  template.setAttribute('data-json', JSON.stringify(QUIZ_DATA));
  document.body.appendChild(template);

  return modal;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function selectRadio(modal: HTMLElement, name: string, value: string): void {
  const input = modal.querySelector<HTMLInputElement>(`input[name="${name}"][value="${value}"]`);
  if (!input) throw new Error(`Radio not found: ${name}=${value}`);
  input.checked = true;
  input.dispatchEvent(new Event('change', { bubbles: true }));
}

function clickButton(modal: HTMLElement, navAction: string): void {
  const btn = Array.from(modal.querySelectorAll<HTMLButtonElement>('[data-quiz-nav]')).find(
    (b) => b.dataset.quizNav === navAction && !b.closest('.hidden'),
  );
  if (!btn) throw new Error(`Button not found: data-quiz-nav="${navAction}"`);
  btn.click();
}

function getVisibleStep(modal: HTMLElement): string | null {
  for (const el of modal.querySelectorAll<HTMLElement>('[data-quiz-step]')) {
    if (!el.classList.contains('hidden')) {
      return el.getAttribute('data-quiz-step');
    }
  }
  return null;
}

function isButtonDisabled(modal: HTMLElement, navAction: string): boolean {
  const btn = Array.from(modal.querySelectorAll<HTMLButtonElement>('[data-quiz-nav]')).find(
    (b) => b.dataset.quizNav === navAction && !b.closest('.hidden'),
  );
  return btn?.disabled ?? true;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('quizModalController', () => {
  it('initializes without errors', () => {
    const modal = buildQuizDom();
    expect(() => initQuizModal(modal)).not.toThrow();
  });

  it('shows step 1 initially', () => {
    const modal = buildQuizDom();
    initQuizModal(modal);
    expect(getVisibleStep(modal)).toBe('1');
  });

  it('is idempotent — second init is a no-op', () => {
    const modal = buildQuizDom();
    initQuizModal(modal);
    initQuizModal(modal); // should not throw or double-bind
    expect(getVisibleStep(modal)).toBe('1');
  });

  it('skips init when quiz data template is missing', () => {
    const modal = buildQuizDom();
    document.getElementById('quiz-data')?.remove();
    expect(() => initQuizModal(modal)).not.toThrow();
  });

  // --- Step navigation ---

  it('next button is disabled until a radio is selected', () => {
    const modal = buildQuizDom();
    initQuizModal(modal);
    expect(isButtonDisabled(modal, 'next')).toBe(true);
  });

  it('enables next button after selecting a category', () => {
    const modal = buildQuizDom();
    initQuizModal(modal);
    selectRadio(modal, 'quiz-category', 'wellness');
    expect(isButtonDisabled(modal, 'next')).toBe(false);
  });

  it('navigates to step 2 after selecting category and clicking next', () => {
    const modal = buildQuizDom();
    initQuizModal(modal);
    selectRadio(modal, 'quiz-category', 'wellness');
    clickButton(modal, 'next');
    expect(getVisibleStep(modal)).toBe('2');
  });

  it('populates step 2 with category-specific options', () => {
    const modal = buildQuizDom();
    initQuizModal(modal);
    selectRadio(modal, 'quiz-category', 'wellness');
    clickButton(modal, 'next');

    const options = modal.querySelectorAll('[data-dynamic-options] input[type="radio"]');
    expect(options.length).toBe(2); // get-lean, get-jacked

    const question = modal.querySelector('[data-dynamic-question]')?.textContent;
    expect(question).toBe('Your situation?');
  });

  it('navigates back from step 2 to step 1', () => {
    const modal = buildQuizDom();
    initQuizModal(modal);
    selectRadio(modal, 'quiz-category', 'wellness');
    clickButton(modal, 'next');
    clickButton(modal, 'back');
    expect(getVisibleStep(modal)).toBe('1');
  });

  it('preserves category selection when navigating back', () => {
    const modal = buildQuizDom();
    initQuizModal(modal);
    selectRadio(modal, 'quiz-category', 'wellness');
    clickButton(modal, 'next');
    clickButton(modal, 'back');

    const radio = modal.querySelector<HTMLInputElement>(
      'input[name="quiz-category"][value="wellness"]',
    );
    expect(radio?.checked).toBe(true);
  });

  // --- Full flow ---

  it('completes full 4-step flow and shows result', () => {
    const modal = buildQuizDom();
    initQuizModal(modal);

    // Step 1: category
    selectRadio(modal, 'quiz-category', 'wellness');
    clickButton(modal, 'next');

    // Step 2: service (dynamically generated)
    const serviceRadio = modal.querySelector<HTMLInputElement>(
      '[data-dynamic-options] input[value="get-lean"]',
    );
    assertNotNull(serviceRadio);
    serviceRadio.checked = true;
    serviceRadio.dispatchEvent(new Event('change', { bubbles: true }));
    clickButton(modal, 'next');

    // Step 3: experience
    expect(getVisibleStep(modal)).toBe('3');
    selectRadio(modal, 'quiz-experience', 'advanced');
    clickButton(modal, 'next');

    // Step 4: timeline
    expect(getVisibleStep(modal)).toBe('4');
    selectRadio(modal, 'quiz-timeline', 'soon');
    clickButton(modal, 'finish');

    // Result
    expect(getVisibleStep(modal)).toBe('result');
    expect(modal.querySelector('[data-result-service]')?.textContent).toBe('Get Lean');
    expect(modal.querySelector('[data-result-tagline]')?.textContent).toBe(
      'Reveal Your Best Self.',
    );
  });

  // --- Result links ---

  it('sets service link href on result', () => {
    const modal = buildQuizDom();
    initQuizModal(modal);
    selectRadio(modal, 'quiz-category', 'wellness');
    clickButton(modal, 'next');

    const serviceRadio = modal.querySelector<HTMLInputElement>(
      '[data-dynamic-options] input[value="get-lean"]',
    );
    assertNotNull(serviceRadio);
    serviceRadio.checked = true;
    serviceRadio.dispatchEvent(new Event('change', { bubbles: true }));
    clickButton(modal, 'next');

    selectRadio(modal, 'quiz-experience', 'beginner');
    clickButton(modal, 'next');

    selectRadio(modal, 'quiz-timeline', 'flexible');
    clickButton(modal, 'finish');

    const serviceLink = modal.querySelector<HTMLAnchorElement>('[data-result-service-link]');
    expect(serviceLink?.href).toContain('/services?category=wellness&service=get-lean');
  });

  it('sets contact link href with all quiz parameters', () => {
    const modal = buildQuizDom();
    initQuizModal(modal);
    selectRadio(modal, 'quiz-category', 'wellness');
    clickButton(modal, 'next');

    const serviceRadio = modal.querySelector<HTMLInputElement>(
      '[data-dynamic-options] input[value="get-lean"]',
    );
    assertNotNull(serviceRadio);
    serviceRadio.checked = true;
    serviceRadio.dispatchEvent(new Event('change', { bubbles: true }));
    clickButton(modal, 'next');

    selectRadio(modal, 'quiz-experience', 'advanced');
    clickButton(modal, 'next');

    selectRadio(modal, 'quiz-timeline', 'soon');
    clickButton(modal, 'finish');

    const contactLink = modal.querySelector<HTMLAnchorElement>('[data-result-contact-link]');
    assertNotNull(contactLink);
    const url = new URL(contactLink.href, 'http://localhost');
    expect(url.searchParams.get('goal')).toBe('wellness');
    expect(url.searchParams.get('service')).toBe('get-lean');
    expect(url.searchParams.get('experience')).toBe('advanced');
    expect(url.searchParams.get('timeline')).toBe('soon');
  });

  // --- sessionStorage ---

  it('saves quiz answers to sessionStorage on result', () => {
    const modal = buildQuizDom();
    initQuizModal(modal);
    selectRadio(modal, 'quiz-category', 'wellness');
    clickButton(modal, 'next');

    const serviceRadio = modal.querySelector<HTMLInputElement>(
      '[data-dynamic-options] input[value="get-lean"]',
    );
    assertNotNull(serviceRadio);
    serviceRadio.checked = true;
    serviceRadio.dispatchEvent(new Event('change', { bubbles: true }));
    clickButton(modal, 'next');

    selectRadio(modal, 'quiz-experience', 'beginner');
    clickButton(modal, 'next');

    selectRadio(modal, 'quiz-timeline', 'flexible');
    clickButton(modal, 'finish');

    const stored = mockStorage.get('team4pro-quiz-answers');
    assertDefined(stored);
    const parsed = JSON.parse(stored);
    expect(parsed.goal).toBe('wellness');
    expect(parsed.service).toBe('get-lean');
    expect(parsed.experience).toBe('beginner');
    expect(parsed.timeline).toBe('flexible');
  });

  // --- Reset ---

  it('resets to step 1 on restart from result screen', () => {
    const modal = buildQuizDom();
    initQuizModal(modal);

    // Complete full flow to reach result
    selectRadio(modal, 'quiz-category', 'wellness');
    clickButton(modal, 'next');

    const serviceRadio = modal.querySelector<HTMLInputElement>(
      '[data-dynamic-options] input[value="get-lean"]',
    );
    assertNotNull(serviceRadio);
    serviceRadio.checked = true;
    serviceRadio.dispatchEvent(new Event('change', { bubbles: true }));
    clickButton(modal, 'next');

    selectRadio(modal, 'quiz-experience', 'beginner');
    clickButton(modal, 'next');

    selectRadio(modal, 'quiz-timeline', 'flexible');
    clickButton(modal, 'finish');

    expect(getVisibleStep(modal)).toBe('result');

    // Now click restart
    clickButton(modal, 'restart');
    expect(getVisibleStep(modal)).toBe('1');

    // All radios should be unchecked
    const checkedRadios = modal.querySelectorAll<HTMLInputElement>('input[type="radio"]:checked');
    expect(checkedRadios.length).toBe(0);
  });

  // --- Category switch ---

  it('resets service selection when category changes', () => {
    const modal = buildQuizDom();
    initQuizModal(modal);

    // Select wellness, go to step 2, select get-lean
    selectRadio(modal, 'quiz-category', 'wellness');
    clickButton(modal, 'next');
    const serviceRadio = modal.querySelector<HTMLInputElement>(
      '[data-dynamic-options] input[value="get-lean"]',
    );
    assertNotNull(serviceRadio);
    serviceRadio.checked = true;
    serviceRadio.dispatchEvent(new Event('change', { bubbles: true }));

    // Go back, change category
    clickButton(modal, 'back');
    selectRadio(modal, 'quiz-category', 'bodybuilding');
    clickButton(modal, 'next');

    // Step 2 should show bodybuilding options, next button disabled
    const options = modal.querySelectorAll('[data-dynamic-options] input[type="radio"]');
    expect(options.length).toBe(1); // only competition-prep
    expect(isButtonDisabled(modal, 'next')).toBe(true);
  });

  // --- Athletic auto-select branch (ADR-0042) ---

  it('pre-selects performance-ready and enables Next when athletic step 2 opens', () => {
    // ADR-0042 collapses the athletic category to a single service
    // (`performance-ready`). Step 2 still renders, so the progress
    // indicator advances cleanly, but the controller pre-selects the only
    // option so the visitor's interaction reduces to one click on an
    // already-decided screen rather than two: pick category → land on
    // step 2 with Next already enabled → click Next once → step 3.
    //
    // Fixture is built locally with an `athletic` step-2 entry; the
    // module-level fixture deliberately covers wellness and bodybuilding
    // only.
    const modal = document.createElement('div');
    modal.id = MODAL_IDS.quiz;
    modal.innerHTML = `
      <nav data-quiz-progress>
        <ol>
          <li><div data-step-indicator="1"><span>Step 1</span></div></li>
          <li><div data-step-indicator="2"><span>Step 2</span></div></li>
          <li><div data-step-indicator="3"><span>Step 3</span></div></li>
          <li><div data-step-indicator="4"><span>Step 4</span></div></li>
        </ol>
      </nav>
      <div data-quiz-content>
        <div data-quiz-step="1">
          <fieldset>
            ${makeRadioOption('quiz-category', 'athletic', 1)}
          </fieldset>
          <button data-quiz-nav="next" disabled>Next</button>
        </div>
        <div data-quiz-step="2" class="hidden">
          <h3 data-dynamic-question></h3>
          <fieldset>
            <legend data-dynamic-legend></legend>
            <div data-dynamic-options></div>
          </fieldset>
          <button data-quiz-nav="back">Back</button>
          <button data-quiz-nav="next" disabled>Next</button>
        </div>
        <div data-quiz-step="3" class="hidden"></div>
        <div data-quiz-step="4" class="hidden"></div>
        <div data-quiz-step="result" class="hidden"></div>
      </div>
    `;
    document.body.appendChild(modal);

    const athleticData = {
      step1: {
        id: 'goal',
        question: "What's your main goal?",
        options: [{ id: 'athletic', label: 'Sport', description: 'Train for sport' }],
      },
      step2: {
        athletic: {
          id: 'athletic-detail',
          question: 'What type of athlete are you?',
          options: [
            {
              id: 'performance-ready',
              label: 'Any competitive athlete',
              description: 'All sports',
            },
          ],
        },
      },
      step3: { id: 'experience', question: 'Exp?', options: [] },
      step4: { id: 'timeline', question: 'When?', options: [] },
      stepLabels: [
        { label: 'Goal', shortLabel: 'Goal' },
        { label: 'Details', shortLabel: 'Details' },
        { label: 'Experience', shortLabel: 'Exp' },
        { label: 'Timeline', shortLabel: 'Time' },
      ],
      results: {
        'performance-ready': {
          serviceName: 'Performance Ready',
          tagline: 'Built for Your Sport.',
          href: '/services?service=performance-ready',
        },
      },
      contactRoute: '/contact',
    };
    const template = document.createElement('template');
    template.id = 'quiz-data';
    template.setAttribute('data-json', JSON.stringify(athleticData));
    document.body.appendChild(template);

    initQuizModal(modal);
    selectRadio(modal, 'quiz-category', 'athletic');
    clickButton(modal, 'next');

    // Step 2 visible, single option pre-selected, Next enabled.
    expect(getVisibleStep(modal)).toBe('2');
    const radio = modal.querySelector<HTMLInputElement>(
      '[data-dynamic-options] input[value="performance-ready"]',
    );
    assertNotNull(radio);
    expect(radio.checked).toBe(true);
    expect(isButtonDisabled(modal, 'next')).toBe(false);
  });
});
