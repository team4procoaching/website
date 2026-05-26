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

| ID             | Severity | Effort | Scope            | Title                                                                                   | Blocks CMS | Blocks maintenance | Source report                                       |
| -------------- | -------- | ------ | ---------------- | --------------------------------------------------------------------------------------- | ---------- | ------------------ | --------------------------------------------------- |
| DEBT-260426-01 | minor    | XS     | Convention       | Add `check:conventions` rule: no `.ts` files in `src/pages/`                            | no         | yes                | audit-2026-04-26-services-detail-page.md            |
| DEBT-260426-02 | minor    | S      | ADR              | ADR-0038 §1: document local `Props` declaration under helper-and-re-export shape        | no         | yes                | audit-2026-04-26-services-detail-page.md            |
| DEBT-260426-03 | minor    | S      | Test             | Decouple `ServiceDetailHero` chip-count test from Tailwind class                        | no         | no                 | audit-2026-04-26-services-detail-page.md            |
| DEBT-260426-04 | minor    | M      | Test             | Replace "PR-body deviation note" session-jargon in component-test prefaces              | no         | no                 | audit-2026-04-26-services-detail-page.md            |
| DEBT-260426-05 | minor    | M      | Component        | Extract `TextButton` primitive once 3+ consumers exist                                  | no         | no                 | audit-2026-04-26-services-detail-page.md            |
| DEBT-260426-06 | minor    | XS     | Page composition | Apply alternating background on `[slug].astro` to break the muted-on-muted block        | no         | no                 | audit-2026-04-26-services-detail-page.md            |
| DEBT-260426-07 | minor    | S      | Component        | Mirror `ProcessSteps`'s typed background prop on `Accordion` for consistent section-API | no         | yes                | audit-2026-04-26-services-detail-page.md            |
| DEBT-260428-01 | minor    | S      | Test             | Consolidate JSDOM `parse(html)` helper across 10 test files                             | no         | no                 | notes-2026-04-28-test-fixture-followup.md           |
| DEBT-260501-01 | minor    | M      | Convention       | Add Forms section to CONVENTIONS.md (Netlify Forms + honeypot pattern)                  | no         | yes                | notes-2026-05-01-doc-topic-hub-followups.md         |
| DEBT-260501-02 | minor    | S      | Convention       | Promote Image Handling out of TypeScript Conventions to its own section                 | no         | no                 | notes-2026-05-01-doc-topic-hub-followups.md         |
| DEBT-260501-04 | minor    | XS     | Convention       | Update ADR collision-avoidance listing to exclude `_archive/`                           | no         | no                 | notes-2026-05-01-archive-collision-precondition.md  |
| DEBT-260501-03 | minor    | XS     | Doc              | Add ADR-0037 + ADR-0038 rows to ARCHITECTURE.md Quick Reference                         | no         | no                 | notes-2026-05-01-statsgrid-stagger-cap-followups.md |
| DEBT-260501-05 | minor    | XS     | Component        | Decide remove-or-scope for `data-service-card` attribute on `ServiceCard.astro`         | no         | no                 | audit-2026-05-01-services-card-link.md              |
| DEBT-260511-01 | minor    | XS     | Convention       | Add `check:conventions` rule: enforce `docs/debt/` report filename shape                | no         | no                 | ADR-0048                                            |

## In Progress

| ID  | Severity | Branch | Started |
| --- | -------- | ------ | ------- |

## Done

| ID             | Done on    | Commit  | Note                                                                                                                                                                                                                           |
| -------------- | ---------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| DEBT-260509-01 | 2026-05-10 | —       | Fresh-fetch parser-throw guard across four endpoints; ADR-0042 § Exit codes amended in the same PR.                                                                                                                            |
| DEBT-260521-01 | 2026-05-22 | —       | Pre-push duplication gate demoted from blocking to advisory (ADR-0056); the dead red is now a readable cluster delta.                                                                                                          |
| DEBT-260514-01 | 2026-05-26 | 787e609 | ContactForm form-init script extracted to `src/scripts/contactFormController.ts` under the `feat/contact-form-prefill-consistency` stream; ADR-0059 formalised the visibility pattern the controller branches operate against. |

## Deliberately Accepted

Items that were reviewed and deliberately not fixed, with rationale.

| ID             | Rationale                                                                                                                                                                                                                                                                                                                                                    |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| DEBT-260428-02 | `processSteps.test.ts` uses inline `steps` literals, not the typed fixture builders introduced in PR #167. Single consumer for `ProcessStep` test fixtures today; the codebase's extraction threshold is two or more. Reopen and migrate when a second `*.test.ts` consumes `ProcessStep` as a fixture. Source: `notes-2026-04-28-test-fixture-followup.md`. |

## Abandoned

Items that were started but will not be completed, with reason. Abandoned task
docs never land on main — they live under `.claude/work/<task-id>/` inside the
feature worktree and disappear with the worktree when its disposition succeeds
(see [`docs/AGENTS.md` § Worktree Lifecycle](../AGENTS.md#worktree-lifecycle)).
Any remaining work worth keeping must be copied into a debt entry or follow-up
ADR before the worktree is dropped; otherwise that context is lost — and on
platforms where removal is unreliable, the abandoned worktree may persist as a
stale directory until manually pruned.

| ID  | Abandoned on | Reason | Remaining work |
| --- | ------------ | ------ | -------------- |
