import { describe, expect, it } from 'vitest';

import hotspotsResponseFixture from './fixtures/hotspots-response.json' with { type: 'json' };
import {
  buildHotspotsUrl,
  DEFAULT_HOTSPOT_LIFECYCLE_STATUSES,
  filterHotspotsByDefaultStatus,
  mapHotspotToFinding,
  parseHotspotsResponse,
} from './hotspots.mjs';
import { SONARCLOUD_BASE_URL } from './query.mjs';

const FIXTURE_PROJECT_KEY = 'team4procoaching_website';

// ---------------------------------------------------------------------------
// buildHotspotsUrl
// ---------------------------------------------------------------------------

const BRANCH_AXIS_MAIN = { kind: 'branch', name: 'main' };
const BRANCH_AXIS_FEATURE = { kind: 'branch', name: 'feature/foo bar' };
const PR_AXIS_42 = { kind: 'pullRequest', id: '42' };

describe('buildHotspotsUrl', () => {
  it('builds the project-scoped URL with no status, resolution, or files parameter', () => {
    const url = buildHotspotsUrl({ projectKey: 'p', branchAxis: BRANCH_AXIS_MAIN });
    expect(url).toBe(
      `${SONARCLOUD_BASE_URL}/api/hotspots/search?projectKey=p&p=1&ps=500&branch=main`,
    );
    expect(url).not.toContain('status=');
    expect(url).not.toContain('resolution=');
    expect(url).not.toContain('files=');
    expect(url).not.toContain('componentKeys=');
  });

  it('omits the files parameter when the file list is empty', () => {
    const url = buildHotspotsUrl({ projectKey: 'p', files: [], branchAxis: BRANCH_AXIS_MAIN });
    expect(url).not.toContain('files=');
  });

  it('uses files=<paths> for a single file scope (not componentKeys=)', () => {
    const url = buildHotspotsUrl({
      projectKey: 'p',
      files: ['src/utils/slugify.ts'],
      branchAxis: BRANCH_AXIS_MAIN,
    });
    expect(url).toContain('files=src%2Futils%2Fslugify.ts');
    expect(url).not.toContain('componentKeys=');
  });

  it('joins multiple files into a comma-separated files= parameter', () => {
    const url = buildHotspotsUrl({
      projectKey: 'p',
      files: ['scripts/generate-csp-hashes.mjs', 'src/utils/slugify.ts'],
      branchAxis: BRANCH_AXIS_MAIN,
    });
    expect(url).toContain('files=scripts%2Fgenerate-csp-hashes.mjs%2Csrc%2Futils%2Fslugify.ts');
  });

  it('respects a custom baseUrl override', () => {
    const url = buildHotspotsUrl({
      baseUrl: 'https://example.test',
      projectKey: 'p',
      branchAxis: BRANCH_AXIS_MAIN,
    });
    expect(url.startsWith('https://example.test/api/hotspots/search?')).toBe(true);
  });

  it('emits &branch=<encoded> when the axis is a branch', () => {
    const url = buildHotspotsUrl({ projectKey: 'p', branchAxis: BRANCH_AXIS_FEATURE });
    expect(url).toContain('branch=feature%2Ffoo+bar');
    expect(url).not.toContain('pullRequest=');
  });

  it('emits &pullRequest=<id> when the axis is a pull request', () => {
    const url = buildHotspotsUrl({ projectKey: 'p', branchAxis: PR_AXIS_42 });
    expect(url).toContain('pullRequest=42');
    expect(url).not.toContain('branch=');
  });
});

// ---------------------------------------------------------------------------
// parseHotspotsResponse
// ---------------------------------------------------------------------------

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
