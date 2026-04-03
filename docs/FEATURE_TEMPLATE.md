# Feature Request Template

Use this template when describing a new feature for AI-assisted implementation.
The goal is to provide enough context for a single, focused implementation
without rework — especially for features that span multiple pages.

---

## {Feature Title}

**Priority:** {High | Medium | Low} **Complexity:** {S | M | L} **PR Group:**
{Group name — which other items should be in the same PR}

### Affected page(s)

{Which pages are changed or created? List all.}

### User story

{Describe what the user sees and does — not how it's implemented. Three
sentences are usually enough.}

Example: "A visitor on the Services page can click 'Learn More' on any service
card. A panel expands below the card showing additional details (description,
what's included, pricing notes). Clicking again collapses it."

### Data flow (if the feature spans pages)

{If data needs to move between pages (like the quiz → contact flow), describe
the full user journey and what data travels.}

Example: "User completes the quiz on the homepage → clicks 'View Service' →
lands on /services with the recommended service highlighted → clicks 'Get
Started' → lands on /contact with the service preselected."

{If the feature is contained to a single page, write "Single page — no
cross-page data flow."}

### Coach feedback / requirements

{What did the coaches specifically ask for? Quote their words if possible. Their
opinion is the acceptance criterion.}

Example: "Gina wants 'Standard' renamed to 'Monthly' on the pricing cards. Helle
wants the category tabs to show all services by default, not just one category."

### Acceptance criteria

{Concrete, verifiable conditions for sign-off.}

- {Criterion 1}
- {Criterion 2}

### Readiness checklist

This checklist must pass before implementation starts. If any item cannot be
checked off, the feature is **not ready** — clarify with the project owner
first.

- [ ] **Wording is final.** All user-facing text (labels, headings, CTAs, error
      messages) is specified — not placeholder, not "to be decided", not
      "suggested alternatives".
- [ ] **Visual approach is decided.** The feature reuses an existing component
      or pattern (named in the notes), or a new one has been discussed and
      agreed upon.
- [ ] **All consumers are identified.** For any value being added, renamed, or
      removed: every file that references it is listed — TypeScript, CSS
      selectors, tests, and documentation.
- [ ] **Conventions and patterns are checked.** Relevant entries in
      `CONVENTIONS.md` and ADRs are identified. Existing code patterns for the
      same type of change are reviewed. Missing conventions are flagged, not
      silently invented.
- [ ] **Data model impact is clear.** New or changed types, exports, or
      cross-references are documented with downstream effects.
- [ ] **No open questions remain.** No alternatives pending discussion, no
      decisions waiting on coaches, no "TBD" items.

### Notes / constraints (optional)

{Anything else relevant: related ADRs, technical constraints, design references,
or things explicitly out of scope.}
