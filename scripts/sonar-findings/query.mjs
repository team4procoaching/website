/**
 * Shared infrastructure for the agent-side SonarCloud findings query script.
 *
 * What lives here:
 *   - parseConnectedMode(json): extracts org+projectKey from
 *     `.sonarlint/connectedMode.json`, throws on missing fields.
 *   - stripComponentPrefix(component, projectKey): pure helper used by every
 *     endpoint mapper to strip the `<projectKey>:` prefix from a component
 *     identifier.
 *   - compareFindings(a, b): deterministic comparator `(file, line, rule)`
 *     used by every endpoint parser to sort the result list.
 *   - formatPretty(issues, meta, hotspots?): pretty-printed table with
 *     deterministic sort `(file, line, rule)`; banner names the analysis
 *     basis. Appends a `Security Hotspots:` section when
 *     `meta.snapshotInfo.hotspotsIncluded` is true.
 *   - formatJson(issues, meta, hotspots?): stable envelope
 *     `{ meta, findings }`, with an additional top-level `hotspots`
 *     array when `meta.snapshotInfo.hotspotsIncluded` is true. Identical
 *     shape on success and transient-error paths so consumers can
 *     `jq '.findings'` without conditional logic.
 *   - cacheKeyOf(input): pure hash of inputs; deterministic;
 *     collision-resistant via separator. The `endpoint` discriminator
 *     prevents issues/hotspots key collisions under the shared
 *     `.sonar-cache/cache.json` file. The issues arm carries a
 *     `branchAxis` segment so cache entries from different branches do
 *     not collide; see ADR-0046 § Decision → Cache-key shapes for the
 *     full per-endpoint key shape.
 *   - isCacheFresh(cacheEntry, now, ttlMs): TTL check; pure.
 *   - parseCacheEntry(text): defensive JSON parse; returns `null` on parse
 *     error so the CLI runner falls through to a fresh fetch.
 *   - classifyDiffEdgeCase(gitContext): resolves the edge-case matrix
 *     pinned in the concept's "Default-input edge cases" section to a
 *     deterministic `(behaviourTag, warning)` tuple before the API path
 *     runs.
 *   - classifyError({ httpStatus, errorKind, projectKey }): resolves the
 *     failure-mode matrix pinned in the concept's "Error contract" section
 *     to a deterministic `(stderr, warning, allowStaleCache)` tuple.
 *
 * What does NOT live here:
 *   - Per-endpoint URL builders, parsers, and mappers for the issues
 *     surface — those live in `./issues.mjs` (see ADR-0042 file-split
 *     flip-point).
 *   - Per-endpoint URL builders, parsers, mappers, and the lifecycle
 *     filter for the hotspots surface — those live in `./hotspots.mjs`.
 *     The hotspot pretty-print section formatter (`appendHotspotSection`)
 *     stays here next to `formatPretty` because the orchestrator owns
 *     the section-stacking order across endpoints.
 *   - I/O (spawnSync, fetch, fs, console, process.exit). Those stay in the
 *     entry script `scripts/check-sonar-findings.mjs` so this module is
 *     unit-testable without filesystem, subprocess, or network access.
 *
 * Imported by:
 *   - scripts/check-sonar-findings.mjs (CLI runner)
 *   - scripts/sonar-findings/query.test.mjs (unit tests)
 *   - scripts/sonar-findings/issues.mjs (issues-endpoint module)
 *   - scripts/sonar-findings/hotspots.mjs (hotspots-endpoint module)
 */

export const SONARCLOUD_BASE_URL = 'https://sonarcloud.io';
export const DEFAULT_CACHE_TTL_MS = 5 * 60 * 1000;

/**
 * JSON envelope schema version, surfaced as `meta.schemaVersion` in the
 * `--json` output. This is the agent contract; bumping it is a consumer-
 * visible breaking change.
 */
export const SCHEMA_VERSION = 1;

