import { describe, expect, it } from 'vitest';

import hotspotsResponseFixture from './fixtures/hotspots-response.json' with { type: 'json' };
import issuesResponseFixture from './fixtures/issues-response.json' with { type: 'json' };
import { parseIssuesResponse } from './issues.mjs';
import {
  buildHotspotsUrl,
  buildMeta,
  CACHE_SCHEMA_VERSION,
  cacheKeyOf,
  classifyDiffEdgeCase,
  classifyError,
  compareFindings,
  DEFAULT_CACHE_TTL_MS,
  DEFAULT_HOTSPOT_LIFECYCLE_STATUSES,
  filterHotspotsByDefaultStatus,
  formatJson,
  formatPretty,
  isCacheFresh,
  mapHotspotToFinding,
  parseCacheEntry,
  parseConnectedMode,
  parseHotspotsResponse,
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
// buildHotspotsUrl
// ---------------------------------------------------------------------------

describe('buildHotspotsUrl', () => {
  it('builds the project-scoped URL with no status, resolution, or files parameter', () => {
    const url = buildHotspotsUrl({ projectKey: 'p' });
    expect(url).toBe(`${SONARCLOUD_BASE_URL}/api/hotspots/search?projectKey=p&p=1&ps=500`);
    expect(url).not.toContain('status=');
    expect(url).not.toContain('resolution=');
    expect(url).not.toContain('files=');
    expect(url).not.toContain('componentKeys=');
  });

  it('omits the files parameter when the file list is empty', () => {
    const url = buildHotspotsUrl({ projectKey: 'p', files: [] });
    expect(url).not.toContain('files=');
  });

  it('uses files=<paths> for a single file scope (not componentKeys=)', () => {
    const url = buildHotspotsUrl({ projectKey: 'p', files: ['src/utils/slugify.ts'] });
    expect(url).toContain('files=src%2Futils%2Fslugify.ts');
    expect(url).not.toContain('componentKeys=');
  });

  it('joins multiple files into a comma-separated files= parameter', () => {
    const url = buildHotspotsUrl({
      projectKey: 'p',
      files: ['scripts/generate-csp-hashes.mjs', 'src/utils/slugify.ts'],
    });
    expect(url).toContain('files=scripts%2Fgenerate-csp-hashes.mjs%2Csrc%2Futils%2Fslugify.ts');
  });

  it('respects a custom baseUrl override', () => {
    const url = buildHotspotsUrl({ baseUrl: 'https://example.test', projectKey: 'p' });
    expect(url.startsWith('https://example.test/api/hotspots/search?')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// parseHotspotsResponse
// ---------------------------------------------------------------------------

const FIXTURE_PROJECT_KEY = 'team4procoaching_website';

describe('parseHotspotsResponse', () => {
  it('parses the captured fixture into a hotspot-findings array of matching length', () => {
    const hotspots = parseHotspotsResponse(hotspotsResponseFixture, {
      projectKey: FIXTURE_PROJECT_KEY,
    });
    expect(hotspots).toHaveLength(hotspotsResponseFixture.hotspots.length);
  });

  it('projects each hotspot to the documented six-field shape', () => {
    const hotspots = parseHotspotsResponse(hotspotsResponseFixture, {
      projectKey: FIXTURE_PROJECT_KEY,
    });
    for (const hotspot of hotspots) {
      expect(Object.keys(hotspot).sort((a, b) => a.localeCompare(b))).toEqual([
        'file',
        'line',
        'message',
        'rule',
        'status',
        'vulnerabilityProbability',
      ]);
    }
  });

  it('sorts hotspot findings deterministically by (file, line, rule)', () => {
    const hotspots = parseHotspotsResponse(hotspotsResponseFixture, {
      projectKey: FIXTURE_PROJECT_KEY,
    });
    expect(hotspots[0].file).toBe('scripts/check-sonar-findings.mjs');
    expect(hotspots[1].file).toBe('scripts/generate-csp-hashes.mjs');
    expect(hotspots[1].line).toBe(93);
    expect(hotspots[2].file).toBe('scripts/generate-csp-hashes.mjs');
    expect(hotspots[2].line).toBe(98);
    expect(hotspots[3].file).toBe('src/utils/slugify.ts');
  });

  it('strips the project prefix from each component path', () => {
    const hotspots = parseHotspotsResponse(hotspotsResponseFixture, {
      projectKey: FIXTURE_PROJECT_KEY,
    });
    for (const hotspot of hotspots) {
      expect(hotspot.file.includes(`${FIXTURE_PROJECT_KEY}:`)).toBe(false);
    }
  });

  it('joins REVIEWED+resolution into the normalised status label', () => {
    const hotspots = parseHotspotsResponse(hotspotsResponseFixture, {
      projectKey: FIXTURE_PROJECT_KEY,
    });
    const reviewed = hotspots.find((h) => h.file === 'scripts/check-sonar-findings.mjs');
    expect(reviewed?.status).toBe('REVIEWED+SAFE');
    const toReview = hotspots.find((h) => h.file === 'src/utils/slugify.ts');
    expect(toReview?.status).toBe('TO_REVIEW');
  });

  it('preserves the language prefix on rule keys (javascript: and typescript:)', () => {
    const hotspots = parseHotspotsResponse(hotspotsResponseFixture, {
      projectKey: FIXTURE_PROJECT_KEY,
    });
    const csp = hotspots.find((h) => h.file === 'scripts/generate-csp-hashes.mjs');
    expect(csp?.rule).toBe('javascript:S5852');
    const slugify = hotspots.find((h) => h.file === 'src/utils/slugify.ts');
    expect(slugify?.rule).toBe('typescript:S5852');
  });

  it('throws TypeError when the hotspots array is absent', () => {
    expect(() => parseHotspotsResponse({ paging: {} })).toThrow(TypeError);
    expect(() => parseHotspotsResponse({ paging: {} })).toThrow(/hotspots array/);
  });

  it('throws when the payload is not an object', () => {
    expect(() => parseHotspotsResponse(null)).toThrow(/not an object/);
  });

  it('tolerates absent optional fields and substitutes defaults', () => {
    const hotspots = parseHotspotsResponse(
      {
        hotspots: [
          {
            ruleKey: 'r',
            component: 'p:f.ts',
            status: 'TO_REVIEW',
            vulnerabilityProbability: 'LOW',
          },
          null,
        ],
      },
      { projectKey: 'p' },
    );
    expect(hotspots).toHaveLength(1);
    expect(hotspots[0].message).toBe('');
    expect(hotspots[0].line).toBe(0);
    expect(hotspots[0].status).toBe('TO_REVIEW');
  });
});

// ---------------------------------------------------------------------------
// mapHotspotToFinding
// ---------------------------------------------------------------------------

describe('mapHotspotToFinding', () => {
  it('projects a TO_REVIEW hotspot to the six-field hotspot-finding shape', () => {
    const finding = mapHotspotToFinding(
      {
        ruleKey: 'javascript:S5852',
        component: 'p:scripts/generate-csp-hashes.mjs',
        line: 93,
        message: 'regex',
        vulnerabilityProbability: 'MEDIUM',
        status: 'TO_REVIEW',
      },
      'p',
    );
    expect(finding).toEqual({
      rule: 'javascript:S5852',
      file: 'scripts/generate-csp-hashes.mjs',
      line: 93,
      message: 'regex',
      vulnerabilityProbability: 'MEDIUM',
      status: 'TO_REVIEW',
    });
  });

  it('joins the resolution onto the status label for REVIEWED hotspots', () => {
    const finding = mapHotspotToFinding(
      {
        ruleKey: 'javascript:S4036',
        component: 'p:scripts/check-sonar-findings.mjs',
        line: 231,
        message: 'PATH',
        vulnerabilityProbability: 'LOW',
        status: 'REVIEWED',
        resolution: 'SAFE',
      },
      'p',
    );
    expect(finding?.status).toBe('REVIEWED+SAFE');
  });

  it('returns null for non-object entries', () => {
    expect(mapHotspotToFinding(null, 'p')).toBeNull();
    expect(mapHotspotToFinding(42, 'p')).toBeNull();
    expect(mapHotspotToFinding('hotspot', 'p')).toBeNull();
  });

  it('strips the project prefix from the component path', () => {
    const finding = mapHotspotToFinding(
      {
        ruleKey: 'r',
        component: 'p:src/utils/slugify.ts',
        status: 'TO_REVIEW',
        vulnerabilityProbability: 'LOW',
      },
      'p',
    );
    expect(finding?.file).toBe('src/utils/slugify.ts');
  });
});

// ---------------------------------------------------------------------------
// filterHotspotsByDefaultStatus
// ---------------------------------------------------------------------------

// Inline literal payload: live fixture covers TO_REVIEW + REVIEWED+SAFE
// only (the project today has no REVIEWED+FIXED or REVIEWED+ACKNOWLEDGED
// hotspots). The inline literal exercises all four lifecycle states the
// filter must handle. The on-disk fixture remains the contract test on
// the live API shape.
describe('filterHotspotsByDefaultStatus', () => {
  const baseHotspot = {
    rule: 'r',
    file: 'f.ts',
    line: 1,
    message: 'm',
    vulnerabilityProbability: 'LOW',
  };
  const fourStateInput = [
    { ...baseHotspot, status: 'TO_REVIEW' },
    { ...baseHotspot, status: 'REVIEWED+ACKNOWLEDGED' },
    { ...baseHotspot, status: 'REVIEWED+SAFE' },
    { ...baseHotspot, status: 'REVIEWED+FIXED' },
  ];

  it('keeps TO_REVIEW and REVIEWED+ACKNOWLEDGED, drops SAFE and FIXED by default', () => {
    const kept = filterHotspotsByDefaultStatus(fourStateInput);
    expect(kept.map((h) => h.status)).toEqual(['TO_REVIEW', 'REVIEWED+ACKNOWLEDGED']);
  });

  it('respects an explicit statuses override that keeps only TO_REVIEW', () => {
    const kept = filterHotspotsByDefaultStatus(fourStateInput, ['TO_REVIEW']);
    expect(kept.map((h) => h.status)).toEqual(['TO_REVIEW']);
  });

  it('returns an empty array when the explicit statuses override is empty', () => {
    const kept = filterHotspotsByDefaultStatus(fourStateInput, []);
    expect(kept).toEqual([]);
  });

  it('returns a new array; does not mutate the input', () => {
    const before = fourStateInput.length;
    const kept = filterHotspotsByDefaultStatus(fourStateInput);
    expect(kept).not.toBe(fourStateInput);
    expect(fourStateInput).toHaveLength(before);
  });

  it('returns an empty array when the input is empty', () => {
    expect(filterHotspotsByDefaultStatus([])).toEqual([]);
  });

  it('exposes the default keep-list as a frozen exported constant', () => {
    expect(DEFAULT_HOTSPOT_LIFECYCLE_STATUSES).toEqual(['TO_REVIEW', 'REVIEWED+ACKNOWLEDGED']);
    expect(Object.isFrozen(DEFAULT_HOTSPOT_LIFECYCLE_STATUSES)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// compareFindings
// ---------------------------------------------------------------------------

describe('compareFindings', () => {
  it('orders by file primarily', () => {
    const a = { file: 'a.ts', line: 99, rule: 'z' };
    const b = { file: 'b.ts', line: 1, rule: 'a' };
    expect(compareFindings(a, b)).toBeLessThan(0);
  });

  it('orders by line when files match', () => {
    const a = { file: 'a.ts', line: 5, rule: 'z' };
    const b = { file: 'a.ts', line: 10, rule: 'a' };
    expect(compareFindings(a, b)).toBeLessThan(0);
  });

  it('orders by rule when file and line match', () => {
    const a = { file: 'a.ts', line: 5, rule: 'aaa' };
    const b = { file: 'a.ts', line: 5, rule: 'bbb' };
    expect(compareFindings(a, b)).toBeLessThan(0);
  });

  it('returns zero when all three keys match', () => {
    const a = { file: 'a.ts', line: 5, rule: 'r' };
    const b = { file: 'a.ts', line: 5, rule: 'r' };
    expect(compareFindings(a, b)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// formatPretty / formatJson
// ---------------------------------------------------------------------------

const sampleMeta = buildMeta({
  projectKey: 'p',
  branch: 'feature/x',
  queryTimestamp: '2026-05-01T00:01:00Z',
  fromCache: false,
  cacheAgeSeconds: null,
  hotspotsIncluded: false,
  warnings: [],
});

describe('formatPretty', () => {
  it('does not throw on an empty findings array', () => {
    const output = formatPretty([], sampleMeta);
    expect(output).toContain('(no findings)');
  });

  it('renders a banner naming the project and branch', () => {
    const output = formatPretty([], sampleMeta);
    expect(output).toContain('project p');
    expect(output).toContain('branch feature/x');
  });

  it('omits any analysis-timestamp claim from the banner', () => {
    const output = formatPretty([], sampleMeta);
    expect(output).not.toContain('as of last analysis');
    expect(output).not.toContain('unknown');
  });

  it('renders one block per finding with rule, severity, and location', () => {
    const findings = parseIssuesResponse(issuesResponseFixture, {
      projectKey: FIXTURE_PROJECT_KEY,
    });
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

  describe('hotspots branch', () => {
    const hotspotsMeta = buildMeta({
      ...sampleMeta.snapshotInfo,
      hotspotsIncluded: true,
      warnings: [],
    });
    const sampleHotspots = [
      {
        rule: 'javascript:S5852',
        file: 'scripts/generate-csp-hashes.mjs',
        line: 93,
        message: 'regex',
        vulnerabilityProbability: 'MEDIUM',
        status: 'TO_REVIEW',
      },
    ];

    it('renders the Security Hotspots header when hotspotsIncluded is true', () => {
      const output = formatPretty([], hotspotsMeta, sampleHotspots);
      expect(output).toContain('Security Hotspots:');
    });

    it('renders the (no hotspots) line on an empty hotspots array', () => {
      const output = formatPretty([], hotspotsMeta, []);
      expect(output).toContain('Security Hotspots:');
      expect(output).toContain('(no hotspots)');
    });

    it('renders each hotspot block with rule, probability, location, and message', () => {
      const output = formatPretty([], hotspotsMeta, sampleHotspots);
      expect(output).toContain('  javascript:S5852  [MEDIUM]  scripts/generate-csp-hashes.mjs:93');
      expect(output).toContain('    regex');
    });

    it('does not render the hotspots section when hotspotsIncluded is false', () => {
      const output = formatPretty([], sampleMeta, sampleHotspots);
      expect(output).not.toContain('Security Hotspots:');
      expect(output).not.toContain('(no hotspots)');
    });
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
    const findings = parseIssuesResponse(issuesResponseFixture, {
      projectKey: FIXTURE_PROJECT_KEY,
    });
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

  it('omits the analysis-timestamp field from snapshotInfo', () => {
    const json = formatJson([], sampleMeta);
    const parsed = JSON.parse(json);
    expect(parsed.meta.snapshotInfo).not.toHaveProperty('analysisTimestamp');
  });

  describe('hotspots branch', () => {
    const hotspotsMeta = buildMeta({
      ...sampleMeta.snapshotInfo,
      hotspotsIncluded: true,
      warnings: [],
    });
    const sampleHotspots = [
      {
        rule: 'javascript:S5852',
        file: 'scripts/generate-csp-hashes.mjs',
        line: 93,
        message: 'regex',
        vulnerabilityProbability: 'MEDIUM',
        status: 'TO_REVIEW',
      },
    ];

    it('adds the top-level hotspots array when hotspotsIncluded is true', () => {
      const json = formatJson([], hotspotsMeta, sampleHotspots);
      const parsed = JSON.parse(json);
      expect(Object.keys(parsed).sort((a, b) => a.localeCompare(b))).toEqual([
        'findings',
        'hotspots',
        'meta',
      ]);
      expect(parsed.hotspots).toHaveLength(1);
      expect(parsed.hotspots[0].vulnerabilityProbability).toBe('MEDIUM');
    });

    it('omits the top-level hotspots key when hotspotsIncluded is false', () => {
      const json = formatJson([], sampleMeta, sampleHotspots);
      const parsed = JSON.parse(json);
      expect(parsed).not.toHaveProperty('hotspots');
    });

    it('reflects hotspotsIncluded on meta.snapshotInfo', () => {
      const json = formatJson([], hotspotsMeta, []);
      const parsed = JSON.parse(json);
      expect(parsed.meta.snapshotInfo.hotspotsIncluded).toBe(true);
    });
  });
});

// ---------------------------------------------------------------------------
// cacheKeyOf / isCacheFresh / parseCacheEntry
// ---------------------------------------------------------------------------

describe('cacheKeyOf', () => {
  it('produces the same key regardless of file order', () => {
    const a = cacheKeyOf({
      endpoint: 'issues',
      files: ['a.ts', 'b.ts'],
      statuses: 'OPEN',
      pageSize: 10,
    });
    const b = cacheKeyOf({
      endpoint: 'issues',
      files: ['b.ts', 'a.ts'],
      statuses: 'OPEN',
      pageSize: 10,
    });
    expect(a).toBe(b);
  });

  it('differentiates by statuses (issues endpoint)', () => {
    const a = cacheKeyOf({
      endpoint: 'issues',
      files: ['a.ts'],
      statuses: 'OPEN',
      pageSize: 10,
    });
    const b = cacheKeyOf({
      endpoint: 'issues',
      files: ['a.ts'],
      statuses: 'CONFIRMED',
      pageSize: 10,
    });
    expect(a).not.toBe(b);
  });

  it('differentiates by pageSize', () => {
    const a = cacheKeyOf({
      endpoint: 'issues',
      files: ['a.ts'],
      statuses: 'OPEN',
      pageSize: 10,
    });
    const b = cacheKeyOf({
      endpoint: 'issues',
      files: ['a.ts'],
      statuses: 'OPEN',
      pageSize: 20,
    });
    expect(a).not.toBe(b);
  });

  it('differentiates by endpoint when files, statuses, and pageSize match', () => {
    const issues = cacheKeyOf({
      endpoint: 'issues',
      files: ['a.ts'],
      statuses: 'OPEN',
      pageSize: 500,
    });
    const hotspots = cacheKeyOf({
      endpoint: 'hotspots',
      files: ['a.ts'],
      pageSize: 500,
    });
    expect(issues).not.toBe(hotspots);
    expect(issues).toBe('issues::a.ts::OPEN::500');
    expect(hotspots).toBe('hotspots::a.ts::500');
  });

  it('omits the statuses segment from the hotspots key shape', () => {
    const hotspots = cacheKeyOf({
      endpoint: 'hotspots',
      files: ['a.ts'],
      pageSize: 500,
    });
    expect(hotspots.split('::')).toHaveLength(3);
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
  it('returns the entries map when schemaVersion matches CACHE_SCHEMA_VERSION', () => {
    const text = JSON.stringify({
      schemaVersion: CACHE_SCHEMA_VERSION,
      entries: { k: { fetchedAt: 1, payload: {} } },
    });
    const result = parseCacheEntry(text);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.entries.k).toEqual({ fetchedAt: 1, payload: {} });
    }
  });

  it('discards a cache whose schemaVersion does not match (bump-and-discard)', () => {
    const text = JSON.stringify({
      schemaVersion: CACHE_SCHEMA_VERSION + 1,
      entries: { k: { fetchedAt: 1, payload: {} } },
    });
    const result = parseCacheEntry(text);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('version-mismatch');
      if (result.reason === 'version-mismatch') {
        expect(result.actualVersion).toBe(CACHE_SCHEMA_VERSION + 1);
      }
    }
  });

  it('treats a pre-versioning cache (no schemaVersion field) as a discard', () => {
    const text = JSON.stringify({ k: { fetchedAt: 1, payload: {} } });
    const result = parseCacheEntry(text);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('version-missing');
    }
  });

  it('returns parse-error on malformed JSON', () => {
    const result = parseCacheEntry('not json');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('parse-error');
    }
  });

  it('returns shape on a JSON array (wrong root)', () => {
    const result = parseCacheEntry('[1,2,3]');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('shape');
    }
  });

  it('returns shape on the string "null" (wrong root)', () => {
    const result = parseCacheEntry('null');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('shape');
    }
  });

  it('returns shape when entries field is absent', () => {
    const text = JSON.stringify({ schemaVersion: CACHE_SCHEMA_VERSION });
    const result = parseCacheEntry(text);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('shape');
    }
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
