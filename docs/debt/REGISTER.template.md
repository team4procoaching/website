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

Items that were started but will not be completed, with reason and reference to
any remaining work in `docs/work/_archive/`.

| ID  | Abandoned on | Reason | Remaining work |
| --- | ------------ | ------ | -------------- |
