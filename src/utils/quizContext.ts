/**
 * Shared quiz context management.
 *
 * Provides a single source of truth for:
 * - Persisting quiz answers across page navigations (sessionStorage)
 * - Resolving answer IDs to human-readable labels (derived from quiz.ts)
 * - Type definitions for the quiz answer shape
 *
 * Used by QuizModal (writes answers) and ContactForm (reads answers).
 * The sessionStorage approach ensures quiz context survives View Transition
 * navigations and the Service page → Contact page flow.
 */
import { results, step1, step2, step3, step4 } from '~/data/quiz';

/** Quiz answers collected during the quiz flow */
type QuizAnswers = {
  goal?: string;
  service?: string;
  experience?: string;
  timeline?: string;
};

const STORAGE_KEY = 'team4pro-quiz-answers';

/** Save quiz answers to sessionStorage */
function saveQuizAnswers(answers: QuizAnswers): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(answers));
  } catch {
    // sessionStorage may be unavailable (private browsing, storage full)
  }
}

/** Known quiz answer fields — used for runtime validation */
const QUIZ_FIELDS = ['goal', 'service', 'experience', 'timeline'] as const;

/**
 * Load quiz answers from sessionStorage.
 * Returns null if no answers are stored, parsing fails, or data is invalid.
 * Only accepts known keys with string values — unknown keys are silently dropped.
 */
function loadQuizAnswers(): QuizAnswers | null {
  try {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (!stored) return null;
    const parsed: unknown = JSON.parse(stored);
    if (typeof parsed !== 'object' || parsed === null) return null;

    // Safe: typeof + null check above guarantees an object; narrowing to Record
    // allows property access. The QUIZ_FIELDS loop below validates each value.
    const raw = parsed as Record<string, unknown>;
    const answers: QuizAnswers = {};
    for (const key of QUIZ_FIELDS) {
      const value = raw[key];
      if (typeof value === 'string' && value.length > 0) {
        answers[key] = value;
      }
    }
    return Object.keys(answers).length > 0 ? answers : null;
  } catch {
    return null;
  }
}

/** Clear quiz answers from sessionStorage */
function clearQuizAnswers(): void {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // Silently ignore
  }
}

/**
 * Human-readable display labels derived from quiz.ts data.
 * Built once at module load — no manual sync required.
 */
const answerLabels: Record<string, Record<string, string>> = {
  goal: Object.fromEntries(step1.options.map((o) => [o.id, o.label])),
  service: Object.fromEntries(Object.entries(results).map(([id, r]) => [id, r.serviceName])),
  experience: Object.fromEntries(step3.options.map((o) => [o.id, o.label])),
  timeline: Object.fromEntries(step4.options.map((o) => [o.id, o.label])),
};

// step2 labels are category-specific — flatten all options into one lookup
for (const step of Object.values(step2)) {
  for (const option of step.options) {
    answerLabels.service[option.id] ??= option.label;
  }
}

/** Resolve a quiz answer ID to a human-readable label. Falls back to the raw ID. */
function getAnswerLabel(field: keyof QuizAnswers, id: string): string {
  return answerLabels[field]?.[id] ?? id;
}

export { saveQuizAnswers, loadQuizAnswers, clearQuizAnswers, getAnswerLabel, QUIZ_FIELDS };
export type { QuizAnswers };
