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

| ID             | Severity | Effort | Scope        | Title         | Blocks CMS | Blocks maintenance | Audit source               |
| -------------- | -------- | ------ | ------------ | ------------- | ---------- | ------------------ | -------------------------- |
| DEBT-YYMMDD-01 | high     | M      | Architecture | Example title | no         | yes                | 2026-04-24-architecture.md |

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