/**
 * On-disk cache schema version, embedded as `schemaVersion` at the top of
 * `.sonar-cache/cache.json`. Independent from `SCHEMA_VERSION` because the
 * cache is a private, disposable artefact: a shape change here costs one
 * extra fetch on first-run after the bump (bump-and-discard), no migration.
 *
 * Bumped from 1 to 2 when the cache key gained an `endpoint` discriminator
 * to share one cache file between the issues and hotspots endpoints.
 *
 * Bumped from 2 to 3 when both the issues and the hotspots cache keys gained
 * the `branchAxis` segment. Cache entries written under v2 do not encode the
 * branch axis and would silently surface under the wrong branch on read; the
 * bump-and-discard flow in `parseCacheEntry` handles the migration with one
 * extra fetch on first run after the bump.
 */
export const CACHE_SCHEMA_VERSION = 3;

/**
 * Discriminated union describing the SonarCloud branch-axis a query targets.
 * Either a regular branch by name, or a pull-request id (numeric, but kept
 * as a string for URL-safety symmetry with the branch arm). Threaded through
 * `cacheKeyOf` and the per-endpoint URL builders.
 *
 * @typedef {{ kind: 'branch', name: string } | { kind: 'pullRequest', id: string }} BranchAxis
 */

/**
 * Formats a `BranchAxis` into the deterministic cache-key segment
 * documented in ADR-0046 § Decision → Cache-key shapes:
 * `branch:<name>` or `pullRequest:<n>`. Pulled out so every endpoint arm
 * of `cacheKeyOf` shares one source of truth and the per-axis prefix never
 * drifts between endpoints.
 *
 * @param {BranchAxis} branchAxis
 * @returns {string}
 */
export function formatBranchAxisSegment(branchAxis) {
  if (branchAxis.kind === 'pullRequest') {
    return `pullRequest:${branchAxis.id}`;
  }
  return `branch:${branchAxis.name}`;
}

/**
 * Extracts `sonarCloudOrganization` and `projectKey` from the parsed
 * `.sonarlint/connectedMode.json` payload. Throws when either field is
 * missing or non-string — the script cannot continue without both.
 *
 * @param {unknown} json - parsed JSON object
 * @returns {{ organization: string, projectKey: string }}
 */
export function parseConnectedMode(json) {
  if (json === null || typeof json !== 'object') {
    throw new Error('connectedMode.json is not an object');
  }
  const organization = /** @type {Record<string, unknown>} */ (json).sonarCloudOrganization;
  const projectKey = /** @type {Record<string, unknown>} */ (json).projectKey;
  if (typeof organization !== 'string' || organization.length === 0) {
    throw new Error('connectedMode.json is missing sonarCloudOrganization');
  }
  if (typeof projectKey !== 'string' || projectKey.length === 0) {
    throw new Error('connectedMode.json is missing projectKey');
  }
  return { organization, projectKey };
}

// === Shared component / sort helpers (used by every endpoint module) ===

/**
 * Strips the `<projectKey>:` prefix from a SonarCloud component string,
 * returning the bare filepath. Returns the input unchanged when the
 * prefix is absent (defensive — the script never receives such payloads
 * from the verified API shape, but a future API change should not throw).
 *
 * @param {string} component
 * @param {string} projectKey
 * @returns {string}
 */
export function stripComponentPrefix(component, projectKey) {
  const prefix = `${projectKey}:`;
  if (component.startsWith(prefix)) {
    return component.slice(prefix.length);
  }
  return component;
}

/**
 * Deterministic comparator for the findings list: primary key file, then
 * line, then rule. Pulled out so `parseIssuesResponse` reads as a pure
 * map+sort and the comparator itself is independently testable. The same
 * comparator orders hotspot findings — both shapes carry `file`, `line`,
 * and `rule`.
 *
 * @param {{ file: string, line: number, rule: string }} a
 * @param {{ file: string, line: number, rule: string }} b
 * @returns {number}
 */
export function compareFindings(a, b) {
  const fileCmp = a.file.localeCompare(b.file);
  if (fileCmp !== 0) return fileCmp;
  if (a.line !== b.line) return a.line - b.line;
  return a.rule.localeCompare(b.rule);
}

