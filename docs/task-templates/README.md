# Task Templates

Templates for the Markdown artefacts produced during a task's lifecycle through
the four phases defined in `CLAUDE.md` and `docs/AGENTS.md`.

## Contents

| File                            | Phase   | Produced By            | Lands At                                      |
| :------------------------------ | :------ | :--------------------- | :-------------------------------------------- |
| `01-requirements.template.md`   | Phase 1 | `requirements-analyst` | `.claude/work/<task-id>/01-requirements.md`   |
| `02-concept.template.md`        | Phase 2 | `architect`            | `.claude/work/<task-id>/02-concept.md`        |
| `02-concept-review.template.md` | Phase 2 | `concept-reviewer`     | `.claude/work/<task-id>/02-concept-review.md` |
| `04-review.template.md`         | Phase 4 | `reviewer`             | `.claude/work/<task-id>/04-review-r<n>.md`    |

## Why there is no `03-` template

Phase 3 is Implementation. Its output is the commit stream on the task branch,
not a Markdown artefact. Commit conventions live in `CONTRIBUTING.md`; Phase 3
working rules live in `CLAUDE.md`. A third template here would duplicate that
guidance.

The numbering gap is intentional and matches the phase numbering rather than
artefact order, so the mapping between task phase and template stays one-to-one.

## Templates that do NOT belong here

- **ADR template** lives at `docs/adr/0000-template.md`. The `0000` slot next to
  the existing ADRs is the conventional location (Nygard ADR pattern). ADRs can
  be produced by the `architect` during Phase 2 but also directly by the project
  owner — they are not task-scoped.
- **Debt register template** lives at `docs/debt/REGISTER.template.md`. The
  register is a standing document, not a task artefact, and is co-located with
  the other debt material.
- **Feature template** (`docs/FEATURE_TEMPLATE.md`) is the Readiness Checklist
  source consulted by the `requirements-analyst` during Phase 1. It is a
  checklist, not a task artefact.

## Using a template

Agents copy the relevant template file to the task folder and fill it in. The
project owner does not interact with the templates directly — the agents do.

For the full flow, see `docs/AGENTS.md` → "How a Task Flows Through the System".
