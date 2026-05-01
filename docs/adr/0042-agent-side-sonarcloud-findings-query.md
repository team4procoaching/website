# Agent-Side SonarCloud Findings Query as the Third Local-Prevention Layer

Date: 2026-05-01

## Status

Accepted

## Context

[ADR-0041](0041-sonarlint-connected-mode-local-prevention.md) settled the
local-prevention question for the human-in-VS-Code persona: SonarLint VS Code in
Connected Mode catches SonarCloud findings at edit time, before push. SonarCloud
Automatic Analysis catches the residual rules at PR time, after push. The CI
canary (`scripts/check-biome-rule-baseline.mjs`) protects the empirical-evidence
table against silent drift on Biome upgrades.

The same ADR leaves an explicit gap. This project's working mode is AI-assisted:
much of the code is produced by automated tooling that operates outside VS Code,
where SonarLint Connected Mode does not run. Consequently, an automated
contributor has **no SonarCloud feedback** between "start writing code" and "PR
opens, Automatic Analysis posts findings". The two remaining options are:

- Read the snapshotted `sonar-issues.csv` at the repo root — manual, lossy, only
  as fresh as the last manual export.
- Wait for the post-push PR-time analysis — defeats the "before push" framing
  and creates round-trip cost the human review must absorb.

The standing maintenance principle "do not introduce new SonarCloud findings;
reduce the existing backlog" therefore depends on reading a stale snapshot or
guessing. A structurally enforced answer is missing.

The decision this ADR closes: **what fills the automated-contributor feedback
gap before push?**

### Decision drivers

- **AI-first working mode.** The repo optimises for typed boundaries, low blast
  radius, and structural enforcement over per-contributor discipline. A
  scriptable lookup is structural; a "remember to read the CSV" rule is
  discipline.
- **Bus factor.** A future maintainer must inherit a discoverable mechanism, not
  a tribal-knowledge step. The mechanism ships as a `pnpm` script, an `.env`
  example, and a documentation section.
- **Cost-conscious.** SonarCloud's public REST API is free and unauthenticated
  for public projects. No paid SaaS, no new CI service.
- **Cross-platform.** Node 24's built-in `fetch` runs identically on Windows,
  macOS, and Linux. No `curl`, no platform-specific shells.
