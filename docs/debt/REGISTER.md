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

| ID             | Severity | Effort | Scope      | Title                                                                            | Blocks CMS | Blocks maintenance | Audit source                                    |
| -------------- | -------- | ------ | ---------- | -------------------------------------------------------------------------------- | ---------- | ------------------ | ----------------------------------------------- |
| DEBT-260426-01 | minor    | XS     | Convention | Add `check:conventions` rule: no `.ts` files in `src/pages/`                     | no         | yes                | audit-2026-04-26-services-detail-page-review.md |
| DEBT-260426-02 | minor    | S      | ADR        | ADR-0038 §1: document local `Props` declaration under helper-and-re-export shape | no         | yes                | audit-2026-04-26-services-detail-page-review.md |
| DEBT-260426-03 | minor    | S      | Test       | Decouple `ServiceDetailHero` chip-count test from Tailwind class                 | no         | no                 | audit-2026-04-26-services-detail-page-review.md |
| DEBT-260426-04 | minor    | M      | Test       | Replace "PR-body deviation note" session-jargon in component-test prefaces       | no         | no                 | audit-2026-04-26-services-detail-page-review.md |
| DEBT-260426-05 | minor    | M      | Component  | Extract `TextButton` primitive once 3+ consumers exist                           | no         | no                 | audit-2026-04-26-services-detail-page-review.md |

## In Progress

| ID  | Severity | Branch | Started |
| --- | -------- | ------ | ------- |

## Done

| ID  | Done on | Commit | Note |
| --- | ------- | ------ | ---- |

## Deliberately Accepted

Items that were reviewed and deliberately not fixed, with rationale.

| ID  | Rationale |
| --- | --------- |

## Abandoned

Items that were started but will not be completed, with reason. Abandoned task
docs never land on main — they live under `.claude/work/<task-id>/` inside the
feature worktree and disappear when the worktree is removed. Any remaining work
worth keeping must be copied into a debt entry or follow-up ADR before the
worktree is dropped; otherwise that context is lost.

| ID  | Abandoned on | Reason | Remaining work |
| --- | ------------ | ------ | -------------- |
