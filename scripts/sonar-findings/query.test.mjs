import { describe, expect, it } from 'vitest';

import {
  buildIssuesUrl,
  buildMeta,
  cacheKeyOf,
  classifyDiffEdgeCase,
  classifyError,
  DEFAULT_CACHE_TTL_MS,
  formatJson,
  formatPretty,
  isCacheFresh,
  parseCacheEntry,
  parseConnectedMode,
  parseIssuesResponse,
  SCHEMA_VERSION,
  SONARCLOUD_BASE_URL,
} from './query.mjs';

// ---------------------------------------------------------------------------
// parseConnectedMode
// ---------------------------------------------------------------------------

describe('parseConnectedMode', () => {
  it('extracts organization and projectKey from a well-shaped object', () => {
    const result = parseConnectedMode({
      sonarCloudOrganization: 'team4procoaching',
      projectKey: 'team4procoaching_website',
    });
    expect(result).toEqual({
      organization: 'team4procoaching',
      projectKey: 'team4procoaching_website',
    });
  });

  it('throws when the payload is null', () => {
    expect(() => parseConnectedMode(null)).toThrow(/not an object/);
  });

  it('throws when sonarCloudOrganization is missing', () => {
    expect(() => parseConnectedMode({ projectKey: 'x' })).toThrow(/sonarCloudOrganization/);
  });

  it('throws when projectKey is missing', () => {
    expect(() => parseConnectedMode({ sonarCloudOrganization: 'org' })).toThrow(/projectKey/);
  });

  it('throws when sonarCloudOrganization is empty', () => {
    expect(() => parseConnectedMode({ sonarCloudOrganization: '', projectKey: 'x' })).toThrow(
      /sonarCloudOrganization/,
    );
  });
});

// ---------------------------------------------------------------------------
// buildIssuesUrl
// ---------------------------------------------------------------------------

describe('buildIssuesUrl', () => {
  it('joins explicit files into componentKeys with project prefix', () => {
    const url = buildIssuesUrl({
      projectKey: 'p',
      files: ['src/a.ts', 'src/b.ts'],
      page: 1,
      pageSize: 50,
    });
    expect(url).toContain('componentKeys=p%3Asrc%2Fa.ts%2Cp%3Asrc%2Fb.ts');
    expect(url).toContain('p=1');
    expect(url).toContain('ps=50');
    expect(url).toContain('statuses=OPEN%2CCONFIRMED%2CREOPENED');
  });

  it('falls back to the bare project key when no files are passed', () => {
    const url = buildIssuesUrl({ projectKey: 'p' });
    expect(url).toContain('componentKeys=p&');
  });

  it('uses the SonarCloud base URL by default', () => {
    const url = buildIssuesUrl({ projectKey: 'p' });
    expect(url.startsWith(`${SONARCLOUD_BASE_URL}/api/issues/search?`)).toBe(true);
  });

  it('respects a custom baseUrl override', () => {
    const url = buildIssuesUrl({ baseUrl: 'https://example.test', projectKey: 'p' });
    expect(url.startsWith('https://example.test/api/issues/search?')).toBe(true);
  });

  it('respects a custom statuses override', () => {
    const url = buildIssuesUrl({ projectKey: 'p', statuses: 'OPEN' });
    expect(url).toContain('statuses=OPEN');
  });
});

// ---------------------------------------------------------------------------
// parseIssuesResponse
// ---------------------------------------------------------------------------

const fixture = {
  total: 2,
  issues: [
    {
      key: 'AAA',
      rule: 'typescript:S7761',
      severity: 'MAJOR',
      component: 'p:src/components/ui/section.test.ts',
      line: 107,
      message: 'Prefer .dataset over getAttribute(...)',
      status: 'OPEN',
      type: 'CODE_SMELL',
    },
    {
      key: 'BBB',
      rule: 'typescript:S7761',
      severity: 'MAJOR',
      component: 'p:src/components/ui/accordion.test.ts',
      line: 40,
      message: 'Prefer .dataset over getAttribute(...)',
      status: 'OPEN',
    },
  ],
};