// === Output, cache, error classification ===

/**
 * Builds the `meta` block for the JSON envelope and pretty banner. The
 * shape is pinned in the concept's "Error contract" section: schema
 * version, snapshot info, warnings array. Identical on success and
 * transient-error paths so machine consumers parse one shape regardless
 * of outcome.
 *
 * Note: the script does not report a per-analysis timestamp because the
 * SonarCloud `/api/issues/search` endpoint this script targets does not
 * expose one. The snapshot-vs-live distinction is conveyed by the
 * Limitations text in DEVELOPMENT.md and ADR-0042, not by a per-run
 * timestamp.
 *
 * `hotspotsIncluded` reflects whether the run opted into the
 * `--include-hotspots` flag. It is an additive, non-breaking field at
 * `meta.schemaVersion: 1` (consumers that ignore unknown fields per
 * standard JSON-handling norm are unaffected).
 *
 * `pullRequest` is additive at `meta.schemaVersion: 1` for the same reason.
 * It is `null` unless `--pull-request=<n>` was passed, in which case it
 * carries the supplied numeric id. `branch` keeps its non-nullable
 * `string` type and continues to hold the resolved current local branch
 * name even when the PR axis is in effect — `pullRequest`, not `branch`,
 * is the axis disambiguator (ADR-0046 § Decision → JSON envelope
 * additivity).
 *
 * @param {object} input
 * @param {string} input.projectKey
 * @param {string} input.branch
 * @param {string} input.queryTimestamp
 * @param {boolean} input.fromCache
 * @param {number | null} input.cacheAgeSeconds
 * @param {boolean} input.hotspotsIncluded
 * @param {number | null} [input.pullRequest]
 * @param {readonly string[]} input.warnings
 * @returns {{ schemaVersion: number, snapshotInfo: object, warnings: string[] }}
 */
export function buildMeta(input) {
  return {
    schemaVersion: SCHEMA_VERSION,
    snapshotInfo: {
      projectKey: input.projectKey,
      branch: input.branch,
      queryTimestamp: input.queryTimestamp,
      fromCache: input.fromCache,
      cacheAgeSeconds: input.cacheAgeSeconds,
      hotspotsIncluded: input.hotspotsIncluded,
      pullRequest: input.pullRequest ?? null,
    },
    warnings: [...input.warnings],
  };
}

/**
 * Appends the human-readable hotspot section to the existing pretty
 * output. Header is `Security Hotspots:`; an empty input yields the
 * single line `(no hotspots)`. Each entry mirrors the issues
 * pretty-printer's two-line block: `  <rule>  [<probability>]  <file>:
 * <line>` followed by `    <message>`. Pulled out so `formatPretty` reads
 * as one branch per surface.
 *
 * @param {string[]} lines - mutated in place with the hotspot section
 * @param {ReadonlyArray<{ rule: string, file: string, line: number, message: string, vulnerabilityProbability: string, status: string }>} hotspots
 */
function appendHotspotSection(lines, hotspots) {
  lines.push('', 'Security Hotspots:');
  if (hotspots.length === 0) {
    lines.push('(no hotspots)');
    return;
  }
  for (const hotspot of hotspots) {
    const location = hotspot.line > 0 ? `${hotspot.file}:${hotspot.line}` : hotspot.file;
    lines.push(
      `  ${hotspot.rule}  [${hotspot.vulnerabilityProbability}]  ${location}`,
      `    ${hotspot.message}`,
    );
  }
}

