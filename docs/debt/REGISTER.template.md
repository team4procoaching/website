# Team 4 Pro — Debt Register

Consolidated register of all open debt items. The per-report files that back
these entries live under `docs/debt/` and provide the details per ID. They
follow one filename convention
([ADR-0048](../adr/0048-debt-report-filename-convention.md)):
systematic-findings reports — from the reviewer in audit mode or from the
debt-auditor — are named `audit-<YYYY-MM-DD>-<scope>.md`; hand-curated
follow-up/note bundles are named `notes-<YYYY-MM-DD>-<scope>.md`. The `-review`
suffix is not used.

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

| ID             | Severity | Effort | Scope        | Title         | Blocks CMS | Blocks maintenance | Source report                    |
| -------------- | -------- | ------ | ------------ | ------------- | ---------- | ------------------ | -------------------------------- |
| DEBT-YYMMDD-01 | high     | M      | Architecture | Example title | no         | yes                | audit-2026-04-24-architecture.md |

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
