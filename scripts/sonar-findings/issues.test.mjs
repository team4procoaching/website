import { describe, expect, it } from 'vitest';

import issuesResponseFixture from './fixtures/issues-response.json' with { type: 'json' };
import { buildIssuesUrl, mapIssueToFinding, parseIssuesResponse } from './issues.mjs';
import { SONARCLOUD_BASE_URL } from './query.mjs';

const FIXTURE_PROJECT_KEY = 'team4procoaching_website';

// ---------------------------------------------------------------------------
// buildIssuesUrl
// ---------------------------------------------------------------------------

const BRANCH_AXIS_MAIN = { kind: 'branch', name: 'main' };
const BRANCH_AXIS_FEATURE = { kind: 'branch', name: 'feature/foo bar' };
const PR_AXIS_42 = { kind: 'pullRequest', id: '42' };

describe('buildIssuesUrl', () => {
  it('joins explicit files into componentKeys with project prefix', () => {
    const url = buildIssuesUrl({
      projectKey: 'p',
      files: ['src/a.ts', 'src/b.ts'],
      page: 1,
      pageSize: 50,
      branchAxis: BRANCH_AXIS_MAIN,
    });
    expect(url).toContain('componentKeys=p%3Asrc%2Fa.ts%2Cp%3Asrc%2Fb.ts');
    expect(url).toContain('p=1');
    expect(url).toContain('ps=50');
    expect(url).toContain('statuses=OPEN%2CCONFIRMED%2CREOPENED');
  });

  it('falls back to the bare project key when no files are passed', () => {
    const url = buildIssuesUrl({ projectKey: 'p', branchAxis: BRANCH_AXIS_MAIN });
    expect(url).toContain('componentKeys=p&');
  });

  it('uses the SonarCloud base URL by default', () => {
    const url = buildIssuesUrl({ projectKey: 'p', branchAxis: BRANCH_AXIS_MAIN });
    expect(url.startsWith(`${SONARCLOUD_BASE_URL}/api/issues/search?`)).toBe(true);
  });

  it('respects a custom baseUrl override', () => {
    const url = buildIssuesUrl({
      baseUrl: 'https://example.test',
      projectKey: 'p',
      branchAxis: BRANCH_AXIS_MAIN,
    });
    expect(url.startsWith('https://example.test/api/issues/search?')).toBe(true);
  });

  it('respects a custom statuses override', () => {
    const url = buildIssuesUrl({
      projectKey: 'p',
      statuses: 'OPEN',
      branchAxis: BRANCH_AXIS_MAIN,
    });
    expect(url).toContain('statuses=OPEN');
  });

  it('emits &branch=<encoded> when the axis is a branch', () => {
    const url = buildIssuesUrl({ projectKey: 'p', branchAxis: BRANCH_AXIS_FEATURE });
    expect(url).toContain('branch=feature%2Ffoo+bar');
    expect(url).not.toContain('pullRequest=');
  });

  it('emits &pullRequest=<id> when the axis is a pull request', () => {
    const url = buildIssuesUrl({ projectKey: 'p', branchAxis: PR_AXIS_42 });
    expect(url).toContain('pullRequest=42');
    expect(url).not.toContain('branch=');
  });
});

// ---------------------------------------------------------------------------
// parseIssuesResponse
// ---------------------------------------------------------------------------

describe('parseIssuesResponse', () => {
  it('parses the captured fixture into a findings array of matching length', () => {
    const findings = parseIssuesResponse(issuesResponseFixture, {
      projectKey: FIXTURE_PROJECT_KEY,
    });
    expect(findings).toHaveLength(issuesResponseFixture.issues.length);
  });

  it('sorts findings deterministically by (file, line, rule)', () => {
    const findings = parseIssuesResponse(issuesResponseFixture, {
      projectKey: FIXTURE_PROJECT_KEY,
    });
    expect(findings[0].file).toBe('src/components/ui/accordion.test.ts');
    expect(findings[0].line).toBe(40);
    expect(findings[1].file).toBe('src/components/ui/section.test.ts');
    expect(findings[1].line).toBe(107);
    expect(findings[2].file).toBe('src/components/ui/section.test.ts');
    expect(findings[2].line).toBe(110);
  });

  it('strips the project prefix from each component path', () => {
    const findings = parseIssuesResponse(issuesResponseFixture, {
      projectKey: FIXTURE_PROJECT_KEY,
    });
    for (const finding of findings) {
      expect(finding.file.startsWith('src/')).toBe(true);
      expect(finding.file.includes(`${FIXTURE_PROJECT_KEY}:`)).toBe(false);
    }
  });

  it('projects each finding to the documented six-field shape', () => {
    const findings = parseIssuesResponse(issuesResponseFixture, {
      projectKey: FIXTURE_PROJECT_KEY,
    });
    for (const finding of findings) {
      expect(Object.keys(finding).sort((a, b) => a.localeCompare(b))).toEqual([
        'file',
        'line',
        'message',
        'rule',
        'severity',
        'status',
      ]);
    }
  });

  it('preserves real-shape rule keys, severities, and statuses from the fixture', () => {
    const findings = parseIssuesResponse(issuesResponseFixture, {
      projectKey: FIXTURE_PROJECT_KEY,
    });
    expect(findings[0].rule).toBe('typescript:S7761');
    expect(findings[0].severity).toBe('MAJOR');
    expect(findings[0].status).toBe('OPEN');
  });

  it('throws TypeError when the issues array is absent', () => {
    expect(() => parseIssuesResponse({ total: 0 })).toThrow(TypeError);
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
// mapIssueToFinding
// ---------------------------------------------------------------------------

describe('mapIssueToFinding', () => {
  it('projects a well-shaped issue to the six-field finding shape', () => {
    const finding = mapIssueToFinding(
      {
        rule: 'typescript:S1234',
        severity: 'MAJOR',
        component: 'p:src/foo.ts',
        line: 12,
        message: 'oops',
        status: 'OPEN',
      },
      'p',
    );
    expect(finding).toEqual({
      rule: 'typescript:S1234',
      severity: 'MAJOR',
      file: 'src/foo.ts',
      line: 12,
      message: 'oops',
      status: 'OPEN',
    });
  });

  it('returns null when the entry is not an object', () => {
    expect(mapIssueToFinding(null, 'p')).toBeNull();
    expect(mapIssueToFinding(42, 'p')).toBeNull();
    expect(mapIssueToFinding('issue', 'p')).toBeNull();
  });

  it('substitutes defaults for absent optional fields', () => {
    const finding = mapIssueToFinding({ rule: 'r', component: 'p:f.ts' }, 'p');
    expect(finding).toEqual({
      rule: 'r',
      severity: 'UNKNOWN',
      file: 'f.ts',
      line: 0,
      message: '',
      status: 'UNKNOWN',
    });
  });

  it('leaves the path unchanged when the project prefix is absent', () => {
    const finding = mapIssueToFinding({ rule: 'r', component: 'other:f.ts' }, 'p');
    expect(finding?.file).toBe('other:f.ts');
  });
});