/**
 * Pretty-printer for the human-readable path. Emits a banner naming the
 * project and the active branch axis, optionally annotated with the cache
 * age, followed by either an "(no findings)" line or a findings table
 * sorted by `(file, line, rule)`. When `meta.snapshotInfo.hotspotsIncluded`
 * is true, appends a `Security Hotspots:` section below the issues table
 * (the section header and entry layout are pinned by ADR-0042). The
 * banner does not claim a per-analysis timestamp; SonarCloud's
 * `/api/issues/search` endpoint does not supply one. The
 * snapshot-vs-live distinction is documented in DEVELOPMENT.md and
 * ADR-0042.
 *
 * Banner axis text:
 *   - default / `--branch=<name>`: `... on branch <name>`
 *   - `--pull-request=<n>`: `... on pull request #<n>`
 *
 * @param {ReadonlyArray<{ rule: string, severity: string, file: string, line: number, message: string, status: string }>} findings
 * @param {{ schemaVersion: number, snapshotInfo: { projectKey: string, branch: string, queryTimestamp: string, fromCache: boolean, cacheAgeSeconds: number | null, hotspotsIncluded: boolean, pullRequest: number | null }, warnings: readonly string[] }} meta
 * @param {ReadonlyArray<{ rule: string, file: string, line: number, message: string, vulnerabilityProbability: string, status: string }>} [hotspots]
 * @returns {string}
 */
export function formatPretty(findings, meta, hotspots = []) {
  const lines = [];
  const snapshot = meta.snapshotInfo;
  const cacheNote = snapshot.fromCache ? ` (cached, ${snapshot.cacheAgeSeconds ?? 0}s old)` : '';
  const axisLabel =
    snapshot.pullRequest !== null && snapshot.pullRequest !== undefined
      ? `pull request #${snapshot.pullRequest}`
      : `branch ${snapshot.branch}`;
  lines.push(`SonarCloud findings for project ${snapshot.projectKey} on ${axisLabel}${cacheNote}`);
  for (const warning of meta.warnings) {
    lines.push(`! ${warning}`);
  }
  lines.push('');
  if (findings.length === 0) {
    lines.push('(no findings)');
  } else {
    for (const finding of findings) {
      const location = finding.line > 0 ? `${finding.file}:${finding.line}` : finding.file;
      lines.push(`  ${finding.rule}  [${finding.severity}]  ${location}`, `    ${finding.message}`);
    }
  }
  if (snapshot.hotspotsIncluded) {
    appendHotspotSection(lines, hotspots);
  }
  return lines.join('\n');
}

/**
 * Stable JSON envelope. Top-level shape is `{ meta, findings }` regardless
 * of success or transient-error path. When
 * `meta.snapshotInfo.hotspotsIncluded` is true, the envelope additionally
 * carries a top-level `hotspots` array (absent otherwise — the no-flag
 * path stays byte-compatible with consumers written before the hotspot
 * extension). Consumers can `jq '.findings'`, `jq '.hotspots // []'`, or
 * `jq '.meta.warnings'` without conditional logic.
 *
 * `meta.snapshotInfo.pullRequest` is `number | null`: `null` unless
 * `--pull-request=<n>` was passed, the supplied id otherwise.
 * `meta.snapshotInfo.branch` keeps its non-nullable `string` type and
 * holds the resolved current local branch name even under the PR axis.
 *
 * @param {ReadonlyArray<{ rule: string, severity: string, file: string, line: number, message: string, status: string }>} findings
 * @param {{ schemaVersion: number, snapshotInfo: { hotspotsIncluded: boolean, pullRequest: number | null }, warnings: readonly string[] }} meta
 * @param {ReadonlyArray<{ rule: string, file: string, line: number, message: string, vulnerabilityProbability: string, status: string }>} [hotspots]
 * @returns {string} pretty-printed JSON, no trailing newline
 */
export function formatJson(findings, meta, hotspots = []) {
  /** @type {Record<string, unknown>} */
  const envelope = {
    meta,
    findings: findings.map((finding) => ({
      rule: finding.rule,
      severity: finding.severity,
      file: finding.file,
      line: finding.line,
      message: finding.message,
      status: finding.status,
    })),
  };
  if (meta.snapshotInfo.hotspotsIncluded) {
    envelope.hotspots = hotspots.map((hotspot) => ({
      rule: hotspot.rule,
      file: hotspot.file,
      line: hotspot.line,
      message: hotspot.message,
      vulnerabilityProbability: hotspot.vulnerabilityProbability,
      status: hotspot.status,
    }));
  }
  return JSON.stringify(envelope, null, 2);
}

