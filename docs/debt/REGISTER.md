# Team 4 Pro — Debt Register

Consolidated register of all open debt items. Individual audit reports live
under `docs/debt/<YYYY-MM-DD>-<scope>.md` and provide the details per ID.
Reviewer-audit reports carry the prefix `audit-`.

## Prioritization

Items are sorted not only by severity but by **blocking impact on CMS
handover**. Priority derives from:

1. Blocks CMS integration? (yes = highest)
2. Hinders handover to the coaches? (yes = high)
3. Critical for post-handover maintenance? (yes = high)
4. Otherwise: by severity.

**Project exit condition:** `blocking = 0 and high = 0`. Medium and low items
remain documented but are not closing blockers.

## Open

| ID             | Severity | Effort | Scope            | Title                                                                                   | Blocks CMS | Blocks maintenance | Audit source                                    |
| -------------- | -------- | ------ | ---------------- | --------------------------------------------------------------------------------------- | ---------- | ------------------ | ----------------------------------------------- |
| DEBT-260426-01 | minor    | XS     | Convention       | Add `check:conventions` rule: no `.ts` files in `src/pages/`                            | no         | yes                | audit-2026-04-26-services-detail-page-review.md |
| DEBT-260426-02 | minor    | S      | ADR              | ADR-0038 §1: document local `Props` declaration under helper-and-re-export shape        | no         | yes                | audit-2026-04-26-services-detail-page-review.md |
| DEBT-260426-03 | minor    | S      | Test             | Decouple `ServiceDetailHero` chip-count test from Tailwind class                        | no         | no                 | audit-2026-04-26-services-detail-page-review.md |
| DEBT-260426-04 | minor    | M      | Test             | Replace "PR-body deviation note" session-jargon in component-test prefaces              | no         | no                 | audit-2026-04-26-services-detail-page-review.md |
| DEBT-260426-05 | minor    | M      | Component        | Extract `TextButton` primitive once 3+ consumers exist                                  | no         | no                 | audit-2026-04-26-services-detail-page-review.md |
| DEBT-260426-06 | minor    | XS     | Page composition | Apply alternating background on `[slug].astro` to break the muted-on-muted block        | no         | no                 | audit-2026-04-26-services-detail-page-review.md |
| DEBT-260426-07 | minor    | S      | Component        | Mirror `ProcessSteps`'s typed background prop on `Accordion` for consistent section-API | no         | yes                | audit-2026-04-26-services-detail-page-review.md |
| DEBT-260428-01 | minor    | S      | Test             | Consolidate JSDOM `parse(html)` helper across 10 test files                             | no         | no                 | 2026-04-28-test-fixture-followup.md             |
| DEBT-260501-01 | minor    | M      | Convention       | Add Forms section to CONVENTIONS.md (Netlify Forms + honeypot pattern)                  | no         | yes                | 2026-05-01-doc-topic-hub-followups.md           |
| DEBT-260501-02 | minor    | S      | Convention       | Promote Image Handling out of TypeScript Conventions to its own section                 | no         | no                 | 2026-05-01-doc-topic-hub-followups.md           |
| DEBT-260501-04 | minor    | XS     | Convention       | Update ADR collision-avoidance listing to exclude `_archive/`                           | no         | no                 | 2026-05-01-archive-collision-precondition.md    |
| DEBT-260501-03 | minor    | XS     | Doc              | Add ADR-0037 + ADR-0038 rows to ARCHITECTURE.md Quick Reference                         | no         | no                 | 2026-05-01-statsgrid-stagger-cap-followups.md   |

## In Progress

| ID  | Severity | Branch | Started |
| --- | -------- | ------ | ------- |

## Done

| ID  | Done on | Commit | Note |
| --- | ------- | ------ | ---- |

## Deliberately Accepted

Items that were reviewed and deliberately not fixed, with rationale.

| ID             | Rationale                                                                                                                                                                                                                                                                                                                                              |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| DEBT-260428-02 | `processSteps.test.ts` uses inline `steps` literals, not the typed fixture builders introduced in PR #167. Single consumer for `ProcessStep` test fixtures today; the codebase's extraction threshold is two or more. Reopen and migrate when a second `*.test.ts` consumes `ProcessStep` as a fixture. Source: `2026-04-28-test-fixture-followup.md`. |

## Abandoned

Items that were started but will not be completed, with reason. Abandoned task
docs never land on main — they live under `.claude/work/<task-id>/` inside the
feature worktree and disappear when the worktree is removed. Any remaining work
worth keeping must be copied into a debt entry or follow-up ADR before the
worktree is dropped; otherwise that context is lost.

| ID  | Abandoned on | Reason | Remaining work |
| --- | ------------ | ------ | -------------- |
