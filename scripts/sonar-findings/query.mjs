/**
 * Pure-logic library for the agent-side SonarCloud findings query script.
 *
 * What lives here:
 *   - parseConnectedMode(json): extracts org+projectKey from
 *     `.sonarlint/connectedMode.json`, throws on missing fields.
 *   - buildIssuesUrl({ baseUrl, projectKey, files, page, pageSize, statuses }):
 *     constructs the `/api/issues/search` URL using the verified-working
 *     `componentKeys=<projectKey>:<filepath>` shape (the older `fileKeys=`
 *     parameter is silently ignored on SonarCloud — see ADR-0042).
 *   - parseIssuesResponse(payload): pulls each issue's required fields from
 *     the API response; tolerates absent optional fields; throws on absent
 *     `issues` array.
 *   - formatPretty(issues, meta): pretty-printed table with deterministic
 *     sort `(file, line, rule)`; banner names the analysis basis.
 *   - formatJson(issues, meta): stable envelope `{ meta, findings }` with
 *     sorted top-level keys; identical shape on success and transient-error
 *     paths so consumers can `jq '.findings'` without conditional logic.
 *   - cacheKeyOf({ files, statuses, pageSize }): pure hash of inputs;
 *     deterministic; collision-resistant via separator.
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
 *   - I/O (spawnSync, fetch, fs, console, process.exit). Those stay in the
 *     entry script `scripts/check-sonar-findings.mjs` so this module is
 *     unit-testable without filesystem, subprocess, or network access.
 *
 * Imported by:
 *   - scripts/check-sonar-findings.mjs (CLI runner)
 *   - scripts/sonar-findings/query.test.mjs (unit tests)
 */

export const SONARCLOUD_BASE_URL = 'https://sonarcloud.io';
export const DEFAULT_PAGE_SIZE = 500;
export const DEFAULT_STATUSES = 'OPEN,CONFIRMED,REOPENED';
export const DEFAULT_CACHE_TTL_MS = 5 * 60 * 1000;
export const SCHEMA_VERSION = 1;

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

/**
 * Constructs the `/api/issues/search` URL for SonarCloud. Uses the
 * verified-working `componentKeys=<projectKey>:<filepath>` shape; the
 * older `fileKeys=` parameter is silently ignored on SonarCloud and is
 * not used here (see ADR-0042 risk-mitigation note).
 *
 * @param {object} input
 * @param {string} [input.baseUrl] - defaults to SONARCLOUD_BASE_URL
 * @param {string} input.projectKey
 * @param {readonly string[]} [input.files] - relative paths; empty list
 *   queries the whole project
 * @param {number} [input.page] - 1-based page index
 * @param {number} [input.pageSize] - issues per page
 * @param {string} [input.statuses] - comma-separated SonarCloud statuses
 * @returns {string} fully encoded URL
 */
export function buildIssuesUrl(input) {
  const baseUrl = input.baseUrl ?? SONARCLOUD_BASE_URL;
  const page = input.page ?? 1;
  const pageSize = input.pageSize ?? DEFAULT_PAGE_SIZE;
  const statuses = input.statuses ?? DEFAULT_STATUSES;
  const params = new URLSearchParams();
  if (Array.isArray(input.files) && input.files.length > 0) {
    const componentKeys = input.files.map((file) => `${input.projectKey}:${file}`).join(',');
    params.set('componentKeys', componentKeys);
  } else {
    params.set('componentKeys', input.projectKey);
  }
  params.set('p', String(page));
  params.set('ps', String(pageSize));
  params.set('statuses', statuses);
  return `${baseUrl}/api/issues/search?${params.toString()}`;
}

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
function stripComponentPrefix(component, projectKey) {
  const prefix = `${projectKey}:`;
  if (component.startsWith(prefix)) {
    return component.slice(prefix.length);
  }
  return component;
}

/**
 * Parses the SonarCloud `/api/issues/search` response into the normalised
 * findings array consumed by the formatters. Tolerates absence of optional
 * fields (`impacts`, `cleanCodeAttribute`, `effort`); throws when the
 * required `issues` array is absent — that signals a structural API
 * change the parser cannot handle.
 *
 * @param {unknown} payload - the parsed JSON response
 * @param {object} [options]
 * @param {string} [options.projectKey] - used to strip the component prefix
 * @returns {Array<{ rule: string, severity: string, file: string, line: number, message: string, status: string }>}
 */
