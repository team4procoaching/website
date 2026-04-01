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

### Notes / constraints (optional)

{Anything else relevant: related ADRs, technical constraints, design references,
or things explicitly out of scope.}