describe('parseIssuesResponse', () => {
  it('parses the fixture into a sorted findings array', () => {
    const findings = parseIssuesResponse(fixture, { projectKey: 'p' });
    expect(findings).toHaveLength(2);
    expect(findings[0].file).toBe('src/components/ui/accordion.test.ts');
    expect(findings[1].file).toBe('src/components/ui/section.test.ts');
  });

  it('strips the project prefix from the component path', () => {
    const findings = parseIssuesResponse(fixture, { projectKey: 'p' });
    expect(findings[0].file.startsWith('src/')).toBe(true);
  });

  it('throws when the issues array is absent', () => {
    expect(() => parseIssuesResponse({ total: 0 })).toThrow(/issues array/);
  });

  it('throws when the payload is not an object', () => {
    expect(() => parseIssuesResponse(null)).toThrow(/not an object/);
  });

  it('tolerates absent optional fields and substitutes defaults', () => {
    const findings = parseIssuesResponse(
      { issues: [{ rule: 'r', component: 'p:f.ts' }] },
      { projectKey: 'p' },
    );
    expect(findings[0].severity).toBe('UNKNOWN');
    expect(findings[0].line).toBe(0);
    expect(findings[0].message).toBe('');
    expect(findings[0].status).toBe('UNKNOWN');
  });

  it('skips issue entries that are not objects', () => {
    const findings = parseIssuesResponse(
      { issues: [null, { rule: 'r', component: 'p:f.ts' }] },
      { projectKey: 'p' },
    );
    expect(findings).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// formatPretty / formatJson
// ---------------------------------------------------------------------------

const sampleMeta = buildMeta({
  projectKey: 'p',
  branch: 'feature/x',
  analysisTimestamp: '2026-05-01T00:00:00Z',
  queryTimestamp: '2026-05-01T00:01:00Z',
  fromCache: false,
  cacheAgeSeconds: null,
  warnings: [],
});

describe('formatPretty', () => {
  it('does not throw on an empty findings array', () => {
    const output = formatPretty([], sampleMeta);
    expect(output).toContain('(no findings)');
  });

  it('renders a banner naming the project, branch, and analysis timestamp', () => {
    const output = formatPretty([], sampleMeta);
    expect(output).toContain('project p');
    expect(output).toContain('branch feature/x');
    expect(output).toContain('2026-05-01T00:00:00Z');
  });

  it('renders one block per finding with rule, severity, and location', () => {
    const findings = parseIssuesResponse(fixture, { projectKey: 'p' });
    const output = formatPretty(findings, sampleMeta);
    expect(output).toContain('typescript:S7761');
    expect(output).toContain('[MAJOR]');
    expect(output).toContain('src/components/ui/section.test.ts:107');
  });

  it('prefixes warnings with an exclamation mark', () => {
    const meta = buildMeta({
      ...sampleMeta.snapshotInfo,
      warnings: ['hello world'],
    });
    const output = formatPretty([], meta);
    expect(output).toContain('! hello world');
  });

  it('annotates the banner when results come from cache', () => {
    const meta = buildMeta({
      ...sampleMeta.snapshotInfo,
      fromCache: true,
      cacheAgeSeconds: 42,
      warnings: [],
    });
    const output = formatPretty([], meta);
    expect(output).toContain('cached, 42s old');
  });
});

describe('formatJson', () => {
  it('emits the stable envelope with meta and findings keys', () => {
    const json = formatJson([], sampleMeta);
    const parsed = JSON.parse(json);
    expect(Object.keys(parsed).sort((a, b) => a.localeCompare(b))).toEqual(['findings', 'meta']);
    expect(parsed.meta.schemaVersion).toBe(SCHEMA_VERSION);
    expect(parsed.findings).toEqual([]);
  });

  it('emits an identical top-level shape on transient-error paths', () => {
    const errorMeta = buildMeta({
      ...sampleMeta.snapshotInfo,
      warnings: ['network error reaching sonarcloud.io: ECONNRESET'],
    });
    const json = formatJson([], errorMeta);
    const parsed = JSON.parse(json);
    expect(Object.keys(parsed).sort((a, b) => a.localeCompare(b))).toEqual(['findings', 'meta']);
    expect(parsed.meta.warnings).toContain('network error reaching sonarcloud.io: ECONNRESET');
  });

  it('preserves all required finding fields', () => {
    const findings = parseIssuesResponse(fixture, { projectKey: 'p' });
    const json = formatJson(findings, sampleMeta);
    const parsed = JSON.parse(json);
    expect(Object.keys(parsed.findings[0]).sort((a, b) => a.localeCompare(b))).toEqual([
      'file',
      'line',
      'message',
      'rule',
      'severity',
      'status',
    ]);
  });
});

// ---------------------------------------------------------------------------
// cacheKeyOf / isCacheFresh / parseCacheEntry
// ---------------------------------------------------------------------------

describe('cacheKeyOf', () => {
  it('produces the same key regardless of file order', () => {
    const a = cacheKeyOf({ files: ['a.ts', 'b.ts'], statuses: 'OPEN', pageSize: 10 });
    const b = cacheKeyOf({ files: ['b.ts', 'a.ts'], statuses: 'OPEN', pageSize: 10 });
    expect(a).toBe(b);
  });

  it('differentiates by statuses', () => {
    const a = cacheKeyOf({ files: ['a.ts'], statuses: 'OPEN', pageSize: 10 });
    const b = cacheKeyOf({ files: ['a.ts'], statuses: 'CONFIRMED', pageSize: 10 });
    expect(a).not.toBe(b);
  });

  it('differentiates by pageSize', () => {
    const a = cacheKeyOf({ files: ['a.ts'], statuses: 'OPEN', pageSize: 10 });
    const b = cacheKeyOf({ files: ['a.ts'], statuses: 'OPEN', pageSize: 20 });
    expect(a).not.toBe(b);
  });
});

describe('isCacheFresh', () => {
  const now = 1_000_000;
  it('returns true when the entry is younger than the TTL', () => {
    expect(isCacheFresh({ fetchedAt: now - 1000 }, now, DEFAULT_CACHE_TTL_MS)).toBe(true);
  });

  it('returns false when the entry is older than the TTL', () => {
    expect(
      isCacheFresh({ fetchedAt: now - DEFAULT_CACHE_TTL_MS - 1 }, now, DEFAULT_CACHE_TTL_MS),
    ).toBe(false);
  });

  it('returns false for null or undefined entries', () => {
    expect(isCacheFresh(null, now, DEFAULT_CACHE_TTL_MS)).toBe(false);
    expect(isCacheFresh(undefined, now, DEFAULT_CACHE_TTL_MS)).toBe(false);
  });

  it('returns false when fetchedAt is missing', () => {
    // @ts-expect-error - intentional shape violation for the defensive path
    expect(isCacheFresh({}, now, DEFAULT_CACHE_TTL_MS)).toBe(false);
  });
});

describe('parseCacheEntry', () => {
  it('returns the parsed object for a well-formed JSON', () => {
    const result = parseCacheEntry('{"k":{"fetchedAt":1,"payload":{}}}');
    expect(result).not.toBeNull();
  });

  it('returns null on JSON parse error', () => {
    expect(parseCacheEntry('not json')).toBeNull();
  });

  it('returns null for arrays (wrong root shape)', () => {
    expect(parseCacheEntry('[1,2,3]')).toBeNull();
  });

  it('returns null for the string "null"', () => {
    expect(parseCacheEntry('null')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// classifyDiffEdgeCase
// ---------------------------------------------------------------------------

const baseGitContext = {
  branch: 'feature/x',
  isDetached: false,
  mainExists: true,
  masterExists: false,
  mergeBaseResolved: true,
  diffEntries: [],
};

describe('classifyDiffEdgeCase', () => {
  it('detects on-main when the working tree is on main', () => {
    const result = classifyDiffEdgeCase({ ...baseGitContext, branch: 'main' });
    expect(result.behaviourTag).toBe('on-main');
    expect(result.warnings[0]).toContain('current branch is main');
  });

  it('detects empty-diff on a non-main branch with no changes', () => {
    const result = classifyDiffEdgeCase(baseGitContext);
    expect(result.behaviourTag).toBe('empty-diff');
  });

  it('detects orphan when no merge-base resolves', () => {
    const result = classifyDiffEdgeCase({ ...baseGitContext, mergeBaseResolved: false });
    expect(result.behaviourTag).toBe('orphan');
  });

  it('detects detached-orphan when both detached and orphan', () => {
    const result = classifyDiffEdgeCase({
      ...baseGitContext,
      isDetached: true,
      mergeBaseResolved: false,
    });
    expect(result.behaviourTag).toBe('detached-orphan');
  });

  it('detects main-missing when neither main nor master exists', () => {
    const result = classifyDiffEdgeCase({
      ...baseGitContext,
      mainExists: false,
      masterExists: false,
    });
    expect(result.behaviourTag).toBe('main-missing');
  });

  it('strips submodule paths from the file set and warns', () => {
    const result = classifyDiffEdgeCase({
      ...baseGitContext,
      diffEntries: [
        {
          status: 'M',
          oldPath: null,
          newPath: 'sub/mod',
          similarityScore: null,
          isSubmodule: true,
        },
        {
          status: 'M',
          oldPath: null,
          newPath: 'src/a.ts',
          similarityScore: null,
          isSubmodule: false,
        },
      ],
    });
    expect(result.behaviourTag).toBe('ok');
    expect(result.files).toEqual(['src/a.ts']);
    expect(result.warnings.some((w) => w.includes('submodule'))).toBe(true);
  });

  it('warns on partial renames and uses the new path', () => {
    const result = classifyDiffEdgeCase({
      ...baseGitContext,
      diffEntries: [
        {
          status: 'R',
          oldPath: 'src/old.ts',
          newPath: 'src/new.ts',
          similarityScore: 80,
          isSubmodule: false,
        },
      ],
    });
    expect(result.files).toEqual(['src/new.ts']);
    expect(result.warnings.some((w) => w.includes('renamed from'))).toBe(true);
  });

  it('drops deleted paths and warns', () => {
    const result = classifyDiffEdgeCase({
      ...baseGitContext,
      diffEntries: [
        {
          status: 'D',
          oldPath: null,
          newPath: 'src/gone.ts',
          similarityScore: null,
          isSubmodule: false,
        },
        {
          status: 'M',
          oldPath: null,
          newPath: 'src/here.ts',
          similarityScore: null,
          isSubmodule: false,
        },
      ],
    });
    expect(result.files).toEqual(['src/here.ts']);
    expect(result.warnings.some((w) => w.includes('deleted'))).toBe(true);
  });

  it('returns ok when the diff produces a non-empty file list', () => {
    const result = classifyDiffEdgeCase({
      ...baseGitContext,
      diffEntries: [
        {
          status: 'A',
          oldPath: null,
          newPath: 'src/new.ts',
          similarityScore: null,
          isSubmodule: false,
        },
      ],
    });
    expect(result.behaviourTag).toBe('ok');
    expect(result.files).toEqual(['src/new.ts']);
  });
});

// ---------------------------------------------------------------------------
// classifyError
// ---------------------------------------------------------------------------

describe('classifyError', () => {
  it('routes 401 with token set to the regenerate-token message', () => {
    const result = classifyError({
      errorKind: 'http',
      httpStatus: 401,
      projectKey: 'p',
      tokenSet: true,
    });
    expect(result.stderr).toContain('Regenerate the token');
    expect(result.allowStaleCache).toBe(true);
  });

  it('routes 401 without token to the set-SONAR_TOKEN message', () => {
    const result = classifyError({
      errorKind: 'http',
      httpStatus: 401,
      projectKey: 'p',
      tokenSet: false,
    });
    expect(result.stderr).toContain('Set SONAR_TOKEN');
    expect(result.allowStaleCache).toBe(true);
  });

  it('routes 403 to the scope-denied message', () => {
    const result = classifyError({
      errorKind: 'http',
      httpStatus: 403,
      projectKey: 'p',
      tokenSet: true,
    });
    expect(result.stderr).toContain('HTTP 403');
    expect(result.allowStaleCache).toBe(true);
  });

  it('routes 404 to the project-not-found message and disallows stale cache', () => {
    const result = classifyError({
      errorKind: 'http',
      httpStatus: 404,
      projectKey: 'p',
      tokenSet: false,
    });
    expect(result.stderr).toContain('HTTP 404');
    expect(result.allowStaleCache).toBe(false);
  });

  it('routes 429 to the rate-limit message and allows stale cache', () => {
    const result = classifyError({
      errorKind: 'http',
      httpStatus: 429,
      projectKey: 'p',
      tokenSet: false,
      retryAfter: '60',
    });
    expect(result.stderr).toContain('HTTP 429');
    expect(result.stderr).toContain('60');
    expect(result.allowStaleCache).toBe(true);
  });

  it('routes 5xx to the server-error message and allows stale cache', () => {
    const result = classifyError({
      errorKind: 'http',
      httpStatus: 503,
      projectKey: 'p',
      tokenSet: false,
    });
    expect(result.stderr).toContain('HTTP 503');
    expect(result.allowStaleCache).toBe(true);
  });

  it('routes network errors to a network-error message', () => {
    const result = classifyError({
      errorKind: 'network',
      httpStatus: null,
      projectKey: 'p',
      tokenSet: false,
      message: 'ENOTFOUND',
    });
    expect(result.stderr).toContain('ENOTFOUND');
    expect(result.allowStaleCache).toBe(true);
  });

  it('routes auth-missing to the unauthenticated-default message', () => {
    const result = classifyError({
      errorKind: 'auth-missing',
      httpStatus: null,
      projectKey: 'p',
      tokenSet: false,
    });
    expect(result.stderr).toContain('SONAR_TOKEN not set');
    expect(result.allowStaleCache).toBe(false);
  });
});