/**
 * Deterministic cache key for a fetch tuple. The `endpoint` discriminator
 * partitions issues and hotspots cache entries under the shared
 * `.sonar-cache/cache.json` file so a hotspot fetch never overwrites an
 * issues entry that happens to share a `(files, pageSize)` tuple.
 *
 * Sort the file list before joining so that two invocations with the same
 * file set in different orders share a cache entry.
 *
 * Key shapes:
 *   - issues:   `'issues::<branchAxis>::<sortedFiles>::<statuses>::<pageSize>'`
 *   - hotspots: `'hotspots::<branchAxis>::<sortedFiles>::<pageSize>'` (no
 *     `statuses` axis — the endpoint accepts no `status=` URL parameter
 *     and the lifecycle filter runs post-fetch).
 *
 * The `branchAxis` argument is required for both endpoints (folded after
 * the endpoint literal, before the per-endpoint segments). The `statuses`
 * argument is required for `endpoint: 'issues'` and ignored for
 * `endpoint: 'hotspots'`.
 *
 * @param {(
 *   | { endpoint: 'issues', branchAxis: BranchAxis, files: readonly string[], statuses?: string, pageSize: number }
 *   | { endpoint: 'hotspots', branchAxis: BranchAxis, files: readonly string[], pageSize: number }
 * )} input
 * @returns {string}
 */
export function cacheKeyOf(input) {
  const sortedFiles = [...input.files].sort((a, b) => a.localeCompare(b));
  const segments = [input.endpoint, formatBranchAxisSegment(input.branchAxis)];
  segments.push(sortedFiles.join('|'));
  if (input.endpoint === 'issues') {
    segments.push(input.statuses ?? '');
  }
  segments.push(String(input.pageSize));
  return segments.join('::');
}

/**
 * TTL check. A cache entry is fresh when its `fetchedAt` timestamp is no
 * older than `ttlMs` relative to `now`. Negative `ttlMs` and missing
 * timestamps fail fresh.
 *
 * @param {{ fetchedAt: number } | null | undefined} cacheEntry
 * @param {number} now - epoch ms
 * @param {number} ttlMs
 * @returns {boolean}
 */
export function isCacheFresh(cacheEntry, now, ttlMs) {
  if (cacheEntry === null || cacheEntry === undefined) return false;
  if (typeof cacheEntry.fetchedAt !== 'number') return false;
  if (ttlMs < 0) return false;
  return now - cacheEntry.fetchedAt <= ttlMs;
}

/**
 * Defensive cache-file parser. Validates both the JSON shape and the
 * embedded `schemaVersion`; the runner uses the tagged result to decide
 * between silent cache miss and a warning-emitting bump-and-discard.
 *
 * Result shape:
 *   `{ ok: true, entries }` — parsed cleanly and the schema version
 *     matches `CACHE_SCHEMA_VERSION`.
 *   `{ ok: false, reason: 'parse-error' }` — JSON.parse threw.
 *   `{ ok: false, reason: 'shape' }` — root is not an object, or the
 *     `entries` field is missing or not an object.
 *   `{ ok: false, reason: 'version-missing' }` — no `schemaVersion`
 *     field; treat as a pre-versioning v0 cache and discard.
 *   `{ ok: false, reason: 'version-mismatch', actualVersion }` —
 *     `schemaVersion` present but unequal to `CACHE_SCHEMA_VERSION`.
 *
 * The cache is best-effort by design (concept § Error contract,
 * "Cache file corrupt" row); every failure path collapses to a fresh
 * fetch on the runner side.
 *
 * @param {string} text - raw file contents
 * @returns {(
 *   | { ok: true, entries: Record<string, { fetchedAt: number, payload: unknown }> }
 *   | { ok: false, reason: 'parse-error' }
 *   | { ok: false, reason: 'shape' }
 *   | { ok: false, reason: 'version-missing' }
 *   | { ok: false, reason: 'version-mismatch', actualVersion: unknown }
 * )}
 */