export function parseIssuesResponse(payload, options = {}) {
  if (payload === null || typeof payload !== 'object') {
    throw new Error('SonarCloud response is not an object');
  }
  const issues = /** @type {Record<string, unknown>} */ (payload).issues;
  if (!Array.isArray(issues)) {
    throw new Error('SonarCloud response is missing the issues array');
  }
  const projectKey = options.projectKey ?? '';
  const findings = [];
  for (const issue of issues) {
    if (issue === null || typeof issue !== 'object') {
      continue;
    }
    const record = /** @type {Record<string, unknown>} */ (issue);
    const rule = typeof record.rule === 'string' ? record.rule : '';
    const severity = typeof record.severity === 'string' ? record.severity : 'UNKNOWN';
    const componentRaw = typeof record.component === 'string' ? record.component : '';
    const file = stripComponentPrefix(componentRaw, projectKey);
    const lineRaw = record.line;
    const line = typeof lineRaw === 'number' && Number.isFinite(lineRaw) ? lineRaw : 0;
    const message = typeof record.message === 'string' ? record.message : '';
    const status = typeof record.status === 'string' ? record.status : 'UNKNOWN';
    findings.push({ rule, severity, file, line, message, status });
  }
  findings.sort((a, b) => {
    const fileCmp = a.file.localeCompare(b.file);
    if (fileCmp !== 0) return fileCmp;
    if (a.line !== b.line) return a.line - b.line;
    return a.rule.localeCompare(b.rule);
  });
  return findings;
}

/**
 * Builds the `meta` block for the JSON envelope and pretty banner. The
 * shape is pinned in the concept's "Error contract" section: schema
 * version, snapshot info, warnings array. Identical on success and
 * transient-error paths so machine consumers parse one shape regardless
 * of outcome.
 *
 * @param {object} input
 * @param {string} input.projectKey
 * @param {string} input.branch
 * @param {string | null} input.analysisTimestamp
 * @param {string} input.queryTimestamp
 * @param {boolean} input.fromCache
 * @param {number | null} input.cacheAgeSeconds
 * @param {readonly string[]} input.warnings
 * @returns {{ schemaVersion: number, snapshotInfo: object, warnings: string[] }}
 */
export function buildMeta(input) {
  return {
    schemaVersion: SCHEMA_VERSION,
    snapshotInfo: {
      projectKey: input.projectKey,
      branch: input.branch,
      analysisTimestamp: input.analysisTimestamp,
      queryTimestamp: input.queryTimestamp,
      fromCache: input.fromCache,
      cacheAgeSeconds: input.cacheAgeSeconds,
    },
    warnings: [...input.warnings],
  };
}

/**
 * Pretty-printer for the human-readable path. Emits a two-line banner
 * naming the analysis basis (so the snapshot-vs-live distinction is
 * visible on every run) followed by either an "(no findings)" line or a
 * findings table sorted by `(file, line, rule)`.
 *
 * @param {ReadonlyArray<{ rule: string, severity: string, file: string, line: number, message: string, status: string }>} findings
 * @param {{ schemaVersion: number, snapshotInfo: { projectKey: string, branch: string, analysisTimestamp: string | null, queryTimestamp: string, fromCache: boolean, cacheAgeSeconds: number | null }, warnings: readonly string[] }} meta
 * @returns {string}
 */
export function formatPretty(findings, meta) {
  const lines = [];
  const snapshot = meta.snapshotInfo;
  const analysis = snapshot.analysisTimestamp ?? 'unknown';
  lines.push(`SonarCloud findings for project ${snapshot.projectKey} on branch ${snapshot.branch}`);
  const cacheNote = snapshot.fromCache ? ` (cached, ${snapshot.cacheAgeSeconds ?? 0}s old)` : '';
  lines.push(`findings as of last analysis at ${analysis}${cacheNote}`);
  for (const warning of meta.warnings) {
    lines.push(`! ${warning}`);
  }
  lines.push('');
  if (findings.length === 0) {
    lines.push('(no findings)');
    return lines.join('\n');
  }
  for (const finding of findings) {
    const location = finding.line > 0 ? `${finding.file}:${finding.line}` : finding.file;
    lines.push(`  ${finding.rule}  [${finding.severity}]  ${location}`);
    lines.push(`    ${finding.message}`);
  }
  return lines.join('\n');
}

