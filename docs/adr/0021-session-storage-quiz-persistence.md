# Use sessionStorage for Cross-Page Quiz Context Persistence

Date: 2026-03-30

## Status

Accepted

## Context

The quiz flow spans multiple page navigations: the user completes a 4-step quiz
in a modal, sees a result with two paths forward — "View This Service"
(navigates to `/services` with deep-link) or "Get in Touch" (navigates to
`/contact`). In both cases, the quiz answers (goal, service, experience,
timeline) need to arrive at the contact form to preselect the service dropdown,
display a summary card, and include the answers as hidden fields in the Netlify
form submission.

The challenge: the user may take an indirect path. Quiz → Services page → browse
→ click "Get Started" on a ServiceCard → Contact page. At that point, the quiz
answers are two navigations away from where they were collected.

### Evaluated approaches

1. **URL parameters only** — pass all quiz answers as query parameters in the
   contact link (`/contact?goal=wellness&service=get-lean&experience=...`).
   Works for the direct "Get in Touch" path, but breaks on the indirect path
   through the Services page — ServiceCard links don't carry quiz context.
   Rejected as sole mechanism.

2. **localStorage** — persists across tabs and browser restarts. Quiz answers
   are session-scoped by nature (a user shouldn't see stale quiz answers from
   last week). localStorage would require manual expiration logic. Rejected.

3. **Astro View Transitions state** — View Transitions don't provide a
   cross-navigation state mechanism. `transition:persist` keeps DOM elements
   alive across navigations but doesn't help with data transfer between
   independent components on different pages. Not applicable.

4. **sessionStorage with URL parameter fallback** — quiz answers are saved to
   sessionStorage when the result is displayed, and read by the contact form.
   URL parameters remain as a fallback for environments where sessionStorage is
   unavailable (private browsing edge cases). **Chosen.**

## Decision

Use `sessionStorage` as the primary persistence mechanism for quiz answers
across page navigations, with URL parameters as a graceful fallback.

### Implementation

A shared utility module (`src/utils/quizContext.ts`) encapsulates all
sessionStorage interaction:

- `saveQuizAnswers(answers)` — called by QuizModal when the result is displayed
- `loadQuizAnswers()` — called by ContactForm on page load, with runtime
  validation (only known keys, only string values)
- `clearQuizAnswers()` — called by ContactForm on successful form submission
- `getAnswerLabel(field, id)` — resolves answer IDs to display labels, derived
  from `quiz.ts` data (no manual label duplication)

The contact form reads from both sources with clear priority:

1. sessionStorage (from quiz flow — survives multi-page navigation)
2. URL parameters (fallback for sessionStorage unavailability, or direct
   ServiceCard links that only carry `?service=`)

### Data flow

```
Quiz Modal                    Services Page              Contact Page
───────────                   ──────────────             ────────────
saveQuizAnswers() ──────────────────────────────────────→ loadQuizAnswers()
     │                              │                          │
     ├─ "Get in Touch" ─────── URL params ──────────────→ URL fallback
     │                              │                          │
     └─ "View This Service" ──→ deep-link ──→ ServiceCard ──→ ?service= only
                                (sessionStorage survives)      (+ sessionStorage)
```

### Lifecycle

- **Write**: Once, when the quiz result screen is shown
- **Read**: Once, when the contact form initializes
- **Clear**: On successful form submission (not on render — survives page
  refreshes)
- **Scope**: Session-only — cleared when the browser tab closes

## Consequences

### Positive

- Quiz answers survive the indirect navigation path (Quiz → Services → Contact)
  without any coupling between ServiceCategoryTabs and the quiz system
- No manual expiration logic needed (sessionStorage is session-scoped)
- Graceful degradation: if sessionStorage is unavailable, the URL parameter
  fallback preserves the service selection and quiz context for direct links
- The shared `quizContext.ts` utility is testable in isolation (14 unit tests)
- Display labels are derived from `quiz.ts` data — no manual duplication

### Negative

- Two persistence mechanisms (sessionStorage + URL params) add complexity. The
  priority logic in `resolveQuizAnswers()` must be understood by maintainers.
  Mitigated by clear JSDoc and the `QUIZ_FIELDS` constant shared between both
  code paths.
- sessionStorage is per-tab — quiz answers don't transfer if the user opens the
  contact page in a new tab. Acceptable for the coaching website use case.

## References

- [MDN: sessionStorage](https://developer.mozilla.org/en-US/docs/Web/API/Window/sessionStorage)
- [ADR-0020: Client-Side Script Strategy](0020-client-side-script-strategy-revised.md)
  (module script migration that enabled the controller extraction)