export function parseCacheEntry(text) {
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, reason: 'parse-error' };
  }
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { ok: false, reason: 'shape' };
  }
  const root = /** @type {Record<string, unknown>} */ (parsed);
  if (!('schemaVersion' in root)) {
    return { ok: false, reason: 'version-missing' };
  }
  if (root.schemaVersion !== CACHE_SCHEMA_VERSION) {
    return { ok: false, reason: 'version-mismatch', actualVersion: root.schemaVersion };
  }
  const entries = root.entries;
  if (entries === null || typeof entries !== 'object' || Array.isArray(entries)) {
    return { ok: false, reason: 'shape' };
  }
  return {
    ok: true,
    entries: /** @type {Record<string, { fetchedAt: number, payload: unknown }>} */ (entries),
  };
}

/**
 * Resolves the seven-row default-input edge-case matrix from the concept
 * doc. Detection runs before the fetch; first matching row wins.
 *
 * Tags returned:
 *   'on-main', 'empty-diff', 'detached-orphan', 'orphan',
 *   'main-missing', 'submodule-stripped', 'rename-tracked',
 *   'deletion-stripped', 'ok'.
 *
 * @param {object} input
 * @param {string} input.branch - resolved branch name or 'detached@<sha>'
 * @param {boolean} input.isDetached
 * @param {boolean} input.mainExists
 * @param {boolean} input.masterExists
 * @param {boolean} input.mergeBaseResolved
 * @param {readonly { status: string, oldPath: string | null, newPath: string, similarityScore: number | null, isSubmodule: boolean }[]} input.diffEntries
 * @returns {{ behaviourTag: string, warnings: string[], files: string[] }}
 */
export function classifyDiffEdgeCase(input) {
  const warnings = [];

  if (!input.mainExists && !input.masterExists) {
    warnings.push(
      'local branch main not found (master also missing); pass --default-branch=<name>, --files, or --all.',
    );
    return { behaviourTag: 'main-missing', warnings, files: [] };
  }

  if (!input.isDetached && input.branch === 'main') {
    warnings.push(
      'current branch is main; git diff main...HEAD is empty by definition. Pass --files <paths> or --all to query.',
    );
    return { behaviourTag: 'on-main', warnings, files: [] };
  }

  if (!input.mergeBaseResolved) {
    if (input.isDetached) {
      warnings.push(
        'no shared ancestor between detached HEAD and main; cannot derive a diff. Pass --files or --all to query.',
      );
      return { behaviourTag: 'detached-orphan', warnings, files: [] };
    }
    warnings.push(
      'no shared ancestor between current branch and main; cannot derive a diff. Pass --files or --all to query.',
    );
    return { behaviourTag: 'orphan', warnings, files: [] };
  }

  const submodulePaths = input.diffEntries
    .filter((entry) => entry.isSubmodule)
    .map((entry) => entry.newPath);
  if (submodulePaths.length > 0) {
    warnings.push(
      `skipping submodule path(s) ${submodulePaths.join(', ')}; SonarCloud findings live in the submodule project, not this one.`,
    );
  }

  const deletionPaths = input.diffEntries
    .filter((entry) => entry.status === 'D')
    .map((entry) => entry.newPath);
  if (deletionPaths.length > 0) {
    warnings.push(
      `dropping deleted path(s) ${deletionPaths.join(', ')} from file set; SonarCloud findings only exist for paths present at last analysis.`,
    );
  }

  const partialRenames = input.diffEntries.filter((entry) => {
    return (
      entry.status === 'R' &&
      entry.oldPath !== null &&
      typeof entry.similarityScore === 'number' &&
      entry.similarityScore < 100
    );
  });
  for (const rename of partialRenames) {
    warnings.push(
      `treating ${rename.newPath} as renamed from ${rename.oldPath ?? ''}; querying SonarCloud for the new path only (Sonar tracks per current path).`,
    );
  }

  const files = input.diffEntries
    .filter((entry) => entry.status !== 'D' && !entry.isSubmodule)
    .map((entry) => entry.newPath);

  if (files.length === 0) {
    warnings.push(
      'no files in branch diff against main; pass --files or --all to query explicitly.',
    );
    return { behaviourTag: 'empty-diff', warnings, files: [] };
  }

  return { behaviourTag: 'ok', warnings, files };
}