- **No new pnpm-check chain.**
  [ADR-0041's commit-plan policy](0041-sonarlint-connected-mode-local-prevention.md#decision)
  forbids extending the four-step `pnpm check` chain. The new layer ships as a
  sibling script (`pnpm check:sonar-findings`), opt-in, never chained.
- **Scope is lookup, not gate.** The script reads SonarCloud's view; it does not
  fail builds. A "fail on any finding" default would clash with the existing
  baseline of about 100 open findings and turn into a sea of suppressions, the
  same shape ADR-0041 explicitly rejected.

### Evaluated approaches

1. **Status quo plus discipline.** Read `sonar-issues.csv` snapshots and trust
   them. Rejected: snapshots go stale within hours of any push; reading them is
   per-invocation discipline; the freshness of the snapshot cannot be verified
   without an out-of-band query.
2. **Wait for SonarCloud Automatic Analysis on PR.** Rely on the post-push
   feedback loop. Rejected: defeats the "before push" framing of the prevention
   layers; round-trip cost on the human reviewer; AI-assisted iteration cycles
   are shorter than SonarCloud's analysis latency.
3. **Run a local SonarLint CLI in headless mode against the working tree.**
   Rejected: SonarLint has no headless CLI suited to a `pnpm` script invocation;
   SonarSource's CLI offerings target sonar-scanner-style full-project scans,
   not per-file lookups; the operational shape does not fit a quick-feedback
   loop.
4. **Add a Node ESM script that queries SonarCloud's `/api/issues/search` REST
   endpoint for findings on a defined file set, prints results, and exits
   informationally. Chosen.** Reuses the already-running SonarCloud analysis; no
   new infrastructure; per-file filtering server-side via `componentKeys=`; no
   auth required for this public project; cross-platform via Node `fetch`.

## Decision

A new sibling script `pnpm check:sonar-findings` queries SonarCloud's public
REST API (`/api/issues/search`) for findings on a defined file set, prints them
in a human-readable table by default and JSON when `--json` is passed, and exits
0 on every successful query (informational, not a build gate).

### Layout

The script follows the same shape the rule-baseline canary uses: pure logic in a
sibling library, I/O in the entry script, unit tests next to the library.

- `scripts/sonar-findings/query.mjs` — pure-logic library (URL builder, response
  parser, output formatters, cache helpers).
- `scripts/sonar-findings/query.test.mjs` — Vitest unit tests covering the pure
  surface.
- `scripts/sonar-findings/fixtures/issues-response.json` — captured API response
  (anonymised, real shape) used by the parser tests.
- `scripts/check-sonar-findings.mjs` — CLI runner: arg parsing, git-range
  resolution, fetch wiring, cache read/write, exit-code handling.
- `package.json` — adds the `check:sonar-findings` script entry. **Not chained
  into `pnpm check`.**
- `.env.local.example` — documents the optional `SONAR_TOKEN` shape. The real
  `.env.local` is per-developer, gitignored.
- `.gitignore` — adds `.env.local` and `.sonar-cache/` under a new
  `# Agent-side SonarCloud query` block.
- `docs/DEVELOPMENT.md` — extends the `## SonarLint Connected Mode` section with
  an `### Agent-Side Findings Query` sub-section.

### Behaviour

- **Default file set.** The script defaults to
  `git diff --name-only main...HEAD` — every file the current branch has touched
  relative to the branching basis with `main`. Two overrides are supported:
  - `--files <comma-sep-paths>` — explicit list.
  - `--all` — query the whole project.
- **Authentication.** A `SONAR_TOKEN` from `.env.local` is sent via
  `Authorization: Bearer <token>` when present. Without a token, the public API
  serves data unauthenticated for this public project. Documented in
  `docs/DEVELOPMENT.md`. The token never appears in script output.
- **Output.** A pretty-printed table by default
  (`rule | severity | file:line | message`, sorted by `(file, line, rule)`). The
  `--json` flag emits a stable JSON shape with sorted keys. Both formats prefix
  the output with a banner naming the project key and branch, optionally
  annotated with the cache age. The banner does not claim a per-analysis
  timestamp because SonarCloud's `/api/issues/search` endpoint does not return
  one; the snapshot-vs-live distinction is conveyed by the documentation in this
  ADR and `docs/DEVELOPMENT.md`, not by a per-run timestamp.
- **Exit codes.** `0` on every successful query (including "no findings"). `1`
  reserved for runtime errors (missing committed `connectedMode.json`, network
  failure, malformed API response). The script is a lookup, not a gate.
- **Caching.** A 5-minute TTL JSON cache in `.sonar-cache/cache.json`, keyed by
  hashed `(componentKeys, statuses, pageSize)` tuple. Bounded freshness matches
  SonarCloud's typical post-push reanalysis latency. Override via
  `--cache-ttl-seconds=N` or `--no-cache`.
- **Configuration source.** The script reads `sonarCloudOrganization` and
  `projectKey` from the committed `.sonarlint/connectedMode.json` — the same
  file SonarLint VS Code reads. No duplicate configuration. A future binding
  change updates both layers from a single source.

### What does NOT change

- ADR-0041's prevention model is **extended**, not revised. SonarLint Connected
  Mode (edit-time, VS Code), SonarCloud Automatic Analysis (PR-time), and the
  Biome rule-baseline canary (CI drift detection) all remain. This ADR adds the
  scriptable per-file lookup as the third local-prevention layer.
- The `pnpm check` chain (`typecheck` → `lint` → `format:check` →
  `check:conventions`) is unchanged. The new script ships as a sibling
  `check:sonar-findings`, never chained.
- The pre-commit hook (`lint-staged` running `biome check --write` on staged
  files) is unchanged.
- No new dependency. Node 24's built-in `fetch` and `--env-file-if-exists` cover
  the runtime; no `dotenv`, no `node-fetch`, no `keytar`.
- No Astro source code touched. No `.astro` file. No `routes.ts`. ADR-0036
  slot-presence rules are not applicable (no slot work).

### Scope and non-goals

**In scope:**

- A read-only lookup of existing SonarCloud findings on a file set.
- A documented per-developer token-storage path via `.env.local`.
- Cache-backed repeat-invocation behaviour during a single session.
- Documentation of the snapshot-vs-live limitation so contributors understand
  what the output represents.

**Out of scope:**

- Predictive / new-code analysis. The script returns SonarCloud's view of the
  last-pushed branch state. A future evolution that runs the Sonar JS/TS plugin
  locally against unpushed code is its own decision and not resolved here.
- Write operations. The script is one-way: query only. No `--update-baseline`,
  no `--mark-resolved`, no issue-status mutation. Recovery from a stolen token
  is "regenerate it on SonarCloud" (documented in DEVELOPMENT.md).
- A fail-the-build mode. The script never blocks merges. The existing prevention
  layers (SonarCloud Automatic Analysis on PRs, the CI canary) remain the gate.
- Integration with the Husky pre-push hook. Network round-trip cost per push is
  too high; opt-in invocation is the design.

## Consequences

### Positive

- **Automated-contributor feedback loop closes.** Running
  `pnpm check:sonar-findings` after a code change shows the SonarCloud-known
  findings on the touched files. The loop matches the existing Biome / Prettier
  / TypeScript / Convention chains in feel, even though the data source is a
  remote API rather than a local linter.
- **Same configuration source as SonarLint.** Both the editor extension and the
  script read `.sonarlint/connectedMode.json`. A future binding regeneration
  (per ADR-0041's "Confirm the Binding" step) updates both layers in one move.
- **No infrastructure cost.** No paid SaaS, no new CI service, no new
  dependency. The repo gains a feature; the dependency tree does not.
- **Structural enforcement.** The maintenance principle "no new findings; reduce
  the existing backlog" becomes a script invocation, not a discipline
  expectation.
- **Bus-factor handover.** Running `pnpm check:sonar-findings` in a fresh clone
  yields meaningful output without configuring anything (public project,
  unauthenticated path). Token-storage instructions cover the private-project
  case for the rare future scenario where it applies.

### Negative

- **Snapshot semantics.** The script returns SonarCloud's view of the last
  pushed branch state. Work on unpushed code shows baseline findings, not new
  findings on the in-progress diff. The on-screen banner and the documentation
  make this explicit, but the foot-gun ("the script said zero findings, ship
  it") is real.
- **Network dependency.** A clean clone behind a firewall that blocks
  `sonarcloud.io` cannot run the script. Failure mode is a one-line "network
  error: …" with non-zero exit. Acceptable; the script is opt-in, not a build
  gate.
- **Public-API rate limit.** SonarCloud does not surface rate-limit headers; a
  burst of invocations could trigger HTTP 429 throttling. Mitigation: the
  5-minute cache absorbs repeat invocations within a single session, and the
  script handles 429 by reading `Retry-After`, printing a warning, and returning
  the cached results if any.
- **Token recovery path.** A leaked `SONAR_TOKEN` is regenerated on SonarCloud's
  account-security page; the local `.env.local` is updated. Documented in
  DEVELOPMENT.md. The process is one-step and does not require re-binding the
  editor extension or rebuilding the cache.

### Risk mitigation

- **Snapshot misreading.** The data is from the last server-side analysis of the
  branch on SonarCloud, but the script cannot show the exact analysis time
  because `/api/issues/search` does not expose it. The mitigation is explicit
  documentation: this ADR's Negative-consequences "Snapshot semantics" entry and
  `docs/DEVELOPMENT.md` § "Agent-Side Findings Query" both state the limitation
  in prose. The on-screen banner names the project and branch and carries any
  active warnings (cache age, auth state, error fallbacks); the JSON envelope
  mirrors that information under `meta.snapshotInfo` and `meta.warnings`.
- **API schema drift.** The captured fixture
  (`scripts/sonar-findings/fixtures/issues-response.json`) is the test-time
  snapshot of the response shape. The parser is defensive (tolerates absent
  optional fields, throws on absent required fields). A future SonarSource
  schema change that breaks the parser surfaces as a unit-test failure first and
  a runtime error second; both are recoverable with a fixture-and-parser update
  PR.
- **`fileKeys` parameter confusion.** Older SonarQube documentation references a
  `fileKeys=` parameter that is silently ignored on SonarCloud (probed at
  authoring time). The script uses the verified-working `componentKeys=` shape
  with `<projectKey>:<filepath>` keys; a comment in `query.mjs` documents the
  trap so a future contributor doesn't reach for `fileKeys`.
- **Unauthenticated visibility change.** Today the project is public and the
  unauthenticated path returns data. If the project becomes private, the same
  query returns 401. The script's auth flow already supports a Bearer token; the
  change is one `.env.local` paste per developer, no script rewrite.
- **Cache-corruption recovery.** Malformed JSON in `.sonar-cache/cache.json` is
  silently re-fetched (the cache read is wrapped in `try/catch`; the failure
  path falls through to a fresh fetch). Worst case is one extra API round-trip,
  not a script crash.

## Success criteria

- A fresh clone, after `pnpm install` and a one-line `.env.local` paste (or no
  paste, for the public-project default while the project remains public), runs
  `pnpm check:sonar-findings` and sees a populated table within five seconds.
- An automated contributor running `pnpm check:sonar-findings` after editing a
  file sees the SonarCloud-known findings on that file in the default output,
  without any further configuration.
- A SonarCloud private-project transition requires no script rewrite — only a
  personal-token paste into `.env.local`.
- The script's unit tests pass on every PR via the existing `pnpm test:run` step
  (no `pnpm check` chain extension).
- Cumulative runtime cost in a single session stays under five seconds for
  cached repeat invocations and under ten seconds for the first cold call.

## References

- [ADR-0041](0041-sonarlint-connected-mode-local-prevention.md) — SonarLint
  Connected Mode as the local-prevention layer; the empirical-evidence table
  this ADR extends with a scriptable per-file lookup.
- [ADR-0006](0006-enforce-strict-environment-and-dependency-pinning.md) — strict
  version pinning, including Node 24.12.0 (whose built-in `fetch` and
  `--env-file-if-exists` flags this script depends on).
- [ADR-0013](0013-use-named-exports-for-data-modules.md) — named exports
  enforced in the new pure-logic library.
- [SonarCloud Web API — `/api/issues/search`](https://next.sonarqube.com/sonarqube/web_api/api/issues/search)
  — the endpoint shape, query parameters, and response format the script
  consumes.
- [SonarCloud Web API — Authentication](https://docs.sonarsource.com/sonarcloud/advanced-setup/web-api/)
  — the bearer-token shape used when `SONAR_TOKEN` is set.
- [Node `--env-file` documentation](https://nodejs.org/docs/latest-v24.x/api/cli.html#--env-fileconfig)
  — the engine-native `.env`-file loader the script invocation relies on.
- `scripts/check-sonar-findings.mjs` — the CLI entry script.
- `scripts/sonar-findings/query.mjs` — the pure-logic library.
- `docs/DEVELOPMENT.md` § SonarLint Connected Mode → Agent-Side Findings Query —
  per-developer setup instructions and the snapshot-vs-live limitation note.
- `sonar-issues.csv` — the SonarCloud snapshot taken at concept-write time; the
  agent-side query supersedes the manual snapshot for in-task lookups.
