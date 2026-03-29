import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearQuizAnswers,
  getAnswerLabel,
  loadQuizAnswers,
  type QuizAnswers,
  saveQuizAnswers,
} from './quizContext';

// Mock sessionStorage for Node.js test environment
const mockStorage = new Map<string, string>();
const sessionStorageMock = {
  getItem: vi.fn((key: string) => mockStorage.get(key) ?? null),
  setItem: vi.fn((key: string, value: string) => mockStorage.set(key, value)),
  removeItem: vi.fn((key: string) => mockStorage.delete(key)),
};

beforeEach(() => {
  mockStorage.clear();
  vi.stubGlobal('sessionStorage', sessionStorageMock);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('quizContext — storage', () => {
  const sampleAnswers: QuizAnswers = {
    goal: 'wellness',
    service: 'get-lean',
    experience: 'intermediate',
    timeline: 'soon',
  };

  it('saves and loads quiz answers', () => {
    saveQuizAnswers(sampleAnswers);
    const loaded = loadQuizAnswers();
    expect(loaded).toEqual(sampleAnswers);
  });

  it('returns null when nothing is stored', () => {
    expect(loadQuizAnswers()).toBeNull();
  });

  it('clears quiz answers', () => {
    saveQuizAnswers(sampleAnswers);
    clearQuizAnswers();
    expect(loadQuizAnswers()).toBeNull();
  });

  it('handles partial answers (only some fields set)', () => {
    const partial: QuizAnswers = { goal: 'bodybuilding', service: 'competition-prep' };
    saveQuizAnswers(partial);
    const loaded = loadQuizAnswers();
    expect(loaded?.goal).toBe('bodybuilding');
    expect(loaded?.service).toBe('competition-prep');
    expect(loaded?.experience).toBeUndefined();
  });

  it('returns null for invalid JSON in storage', () => {
    mockStorage.set('team4pro-quiz-answers', 'not-valid-json{{{');
    expect(loadQuizAnswers()).toBeNull();
  });

  it('returns null for non-object JSON in storage', () => {
    mockStorage.set('team4pro-quiz-answers', '"just a string"');
    expect(loadQuizAnswers()).toBeNull();
  });

  it('returns null for null JSON in storage', () => {
    mockStorage.set('team4pro-quiz-answers', 'null');
    expect(loadQuizAnswers()).toBeNull();
  });

  it('filters out non-string values from stored data', () => {
    mockStorage.set(
      'team4pro-quiz-answers',
      JSON.stringify({
        goal: 42,
        service: true,
        experience: 'intermediate',
        timeline: null,
      }),
    );
    const loaded = loadQuizAnswers();
    expect(loaded?.goal).toBeUndefined();
    expect(loaded?.service).toBeUndefined();
    expect(loaded?.experience).toBe('intermediate');
    expect(loaded?.timeline).toBeUndefined();
  });

  it('drops unknown keys from stored data', () => {
    mockStorage.set(
      'team4pro-quiz-answers',
      JSON.stringify({
        goal: 'wellness',
        malicious: '<script>alert(1)</script>',
        __proto__: 'attack',
      }),
    );
    const loaded = loadQuizAnswers();
    expect(loaded?.goal).toBe('wellness');
    expect(loaded).not.toHaveProperty('malicious');
    expect(loaded).not.toHaveProperty('__proto__');
  });

  it('returns null for object with only empty strings', () => {
    mockStorage.set(
      'team4pro-quiz-answers',
      JSON.stringify({
        goal: '',
        service: '',
      }),
    );
    expect(loadQuizAnswers()).toBeNull();
  });

  it('survives sessionStorage errors on save', () => {
    sessionStorageMock.setItem.mockImplementationOnce(() => {
      throw new Error('Storage full');
    });
    // Should not throw
    expect(() => saveQuizAnswers(sampleAnswers)).not.toThrow();
  });

  it('survives sessionStorage errors on load', () => {
    sessionStorageMock.getItem.mockImplementationOnce(() => {
      throw new Error('Access denied');
    });
    expect(loadQuizAnswers()).toBeNull();
  });

  it('survives sessionStorage errors on clear', () => {
    sessionStorageMock.removeItem.mockImplementationOnce(() => {
      throw new Error('Access denied');
    });
    expect(() => clearQuizAnswers()).not.toThrow();
  });
});

describe('quizContext — labels', () => {
  it('resolves known service IDs to display names', () => {
    expect(getAnswerLabel('service', 'competition-prep')).toBe('Competition Prep');
    expect(getAnswerLabel('service', 'get-lean')).toBe('Get Lean');
    expect(getAnswerLabel('service', 'champion-mindset')).toBe('Champion Mindset');
  });

  it('resolves known experience IDs', () => {
    expect(getAnswerLabel('experience', 'beginner')).toContain('starting');
    expect(getAnswerLabel('experience', 'intermediate')).toBeTruthy();
    expect(getAnswerLabel('experience', 'advanced')).toBeTruthy();
  });

  it('resolves known timeline IDs', () => {
    expect(getAnswerLabel('timeline', 'urgent')).toBeTruthy();
    expect(getAnswerLabel('timeline', 'soon')).toBeTruthy();
    expect(getAnswerLabel('timeline', 'flexible')).toBeTruthy();
  });

  it('resolves known goal IDs', () => {
    expect(getAnswerLabel('goal', 'bodybuilding')).toBeTruthy();
    expect(getAnswerLabel('goal', 'wellness')).toBeTruthy();
  });

  it('falls back to raw ID for unknown values', () => {
    expect(getAnswerLabel('service', 'unknown-service')).toBe('unknown-service');
    expect(getAnswerLabel('experience', 'alien')).toBe('alien');
  });
});