/**
 * Renders a human-readable axis label for the branch-not-analysed warning.
 * `pull request #<n>` for the PR axis, `branch '<name>'` for the branch
 * axis, and a generic `the queried branch axis` fallback when no axis was
 * threaded into the classifier (legacy call sites that have not yet been
 * branch-axis-aware migrated).
 *
 * @param {BranchAxis | undefined} branchAxis
 * @returns {string}
 */
function describeBranchAxisForMessage(branchAxis) {
  if (branchAxis === undefined) {
    return 'the queried branch axis';
  }
  if (branchAxis.kind === 'pullRequest') {
    return `pull request #${branchAxis.id}`;
  }
  return `branch '${branchAxis.name}'`;
}

/**
 * Body-shape regexes for the branch-aware 404 row in `classifyHttpError`.
 * SonarCloud returns HTTP 404 for queries against an unanalysed branch (or
 * an unanalysed pull request on hotspots/duplications endpoints) with one of
 * two body shapes: the duplications/measures endpoints emit
 * `errors[].msg = "Component '<key>' on branch '<branch>' not found"`, and
 * the hotspots endpoint emits `errors[].msg = "Project '<key>' doesn't exist"`
 * (the message text is misleading; the project does exist on the default
 * branch but not on the queried axis). Pulled out as module-scope constants
 * so the regex literals are not re-allocated on every call.
 *
 * Captured 2026-05-08 in the feature worktree's
 * `.claude/tmp/sonar-duplications-shape-probe/`. ADR-0046 § Behaviour →
 * Branch-axis fallback semantics records the asymmetry.
 */
const BRANCH_NOT_ANALYSED_PATTERN = /'[^']+'\s+not found/;
const PROJECT_DOESNT_EXIST_PATTERN = /Project '[^']+' doesn't exist/i;

/**
 * Returns `true` when the supplied response body indicates a branch (or a
 * pull request, on hotspots/duplications) has not been analysed by
 * SonarCloud yet. Used by the 404 row to disambiguate "branch not analysed"
 * from "project not found".
 *
 * @param {string | undefined} responseBody
 * @returns {boolean}
 */
function isBranchNotAnalysedBody(responseBody) {
  if (typeof responseBody !== 'string' || responseBody.length === 0) {
    return false;
  }
  return (
    BRANCH_NOT_ANALYSED_PATTERN.test(responseBody) ||
    PROJECT_DOESNT_EXIST_PATTERN.test(responseBody)
  );
}

/**
 * Routes an HTTP-status failure to its (stderr, warning, allowStaleCache)
 * triple. Pulled out of `classifyError` so the parent stays a thin
 * dispatcher and this function holds the HTTP-status branching alone.
 *
 * @param {object} input
 * @param {number | null} input.httpStatus
 * @param {string} input.projectKey
 * @param {boolean} input.tokenSet
 * @param {string} [input.retryAfter]
 * @param {string} [input.responseBody]
 * @param {BranchAxis} [input.branchAxis]
 * @returns {{ stderr: string, warning: string, allowStaleCache: boolean } | null}
 */
