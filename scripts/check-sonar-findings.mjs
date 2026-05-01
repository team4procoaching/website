/**
 * CLI runner for the agent-side SonarCloud findings query.
 *
 * What this script does:
 *   Queries SonarCloud's public REST API (`/api/issues/search`) for findings
 *   on a defined file set, prints them in a human-readable table by default
 *   (or stable JSON when `--json` is passed), and exits informationally.
 *
 * What this script does NOT do:
 *   Predict findings on unpushed code. The output reflects SonarCloud's
 *   view of the last analysed branch state. The on-screen banner names the
 *   analysis basis on every run so the snapshot-vs-live distinction is
 *   visible. See docs/adr/0042-agent-side-sonarcloud-findings-query.md.
 *
 * Why this exists:
 *   ADR-0041 closed the local-prevention question for the human-in-VS-Code
 *   persona via SonarLint Connected Mode. ADR-0042 closes the equivalent
 *   gap for automated contributors who do not run VS Code: a scriptable
 *   per-file lookup that any pnpm/agent context can invoke.
 *
 * Usage:
 *   pnpm check:sonar-findings
 *   pnpm check:sonar-findings --files src/foo.ts,src/bar.ts
 *   pnpm check:sonar-findings --all
 *   pnpm check:sonar-findings --json
 *
 * Exit codes (per concept § Error contract):
 *   0 — every successful or transient-failure path (the script is a lookup,
 *       not a build gate; agent quality chains stay green on outages).
 *   1 — local-runtime fatal (malformed connectedMode.json, no git binary,
 *       file-system permission errors).
 *   2 — caller error (unknown CLI flag, conflicting flags).
 *
 * Layout:
 *   The pure-logic surface (URL builder, response parser, output formatters,
 *   cache helpers, edge-case classifier, error classifier) lives in
 *   `./sonar-findings/query.mjs` so it can be unit-tested without
 *   filesystem, subprocess, or network access. This file keeps the I/O
 *   wiring (argv parsing, git context, fetch, cache read/write, exit-code
 *   routing).
 */

import { spawnSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

import {
  buildIssuesUrl,
  buildMeta,
  CACHE_SCHEMA_VERSION,
  cacheKeyOf,
  classifyDiffEdgeCase,
  classifyError,
  DEFAULT_CACHE_TTL_MS,
  DEFAULT_PAGE_SIZE,
  DEFAULT_STATUSES,
  formatJson,
  formatPretty,
  isCacheFresh,
  parseCacheEntry,
  parseConnectedMode,
  parseIssuesResponse,
  SONARCLOUD_BASE_URL,
} from './sonar-findings/query.mjs';

const CONNECTED_MODE_PATH = '.sonarlint/connectedMode.json';
const CACHE_DIR = '.sonar-cache';
const CACHE_FILE = join(CACHE_DIR, 'cache.json');

// ---------------------------------------------------------------------------
// Argv parser
// ---------------------------------------------------------------------------

/**
 * Splits a comma-separated list literal into the trimmed file paths the
 * `--files` flag accepts. Empty segments are dropped so trailing commas do
 * not introduce phantom paths. Pulled out to keep `applyBooleanOrValueArg`
 * and `applyInlineFlag` below the cognitive-complexity ceiling.
 *
 * @param {string} raw
 * @returns {string[]}
 */
function splitFileList(raw) {
  return raw.split(',').filter((file) => file.length > 0);
}

/**
 * Handles the `--key=value` flag family (`--files=`, `--cache-ttl-seconds=`,
 * `--default-branch=`). Returns `{ matched: true, ok }` on a recognised key
 * (with `ok: false, message` on a malformed value), or
 * `{ matched: false }` so the caller can fall through to other handlers.
 *
 * @param {string} arg
 * @param {{ files: string[] | null, cacheTtlMs: number, defaultBranch: string | undefined }} options
 * @returns {{ matched: true, ok: true } | { matched: true, ok: false, message: string } | { matched: false }}
 */
function applyInlineFlag(arg, options) {
  if (arg.startsWith('--files=')) {
    options.files = splitFileList(arg.slice('--files='.length));
    return { matched: true, ok: true };
  }
  if (arg.startsWith('--cache-ttl-seconds=')) {
    const seconds = Number(arg.slice('--cache-ttl-seconds='.length));
    if (!Number.isFinite(seconds) || seconds < 0) {
      return {
        matched: true,
        ok: false,
        message: '--cache-ttl-seconds expects a non-negative number',
      };
    }
    options.cacheTtlMs = seconds * 1000;
    return { matched: true, ok: true };
  }
  if (arg.startsWith('--default-branch=')) {
    options.defaultBranch = arg.slice('--default-branch='.length);
    return { matched: true, ok: true };
  }
  return { matched: false };
}

/**
 * Handles the boolean-flag and `--files <value>` families. Returns the
 * number of argv slots consumed on success, a `help: true` signal for the
 * help flags, an `error: <message>` for malformed `--files`, or
 * `unmatched: true` so the caller can fall through to inline-flag
 * handling.
 *
 * @param {string} arg
 * @param {readonly string[]} argv
 * @param {number} i
 * @param {{ files: string[] | null, all: boolean, json: boolean, noCache: boolean }} options
 * @returns {{ advance: number } | { help: true } | { error: string } | { unmatched: true }}
 */
function applyBooleanOrValueArg(arg, argv, i, options) {
  if (arg === '--json') {
    options.json = true;
    return { advance: 1 };
  }
  if (arg === '--all') {
    options.all = true;
    return { advance: 1 };
  }
  if (arg === '--no-cache') {
    options.noCache = true;
    return { advance: 1 };
  }
  if (arg === '--help' || arg === '-h') {
    return { help: true };
  }
  if (arg === '--files') {
    const next = argv[i + 1];
    if (next === undefined) {
      return { error: '--files requires a comma-separated list of paths' };
    }
    options.files = splitFileList(next);
    return { advance: 2 };
  }
  return { unmatched: true };
}

/**
 * Parses CLI flags. Returns `{ ok: true, options }` on success or
 * `{ ok: false, message }` on a caller error (unknown flag, conflicting
 * flags). Pure with respect to side effects so the caller decides how to
 * report.
 */
function parseArgs(argv) {
  const options = {
    files: null,
    all: false,
    json: false,
    noCache: false,
    cacheTtlMs: DEFAULT_CACHE_TTL_MS,
    // Initialised as `undefined` (not `null`) so that an unset flag
    // lets `collectGitContext`'s default-parameter syntax provide the
    // 'main' fallback without an explicit null-coalesce in the body.
    defaultBranch: undefined,
  };
  for (let i = 0; i < argv.length; ) {
    const arg = argv[i];
    const primary = applyBooleanOrValueArg(arg, argv, i, options);
    if ('help' in primary) {
      return { ok: false, help: true };
    }
    if ('error' in primary) {
      return { ok: false, message: primary.error };
    }
    if ('advance' in primary) {
      i += primary.advance;
      continue;
    }
    const inline = applyInlineFlag(arg, options);
    if (inline.matched) {
      if (!inline.ok) return { ok: false, message: inline.message };
      i += 1;
      continue;
    }
    return { ok: false, message: `unknown flag ${arg}` };
  }
  if (options.all && options.files !== null) {
    return { ok: false, message: '--all and --files are mutually exclusive' };
  }
  return { ok: true, options };
}

const HELP_TEXT = `Usage: pnpm check:sonar-findings [options]

Queries SonarCloud for findings on the files this branch has touched
since branching off main.

Options:
  --files <a,b,c>            comma-separated list of paths (overrides default)
  --all                      query the whole project (mutually exclusive with --files)
  --json                     emit a stable JSON envelope on stdout
  --no-cache                 bypass the .sonar-cache TTL cache
  --cache-ttl-seconds=N      override the cache TTL (default 300)
  --default-branch=<name>    diff basis when 'main' is missing locally
  --help, -h                 show this help

Exit codes:
  0  every successful or transient-failure path
  1  local-runtime fatal (malformed connectedMode.json, file-system error)
  2  caller error (unknown flag, conflicting flags)
`;

// ---------------------------------------------------------------------------
// Git context
// ---------------------------------------------------------------------------

function runGit(args) {
  const result = spawnSync('git', args, {
    encoding: 'utf-8',
    shell: false,
    // SonarCloud S4036: explicit PATH inheritance documents that the
    // PATH used to resolve `git` is the operator's own. The script
    // runs locally on developer machines; no untrusted-input path
    // mutates PATH between process start and spawn. A hardened PATH
    // (e.g. `/usr/bin:/bin`) would break Windows and macOS dev setups
    // where git lives elsewhere; absolute-path lookup would still go
    // through PATH for the lookup itself.
    env: { ...process.env, PATH: process.env.PATH },
  });
  if (result.error) {
    return { exitCode: -1, stdout: '', stderr: result.error.message };
  }
  return {
    exitCode: typeof result.status === 'number' ? result.status : -1,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
  };
}

function refExists(ref) {
  return runGit(['rev-parse', '--verify', '--quiet', ref]).exitCode === 0;
}

function currentBranch() {
  const symbolic = runGit(['symbolic-ref', '-q', '--short', 'HEAD']);
  if (symbolic.exitCode === 0) {
    return { isDetached: false, branch: symbolic.stdout.trim() };
  }
  const sha = runGit(['rev-parse', '--short', 'HEAD']);
  const fragment = sha.exitCode === 0 ? sha.stdout.trim() : 'unknown';
  return { isDetached: true, branch: `detached@${fragment}` };
}

function parseDiffNameStatus(stdout) {
  const lines = stdout.split('\n').filter((line) => line.length > 0);
  const entries = [];
  for (const line of lines) {
    const parts = line.split('\t');
    const code = parts[0] ?? '';
    if (code.startsWith('R') && parts.length >= 3) {
      const score = Number(code.slice(1));
      entries.push({
        status: 'R',
        oldPath: parts[1],
        newPath: parts[2],
        similarityScore: Number.isFinite(score) ? score : null,
        isSubmodule: false,
      });
      continue;
    }
    if (code === 'D' && parts.length >= 2) {
      entries.push({
        status: 'D',
        oldPath: null,
        newPath: parts[1],
        similarityScore: null,
        isSubmodule: false,
      });
      continue;
    }
    if (parts.length >= 2) {
      entries.push({
        status: code,
        oldPath: null,
        newPath: parts[1],
        similarityScore: null,
        isSubmodule: false,
      });
    }
  }
  return entries;
}

function readSubmodulePaths() {
  const result = runGit([
    'config',
    '-f',
    '.gitmodules',
    '--get-regexp',
    String.raw`submodule\..*\.path`,
  ]);
  if (result.exitCode !== 0) return new Set();
  const paths = new Set();
  for (const line of result.stdout.split('\n')) {
    const trimmed = line.trim();
    if (trimmed.length === 0) continue;
    const parts = trimmed.split(/\s+/);
    const last = parts.at(-1);
    if (typeof last === 'string' && last.length > 0) {
      paths.add(last);
    }
  }
  return paths;
}

function collectGitContext(branchInfo, defaultBranchOverride = 'main') {
  const mainExists = refExists(`refs/heads/${defaultBranchOverride}`);
  const masterExists = mainExists ? false : refExists('refs/heads/master');
  let baseBranch = null;
  if (mainExists) {
    baseBranch = defaultBranchOverride;
  } else if (masterExists) {
    baseBranch = 'master';
  }
  let mergeBaseResolved = false;
  if (baseBranch !== null) {
    const mergeBase = runGit(['merge-base', baseBranch, 'HEAD']);
    mergeBaseResolved = mergeBase.exitCode === 0 && mergeBase.stdout.trim().length > 0;
  }
  let diffEntries = [];
  if (baseBranch !== null && mergeBaseResolved && branchInfo.branch !== baseBranch) {
    const diff = runGit(['diff', '--name-status', '-M', `${baseBranch}...HEAD`]);
    if (diff.exitCode === 0) {
      const submodulePaths = readSubmodulePaths();
      diffEntries = parseDiffNameStatus(diff.stdout).map((entry) => ({
        ...entry,
        isSubmodule: submodulePaths.has(entry.newPath),
      }));
    }
  }
  return {
    branch: branchInfo.branch,
    isDetached: branchInfo.isDetached,
    mainExists,
    masterExists,
    mergeBaseResolved,
    diffEntries,
  };
}

// ---------------------------------------------------------------------------
// Cache I/O
// ---------------------------------------------------------------------------

/**
 * Reads the on-disk cache file, validates its schema version, and returns
 * the parsed entries map plus any warnings to surface to the caller.
 *
 * Failure handling:
 *   - ENOENT (no cache yet) → silent miss (`entries: null`, no warnings).
 *   - Other read errors → push a `cache read failed: <message>` warning so
 *     a permission problem does not vanish into a "no cache" rebrand.
 *   - JSON parse / shape errors → silent miss (the file is disposable).
 *   - Schema-version mismatch / missing → bump-and-discard with a warning
 *     so a future shape change is visible on the first run after the bump.
 *
 * @returns {Promise<{ entries: Record<string, { fetchedAt: number, payload: unknown }> | null, warnings: string[] }>}
 */
async function readCache() {
  let text;
  try {
    text = await readFile(CACHE_FILE, 'utf-8');
  } catch (error) {
    if (error !== null && typeof error === 'object' && error.code === 'ENOENT') {
      return { entries: null, warnings: [] };
    }
    const message = error instanceof Error ? error.message : String(error);
    return { entries: null, warnings: [`cache read failed: ${message}`] };
  }
  const parsed = parseCacheEntry(text);
  if (parsed.ok) {
    return { entries: parsed.entries, warnings: [] };
  }
  if (parsed.reason === 'version-mismatch' || parsed.reason === 'version-missing') {
    const actual = parsed.reason === 'version-mismatch' ? String(parsed.actualVersion) : 'none';
    return {
      entries: null,
      warnings: [
        `cache schema mismatch (expected v${CACHE_SCHEMA_VERSION}, got v${actual}); discarding`,
      ],
    };
  }
  return { entries: null, warnings: [] };
}

async function writeCache(entries) {
  await mkdir(dirname(CACHE_FILE), { recursive: true });
  const wrapped = { schemaVersion: CACHE_SCHEMA_VERSION, entries };
  await writeFile(CACHE_FILE, JSON.stringify(wrapped, null, 2), 'utf-8');
}

// ---------------------------------------------------------------------------
// Fetch wrapper
// ---------------------------------------------------------------------------

async function fetchIssues(url, token) {
  const headers = { Accept: 'application/json' };
  if (typeof token === 'string' && token.length > 0) {
    headers.Authorization = `Bearer ${token}`;
  }
  let response;
  try {
    response = await fetch(url, { headers });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { kind: 'network', message };
  }
  if (!response.ok) {
    const retryAfter = response.headers.get('retry-after') ?? undefined;
    return { kind: 'http', status: response.status, retryAfter };
  }
  try {
    const payload = await response.json();
    return { kind: 'ok', payload };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { kind: 'network', message: `response body parse error: ${message}` };
  }
}

// ---------------------------------------------------------------------------
// Output writers
// ---------------------------------------------------------------------------

function writeOutput(findings, meta, json) {
  if (json) {
    process.stdout.write(`${formatJson(findings, meta)}\n`);
    return;
  }
  process.stdout.write(`${formatPretty(findings, meta)}\n`);
}

function writeStderrLine(message) {
  if (message.length === 0) return;
  process.stderr.write(`${message}\n`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

/**
 * Reads `.sonarlint/connectedMode.json` and returns the project key. On
 * any read or parse failure, writes the diagnostic to stderr and returns
 * `{ exitCode: 1 }` so the caller can return without further branching.
 *
 * @returns {Promise<{ projectKey: string } | { exitCode: number }>}
 */
async function loadConnectedModeProjectKey() {
  try {
    const text = await readFile(CONNECTED_MODE_PATH, 'utf-8');
    const parsedJson = JSON.parse(text);
    const connectedMode = parseConnectedMode(parsedJson);
    return { projectKey: connectedMode.projectKey };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    writeStderrLine(`${CONNECTED_MODE_PATH}: ${message}`);
    return { exitCode: 1 };
  }
}

/**
 * Resolves the file set under one of three modes: `--all` (whole project),
 * explicit `--files`, or git-derived diff against the default branch. The
 * git-derived branch may classify as an "empty-diff family" edge case, in
 * which case the caller skips the API entirely.
 *
 * @param {{ all: boolean, files: string[] | null, defaultBranch: string | undefined }} options
 * @param {{ branch: string, isDetached: boolean }} branchInfo
 * @param {string[]} warnings - mutated in place with edge-case warnings
 * @returns {{ files: readonly string[], skipApi: boolean }}
 */
function resolveFileSet(options, branchInfo, warnings) {
  if (options.all) {
    return { files: [], skipApi: false };
  }
  if (Array.isArray(options.files)) {
    return { files: options.files, skipApi: false };
  }
  const gitContext = collectGitContext(branchInfo, options.defaultBranch);
  const classification = classifyDiffEdgeCase(gitContext);
  warnings.push(...classification.warnings);
  return {
    files: classification.files,
    skipApi: classification.behaviourTag !== 'ok',
  };
}

/**
 * Reads the on-disk cache and pushes any read warnings to `warnings` (and
 * mirrors them to stderr). Returns the parsed entries map plus the entry
 * for `cacheKey`, both nullable.
 *
 * @param {{ noCache: boolean }} options
 * @param {string} cacheKey
 * @param {string[]} warnings - mutated in place
 * @returns {Promise<{ cacheEntries: Record<string, { fetchedAt: number, payload: unknown }> | null, cachedEntry: { fetchedAt: number, payload: unknown } | null }>}
 */
async function loadCacheEntries(options, cacheKey, warnings) {
  if (options.noCache) {
    return { cacheEntries: null, cachedEntry: null };
  }
  const cacheRead = await readCache();
  warnings.push(...cacheRead.warnings);
  for (const warning of cacheRead.warnings) {
    writeStderrLine(warning);
  }
  const cacheEntries = cacheRead.entries;
  const cachedEntry = cacheEntries === null ? null : (cacheEntries[cacheKey] ?? null);
  return { cacheEntries, cachedEntry };
}

/**
 * Persists a fresh fetch payload into the cache. A write failure becomes a
 * warning (best-effort cache; concept § Error contract) and is never fatal.
 *
 * @param {Record<string, { fetchedAt: number, payload: unknown }> | null} cacheEntries
 * @param {string} cacheKey
 * @param {number} now
 * @param {unknown} payload
 * @param {string[]} warnings - mutated in place on failure
 */
async function persistCacheEntry(cacheEntries, cacheKey, now, payload, warnings) {
  const nextEntries = cacheEntries ?? {};
  nextEntries[cacheKey] = { fetchedAt: now, payload };
  try {
    await writeCache(nextEntries);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    warnings.push(`cache write failed: ${message}`);
  }
}

/**
 * Routes a transient `fetchResult.kind !== 'ok'` outcome to the matching
 * `classifyError` triple. Pulled out so `main` does not have to re-derive
 * the optional fields inline.
 *
 * @param {{ kind: string, status?: number, retryAfter?: string, message?: string }} fetchResult
 * @param {string} projectKey
 * @param {boolean} tokenSet
 * @returns {{ stderr: string, warning: string, allowStaleCache: boolean }}
 */
function classifyTransientFailure(fetchResult, projectKey, tokenSet) {
  return classifyError({
    errorKind: fetchResult.kind,
    httpStatus: fetchResult.kind === 'http' ? (fetchResult.status ?? null) : null,
    projectKey,
    tokenSet,
    retryAfter: fetchResult.kind === 'http' ? fetchResult.retryAfter : undefined,
    message: fetchResult.kind === 'network' ? fetchResult.message : undefined,
  });
}

/**
 * Emits a successful (cached or fresh) findings result to the configured
 * channel. Encapsulated so the various early-return paths in `main` do
 * not duplicate the buildMeta+writeOutput pair.
 *
 * @param {object} input
 * @param {ReadonlyArray<{ rule: string, severity: string, file: string, line: number, message: string, status: string }>} input.findings
 * @param {string} input.projectKey
 * @param {string} input.branch
 * @param {string} input.queryTimestamp
 * @param {boolean} input.fromCache
 * @param {number | null} input.cacheAgeSeconds
 * @param {readonly string[]} input.warnings
 * @param {boolean} input.json
 */
function emitResult(input) {
  const meta = buildMeta({
    projectKey: input.projectKey,
    branch: input.branch,
    queryTimestamp: input.queryTimestamp,
    fromCache: input.fromCache,
    cacheAgeSeconds: input.cacheAgeSeconds,
    warnings: input.warnings,
  });
  writeOutput(input.findings, meta, input.json);
}

async function main() {
  const parsed = parseArgs(process.argv.slice(2));
  if (!parsed.ok) {
    if (parsed.help) {
      process.stdout.write(HELP_TEXT);
      return 0;
    }
    process.stderr.write(`${parsed.message}\n`);
    return 2;
  }
  const options = parsed.options;

  const connectedMode = await loadConnectedModeProjectKey();
  if ('exitCode' in connectedMode) return connectedMode.exitCode;
  const { projectKey } = connectedMode;

  const queryTimestamp = new Date().toISOString();
  // Resolve the branch name once so the edge-case path and the happy-path
  // share a single source of truth.
  const branchInfo = currentBranch();
  const branchName = branchInfo.branch;
  const warnings = [];

  const fileSet = resolveFileSet(options, branchInfo, warnings);
  if (fileSet.skipApi) {
    for (const warning of warnings) {
      writeStderrLine(warning);
    }
    emitResult({
      findings: [],
      projectKey,
      branch: branchName,
      queryTimestamp,
      fromCache: false,
      cacheAgeSeconds: null,
      warnings,
      json: options.json,
    });
    return 0;
  }
  const files = fileSet.files;

  const token = process.env.SONAR_TOKEN;
  const tokenSet = typeof token === 'string' && token.length > 0;
  if (!tokenSet) {
    const note = classifyError({
      errorKind: 'auth-missing',
      httpStatus: null,
      projectKey,
      tokenSet: false,
    });
    warnings.push(note.warning);
    writeStderrLine(note.stderr);
  }

  const cacheKey = cacheKeyOf({
    files,
    statuses: DEFAULT_STATUSES,
    pageSize: DEFAULT_PAGE_SIZE,
  });
  const { cacheEntries, cachedEntry } = await loadCacheEntries(options, cacheKey, warnings);
  const now = Date.now();

  if (!options.noCache && isCacheFresh(cachedEntry, now, options.cacheTtlMs)) {
    const ageSeconds = Math.floor((now - cachedEntry.fetchedAt) / 1000);
    const findings = parseIssuesResponse(cachedEntry.payload, { projectKey });
    emitResult({
      findings,
      projectKey,
      branch: branchName,
      queryTimestamp,
      fromCache: true,
      cacheAgeSeconds: ageSeconds,
      warnings,
      json: options.json,
    });
    return 0;
  }

  // Fresh fetch.
  const url = buildIssuesUrl({
    baseUrl: SONARCLOUD_BASE_URL,
    projectKey,
    files,
    page: 1,
    pageSize: DEFAULT_PAGE_SIZE,
    statuses: DEFAULT_STATUSES,
  });
  const fetchResult = await fetchIssues(url, token);

  if (fetchResult.kind === 'ok') {
    const findings = parseIssuesResponse(fetchResult.payload, { projectKey });
    await persistCacheEntry(cacheEntries, cacheKey, now, fetchResult.payload, warnings);
    emitResult({
      findings,
      projectKey,
      branch: branchName,
      queryTimestamp,
      fromCache: false,
      cacheAgeSeconds: null,
      warnings,
      json: options.json,
    });
    return 0;
  }

  // Transient failure path: classify, optionally fall back to stale cache.
  const classification = classifyTransientFailure(fetchResult, projectKey, tokenSet);
  writeStderrLine(classification.stderr);
  warnings.push(classification.warning);

  if (classification.allowStaleCache && cachedEntry !== null) {
    const ageSeconds = Math.floor((now - cachedEntry.fetchedAt) / 1000);
    const findings = parseIssuesResponse(cachedEntry.payload, { projectKey });
    emitResult({
      findings,
      projectKey,
      branch: branchName,
      queryTimestamp,
      fromCache: true,
      cacheAgeSeconds: ageSeconds,
      warnings,
      json: options.json,
    });
    return 0;
  }

  emitResult({
    findings: [],
    projectKey,
    branch: branchName,
    queryTimestamp,
    fromCache: false,
    cacheAgeSeconds: null,
    warnings,
    json: options.json,
  });
  return 0;
}

// Setting `process.exitCode` (rather than calling `process.exit()`) lets
// the event loop drain undici's keep-alive sockets cleanly. On Windows
// 24.x, calling `process.exit()` while sockets are still tearing down
// has been observed to trigger a libuv UV_HANDLE_CLOSING assertion. The
// script otherwise has no long-running handles, so this exits as fast as
// `exit()`. Reproducer for a future maintainer: when libuv ships a fix
// this guard becomes redundant — replace `process.exitCode = ...` with
// `process.exit(...)` and run `pnpm test:run` on Windows-Node 24.x; if
// no UV_HANDLE_CLOSING assertion fires, the guard can be removed.
try {
  process.exitCode = await main();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`Failed to run sonar-findings query: ${message}\n`);
  process.exitCode = 1;
}
