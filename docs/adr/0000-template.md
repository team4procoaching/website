# {Short, descriptive title}

Date: {YYYY-MM-DD}

{Optional metadata — include only when this ADR fully supersedes one or more
prior ADRs. Add one line per superseded ADR. For partial supersession, document
the scope on the superseded ADR's Status line instead (see the
partially-superseded variant below).}

Supersedes: [ADR-XXXX](XXXX-....md)

## Status

{Accepted | Proposed | Deprecated | Superseded by [ADR-XXXX](XXXX-....md) |
Accepted (partially superseded by [ADR-XXXX](XXXX-....md) for {scope})}

## Context

{What is the problem? Why is a decision needed now?}

### Decision drivers

{Optional — explicit list of priorities that shaped the decision. Most useful
when multiple competing concerns need balancing.}

- {Driver 1 (e.g., "Maintain static performance for marketing pages")}
- {Driver 2 (e.g., "Minimize operational complexity")}

### Evaluated approaches

1. **{Option A}** — {brief description}. {Why rejected or chosen.}
2. **{Option B}** — {brief description}. {Why rejected or chosen.}
3. **{Option C}** — {brief description}. **Chosen.**

## Decision

{What is the chosen solution? How will it be implemented?}

### What does NOT change

{Optional — for decisions that change something fundamental (rendering model,
data format, script strategy), explicitly list what remains unaffected. This is
the most important trust-building section for readers and AI tools.}

- {Unaffected concern 1}
- {Unaffected concern 2}

### Scope and non-goals

{Optional — use when the boundary between this ADR and related decisions needs
explicit clarification.}

**In scope:**

- {What is explicitly covered by this decision?}

**Out of scope:**

- {What is explicitly excluded to prevent misunderstandings?}

## Consequences

### Positive

- {Benefit 1}
- {Benefit 2}

### Negative

- {Drawback / cost / complexity}
- {Drawback / cost / complexity}

### Risk mitigation

{Optional — how do we address the negative consequences or residual risks? Omit
if the negatives are self-contained and need no mitigation strategy.}

- {Mitigation 1}

## Success criteria

{Optional — measurable conditions that indicate this decision was successful.
Omit if success is self-evident (e.g., "Stripe payments work"). Use when the
decision introduces a migration, a performance target, or a process change.}

- {Measurable condition 1 (e.g., "Page load under 2s")}
- {Measurable condition 2 (e.g., "Zero `is:inline` scripts remain except...")}

## References

- {Links to documentation, related ADRs, or articles}