function classifyHttpError(input) {
  const status = input.httpStatus;
  if (status === 401 && input.tokenSet) {
    return {
      stderr:
        'SonarCloud rejected the configured SONAR_TOKEN (HTTP 401). Regenerate the token; see DEVELOPMENT.md.',
      warning: 'sonarcloud rejected SONAR_TOKEN (HTTP 401)',
      allowStaleCache: true,
    };
  }
  if (status === 401) {
    return {
      stderr:
        'SONAR_TOKEN not set; SonarCloud rejected the unauthenticated query. Set SONAR_TOKEN in .env.local.',
      warning: 'unauthenticated query rejected (HTTP 401); set SONAR_TOKEN',
      allowStaleCache: true,
    };
  }
  if (status === 403) {
    return {
      stderr: `SonarCloud denied access to project ${input.projectKey} (HTTP 403). Token may lack read scope.`,
      warning: `sonarcloud denied access to ${input.projectKey} (HTTP 403)`,
      allowStaleCache: true,
    };
  }
  if (status === 404 && isBranchNotAnalysedBody(input.responseBody)) {
    const axisLabel = describeBranchAxisForMessage(input.branchAxis);
    return {
      stderr: `SonarCloud reports ${axisLabel} has not been analysed yet (HTTP 404); push the branch and wait for analysis.`,
      warning: `sonarcloud ${axisLabel} not analysed yet (HTTP 404)`,
      allowStaleCache: false,
    };
  }
  if (status === 404) {
    return {
      stderr: `SonarCloud project ${input.projectKey} not found (HTTP 404). Check .sonarlint/connectedMode.json.`,
      warning: `sonarcloud project ${input.projectKey} not found (HTTP 404)`,
      allowStaleCache: false,
    };
  }
  if (status === 429) {
    const retry = input.retryAfter ?? 'unknown';
    return {
      stderr: `SonarCloud rate-limited (HTTP 429); using cached results if available. Retry-After: ${retry}.`,
      warning: `sonarcloud rate-limited (HTTP 429); retry-after ${retry}`,
      allowStaleCache: true,
    };
  }
  if (typeof status === 'number' && status >= 500) {
    return {
      stderr: `SonarCloud server error (HTTP ${status}); using cached results if available.`,
      warning: `sonarcloud server error (HTTP ${status})`,
      allowStaleCache: true,
    };
  }
  return null;
}

/**
 * Resolves the failure-mode matrix from the concept's "Error contract"
 * section. Returns the routing decision used by the CLI runner: stderr
 * line, machine-readable warning, and whether stale cache is acceptable
 * as fallback.
 *
 * The optional `responseBody` and `branchAxis` fields participate in the
 * branch-aware 404 row: an HTTP 404 whose body matches the
 * branch-not-analysed shape (see `isBranchNotAnalysedBody`) routes to a
 * branch-aware warning, with the axis label derived from `branchAxis`.
 * Legacy call sites that pass neither still resolve through the existing
 * 404 → project-not-found arm because the body match short-circuits when
 * `responseBody` is absent.
 *
 * @param {object} input
 * @param {string} input.errorKind - 'http' | 'network' | 'auth-missing'
 * @param {number | null} input.httpStatus
 * @param {string} input.projectKey
 * @param {boolean} input.tokenSet
 * @param {string} [input.retryAfter]
 * @param {string} [input.message]
 * @param {string} [input.responseBody]
 * @param {BranchAxis} [input.branchAxis]
 * @returns {{ stderr: string, warning: string, allowStaleCache: boolean }}
 */
export function classifyError(input) {
  if (input.errorKind === 'http') {
    const httpResult = classifyHttpError(input);
    if (httpResult !== null) return httpResult;
  }
  if (input.errorKind === 'network') {
    const detail = input.message ?? 'unknown';
    return {
      stderr: `Network error reaching sonarcloud.io: ${detail}.`,
      warning: `network error reaching sonarcloud.io: ${detail}`,
      allowStaleCache: true,
    };
  }
  if (input.errorKind === 'auth-missing') {
    return {
      stderr: 'SONAR_TOKEN not set; querying SonarCloud unauthenticated (public-project default).',
      warning: 'unauthenticated query (no SONAR_TOKEN)',
      allowStaleCache: false,
    };
  }
  const detail = input.message ?? 'unspecified';
  return {
    stderr: `Unexpected SonarCloud error: ${detail}.`,
    warning: `unexpected sonarcloud error: ${detail}`,
    allowStaleCache: true,
  };
}
