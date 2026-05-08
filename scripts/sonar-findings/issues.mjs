/**
 * Issues-endpoint surface for the agent-side SonarCloud findings query.
 *
 * What lives here:
 *   - buildIssuesUrl({ baseUrl, projectKey, files, page, pageSize, statuses }):
 *     constructs the `/api/issues/search` URL using the verified-working
 *     `componentKeys=<projectKey>:<filepath>` shape (the older `fileKeys=`
 *     parameter is silently ignored on SonarCloud — see ADR-0042).
 *   - parseIssuesResponse(payload): pulls each issue's required fields from
 *     the API response; tolerates absent optional fields; throws on absent
 *     `issues` array.
 *   - mapIssueToFinding(issue, projectKey): single-entry mapper. Returns
 *     `null` when the entry is not an object so the caller can filter.
 *
 * What does NOT live here:
 *   - Shared infrastructure (cache helpers, error classifier, formatters,
 *     `compareFindings`, `parseConnectedMode`, etc.) stays in `query.mjs`
 *     so multiple endpoint modules can reuse it without circular imports.
 *   - I/O (spawnSync, fetch, fs, console, process.exit). Those stay in the
 *     entry script `scripts/check-sonar-findings.mjs` so this module is
 *     unit-testable without filesystem, subprocess, or network access.
 *
 * Imported by:
 *   - scripts/check-sonar-findings.mjs (CLI runner)
 *   - scripts/sonar-findings/issues.test.mjs (unit tests)
 */

import { compareFindings, SONARCLOUD_BASE_URL, stripComponentPrefix } from './query.mjs';

/**
 * Default page size for the `/api/issues/search` endpoint. Mirrors
 * `DEFAULT_HOTSPOTS_PAGE_SIZE` for the hotspots endpoint; kept as a separate
 * declaration so the two endpoints can diverge on this axis without
 * rippling through the issues-path call sites.
 */
export const DEFAULT_ISSUES_PAGE_SIZE = 500;

export const DEFAULT_STATUSES = 'OPEN,CONFIRMED,REOPENED';

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
  const pageSize = input.pageSize ?? DEFAULT_ISSUES_PAGE_SIZE;
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
 * Projects a single raw SonarCloud issue object to the normalised finding
 * shape, or returns `null` when the entry is not an object. Splitting this
 * out keeps `parseIssuesResponse` below the cognitive-complexity ceiling
 * and lets the loop body read as a straight map+filter.
 *
 * @param {unknown} issue - one element of the API's `issues` array
 * @param {string} projectKey - used to strip the component prefix
 * @returns {{ rule: string, severity: string, file: string, line: number, message: string, status: string } | null}
 */
export function mapIssueToFinding(issue, projectKey) {
  if (issue === null || typeof issue !== 'object') {
    return null;
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
  return { rule, severity, file, line, message, status };
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
    throw new TypeError('SonarCloud response is missing the issues array');
  }
  const projectKey = options.projectKey ?? '';
  const findings = [];
  for (const issue of issues) {
    const finding = mapIssueToFinding(issue, projectKey);
    if (finding !== null) {
      findings.push(finding);
    }
  }
  findings.sort(compareFindings);
  return findings;
}