/**
 * Stable JSON envelope. Top-level shape is `{ meta, findings }` regardless
 * of success or transient-error path. Consumers can `jq '.findings'` or
 * `jq '.meta.warnings'` without conditional logic.
 *
 * @param {ReadonlyArray<{ rule: string, severity: string, file: string, line: number, message: string, status: string }>} findings
 * @param {{ schemaVersion: number, snapshotInfo: object, warnings: readonly string[] }} meta
 * @returns {string} pretty-printed JSON, no trailing newline
 */
export function formatJson(findings, meta) {
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
  return JSON.stringify(envelope, null, 2);
}

/**
 * Deterministic cache key for `(componentKeys, statuses, pageSize)` tuple.
 * Sort the file list before joining so that two invocations with the same
 * file set in different orders share a cache entry.
 *
 * @param {{ files: readonly string[], statuses: string, pageSize: number }} input
 * @returns {string}
 */
export function cacheKeyOf(input) {
  const sortedFiles = [...input.files].sort((a, b) => a.localeCompare(b));
  return [sortedFiles.join('|'), input.statuses, String(input.pageSize)].join('::');
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
 * Defensive cache-file parser. Returns `null` on JSON-parse error so the
 * CLI runner falls through to a fresh fetch (concept § Error contract,
 * "Cache file corrupt" row). Returns `null` for non-object payloads as
 * well, since the cache schema is an object keyed by cacheKeyOf.
 *
 * @param {string} text - raw file contents
 * @returns {Record<string, { fetchedAt: number, payload: unknown }> | null}
 */
export function parseCacheEntry(text) {
  try {
    const parsed = JSON.parse(text);
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return null;
    }
    return /** @type {Record<string, { fetchedAt: number, payload: unknown }>} */ (parsed);
  } catch {
    return null;
  }
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
 * Resolves the failure-mode matrix from the concept's "Error contract"
 * section. Returns the routing decision used by the CLI runner: stderr
 * line, machine-readable warning, and whether stale cache is acceptable
 * as fallback.
 *
 * @param {object} input
 * @param {string} input.errorKind - 'http' | 'network' | 'auth-missing'
 * @param {number | null} input.httpStatus
 * @param {string} input.projectKey
 * @param {boolean} input.tokenSet
 * @param {string} [input.retryAfter]
 * @param {string} [input.message]
 * @returns {{ stderr: string, warning: string, allowStaleCache: boolean }}
 */
export function classifyError(input) {
  const status = input.httpStatus;
  if (input.errorKind === 'http' && status === 401) {
    if (input.tokenSet) {
      return {
        stderr:
          'SonarCloud rejected the configured SONAR_TOKEN (HTTP 401). Regenerate the token; see DEVELOPMENT.md.',
        warning: 'sonarcloud rejected SONAR_TOKEN (HTTP 401)',
        allowStaleCache: true,
      };
    }
    return {
      stderr:
        'SONAR_TOKEN not set; SonarCloud rejected the unauthenticated query. Set SONAR_TOKEN in .env.local.',
      warning: 'unauthenticated query rejected (HTTP 401); set SONAR_TOKEN',
      allowStaleCache: true,
    };
  }
  if (input.errorKind === 'http' && status === 403) {
    return {
      stderr: `SonarCloud denied access to project ${input.projectKey} (HTTP 403). Token may lack read scope.`,
      warning: `sonarcloud denied access to ${input.projectKey} (HTTP 403)`,
      allowStaleCache: true,
    };
  }
  if (input.errorKind === 'http' && status === 404) {
    return {
      stderr: `SonarCloud project ${input.projectKey} not found (HTTP 404). Check .sonarlint/connectedMode.json.`,
      warning: `sonarcloud project ${input.projectKey} not found (HTTP 404)`,
      allowStaleCache: false,
    };
  }
  if (input.errorKind === 'http' && status === 429) {
    const retry = input.retryAfter ?? 'unknown';
    return {
      stderr: `SonarCloud rate-limited (HTTP 429); using cached results if available. Retry-After: ${retry}.`,
      warning: `sonarcloud rate-limited (HTTP 429); retry-after ${retry}`,
      allowStaleCache: true,
    };
  }
  if (input.errorKind === 'http' && typeof status === 'number' && status >= 500) {
    return {
      stderr: `SonarCloud server error (HTTP ${status}); using cached results if available.`,
      warning: `sonarcloud server error (HTTP ${status})`,
      allowStaleCache: true,
    };
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
