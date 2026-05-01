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
    defaultBranch: null,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--json') {
      options.json = true;
      continue;
    }
    if (arg === '--all') {
      options.all = true;
      continue;
    }
    if (arg === '--no-cache') {
      options.noCache = true;
      continue;
    }
    if (arg === '--files') {
      const next = argv[i + 1];
      if (next === undefined) {
        return { ok: false, message: '--files requires a comma-separated list of paths' };
      }
      options.files = next.split(',').filter((file) => file.length > 0);
      i += 1;
      continue;
    }
    if (arg.startsWith('--files=')) {
      options.files = arg
        .slice('--files='.length)
        .split(',')
        .filter((file) => file.length > 0);
      continue;
    }
    if (arg.startsWith('--cache-ttl-seconds=')) {
      const seconds = Number(arg.slice('--cache-ttl-seconds='.length));
      if (!Number.isFinite(seconds) || seconds < 0) {
        return { ok: false, message: '--cache-ttl-seconds expects a non-negative number' };
      }
      options.cacheTtlMs = seconds * 1000;
      continue;
    }
    if (arg.startsWith('--default-branch=')) {
      options.defaultBranch = arg.slice('--default-branch='.length);
      continue;
    }
    if (arg === '--help' || arg === '-h') {
      return { ok: false, help: true };
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
  const result = spawnSync('git', args, { encoding: 'utf-8', shell: false });
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
  const result = runGit(['config', '-f', '.gitmodules', '--get-regexp', 'submodule\\..*\\.path']);
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

function collectGitContext(defaultBranchOverride) {
  const branchInfo = currentBranch();
  const mainName = defaultBranchOverride ?? 'main';
  const mainExists = refExists(`refs/heads/${mainName}`);
  const masterExists = mainExists ? false : refExists('refs/heads/master');
  let baseBranch = null;
  if (mainExists) {
    baseBranch = mainName;
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

async function readCache() {
  try {
    const text = await readFile(CACHE_FILE, 'utf-8');
    return parseCacheEntry(text);
  } catch (error) {
    if (error !== null && typeof error === 'object' && error.code === 'ENOENT') {
      return null;
    }
    return null;
  }
}

async function writeCache(cache) {
  await mkdir(dirname(CACHE_FILE), { recursive: true });
  await writeFile(CACHE_FILE, JSON.stringify(cache, null, 2), 'utf-8');
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

  // Connected-mode config (fatal on malformed file).
  let connectedMode;
  try {
    const text = await readFile(CONNECTED_MODE_PATH, 'utf-8');
    const parsedJson = JSON.parse(text);
    connectedMode = parseConnectedMode(parsedJson);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    writeStderrLine(`${CONNECTED_MODE_PATH}: ${message}`);
    return 1;
  }

  const projectKey = connectedMode.projectKey;
  const queryTimestamp = new Date().toISOString();
  const warnings = [];
  let files = [];

  // Resolve the file set.
  if (options.all) {
    files = [];
  } else if (Array.isArray(options.files)) {
    files = options.files;
  } else {
    const gitContext = collectGitContext(options.defaultBranch);
    const classification = classifyDiffEdgeCase(gitContext);
    warnings.push(...classification.warnings);
    files = classification.files;
    if (classification.behaviourTag !== 'ok') {
      // Empty-diff family: do not call the API.
      const meta = buildMeta({
        projectKey,
        branch: gitContext.branch,
        queryTimestamp,
        fromCache: false,
        cacheAgeSeconds: null,
        warnings,
      });
      for (const warning of warnings) {
        writeStderrLine(warning);
      }
      writeOutput([], meta, options.json);
      return 0;
    }
  }

  const branchName =
    options.all || Array.isArray(options.files) || files.length > 0
      ? currentBranch().branch
      : 'main';
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

  // Cache read.
  let cache = options.noCache ? null : await readCache();
  const cachedEntry = cache !== null ? cache[cacheKey] : null;
  const now = Date.now();

  if (!options.noCache && isCacheFresh(cachedEntry, now, options.cacheTtlMs)) {
    const ageSeconds = Math.floor((now - cachedEntry.fetchedAt) / 1000);
    const findings = parseIssuesResponse(cachedEntry.payload, { projectKey });
    const meta = buildMeta({
      projectKey,
      branch: branchName,
      queryTimestamp,
      fromCache: true,
      cacheAgeSeconds: ageSeconds,
      warnings,
    });
    writeOutput(findings, meta, options.json);
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
    cache = cache ?? {};
    cache[cacheKey] = {
      fetchedAt: now,
      payload: fetchResult.payload,
    };
    try {
      await writeCache(cache);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      warnings.push(`cache write failed: ${message}`);
    }
    const meta = buildMeta({
      projectKey,
      branch: branchName,
      queryTimestamp,
      fromCache: false,
      cacheAgeSeconds: null,
      warnings,
    });
    writeOutput(findings, meta, options.json);
    return 0;
  }

  // Transient failure path: classify, optionally fall back to stale cache.
  const classification = classifyError({
    errorKind: fetchResult.kind,
    httpStatus: fetchResult.kind === 'http' ? fetchResult.status : null,
    projectKey,
    tokenSet,
    retryAfter: fetchResult.kind === 'http' ? fetchResult.retryAfter : undefined,
    message: fetchResult.kind === 'network' ? fetchResult.message : undefined,
  });
  writeStderrLine(classification.stderr);
  warnings.push(classification.warning);

  if (classification.allowStaleCache && cachedEntry !== null) {
    const ageSeconds = Math.floor((now - cachedEntry.fetchedAt) / 1000);
    const findings = parseIssuesResponse(cachedEntry.payload, { projectKey });
    const meta = buildMeta({
      projectKey,
      branch: branchName,
      queryTimestamp,
      fromCache: true,
      cacheAgeSeconds: ageSeconds,
      warnings,
    });
    writeOutput(findings, meta, options.json);
    return 0;
  }

  const meta = buildMeta({
    projectKey,
    branch: branchName,
    queryTimestamp,
    fromCache: false,
    cacheAgeSeconds: null,
    warnings,
  });
  writeOutput([], meta, options.json);
  return 0;
}

// Setting `process.exitCode` (rather than calling `process.exit()`) lets
// the event loop drain undici's keep-alive sockets cleanly. On Windows
// 24.x, calling `process.exit()` while sockets are still tearing down
// triggers a libuv handle-state assertion. The script otherwise has no
// long-running handles to shut down, so this exits as fast as `exit()`.
main()
  .then((code) => {
    process.exitCode = code;
  })
  .catch((error) => {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`Failed to run sonar-findings query: ${message}\n`);
    process.exitCode = 1;
  });
