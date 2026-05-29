import { describe, expect, it } from 'vitest';

import {
  checkS1Block,
  extractLinkTargets,
  extractSection,
  groupParagraphs,
  isWhollyEmphasised,
  slugifyHeading,
} from './checks.mjs';

// ---------------------------------------------------------------------------
// Helper: run an S1 check and return the findings array
// ---------------------------------------------------------------------------

function runS1(lines, descriptor) {
  const findings = [];
  checkS1Block('test.md', lines, descriptor, findings);
  return findings;
}

const S1_DESCRIPTOR = {
  sectionAnchor: 'agent-architecture',
  expectedLinkTarget: 'docs/AGENTS.md#the-seven-subagents',
};

// ---------------------------------------------------------------------------
// slugifyHeading
// ---------------------------------------------------------------------------

describe('slugifyHeading', () => {
  it('lowercases and hyphenates plain headings', () => {
    expect(slugifyHeading('The Seven Subagents')).toBe('the-seven-subagents');
  });

  it('strips parentheses and other punctuation', () => {
    expect(slugifyHeading('Critical Rules (never break these)')).toBe(
      'critical-rules-never-break-these',
    );
  });

  it('strips backtick fences and ampersands the way GitHub anchors do', () => {
    expect(slugifyHeading('Update Strategy & Package Rules')).toBe(
      'update-strategy--package-rules',
    );
  });

  it('handles surrounding whitespace', () => {
    expect(slugifyHeading('  Agent Architecture  ')).toBe('agent-architecture');
  });
});

// ---------------------------------------------------------------------------
// extractSection
// ---------------------------------------------------------------------------

describe('extractSection', () => {
  it('returns body lines up to the next same-level heading', () => {
    const lines = [
      '## Agent Architecture',
      'intro line',
      '',
      'second line',
      '## Next Section',
      'other content',
    ];
    expect(extractSection(lines, 'agent-architecture')).toEqual(['intro line', '', 'second line']);
  });

  it('does not stop at a deeper-level heading inside the section', () => {
    const lines = ['## Outer', 'a', '### Inner', 'b', '## Sibling', 'c'];
    expect(extractSection(lines, 'outer')).toEqual(['a', '### Inner', 'b']);
  });

  it('stops at a higher-level heading', () => {
    const lines = ['### Deep', 'a', '## Shallow', 'b'];
    expect(extractSection(lines, 'deep')).toEqual(['a']);
  });

  it('returns empty array when the anchor is not found', () => {
    expect(extractSection(['## Other', 'x'], 'missing')).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// groupParagraphs
// ---------------------------------------------------------------------------

describe('groupParagraphs', () => {
  it('joins multi-line paragraphs with single spaces', () => {
    const lines = ['first line', 'second line', '', 'third line'];
    expect(groupParagraphs(lines)).toEqual(['first line second line', 'third line']);
  });

  it('drops blank-only runs', () => {
    expect(groupParagraphs(['', '  ', 'only'])).toEqual(['only']);
  });
});

// ---------------------------------------------------------------------------
// isWhollyEmphasised
// ---------------------------------------------------------------------------

describe('isWhollyEmphasised', () => {
  it('accepts an underscore-wrapped paragraph', () => {
    expect(isWhollyEmphasised('_Canonical source for X._')).toBe(true);
  });

  it('accepts a single-asterisk-wrapped paragraph', () => {
    expect(isWhollyEmphasised('*emphasised*')).toBe(true);
  });

  it('rejects a bold (double-asterisk) paragraph', () => {
    expect(isWhollyEmphasised('**bold**')).toBe(false);
  });

  it('rejects a non-emphasised paragraph', () => {
    expect(isWhollyEmphasised('plain text')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// extractLinkTargets
// ---------------------------------------------------------------------------

describe('extractLinkTargets', () => {
  it('extracts the URL part, not the label', () => {
    expect(
      extractLinkTargets('see [`docs/AGENTS.md` § Roster](docs/AGENTS.md#the-seven-subagents)'),
    ).toEqual(['docs/AGENTS.md#the-seven-subagents']);
  });

  it('extracts multiple link targets in order', () => {
    expect(extractLinkTargets('[a](one) and [b](two)')).toEqual(['one', 'two']);
  });

  it('returns empty array when no links present', () => {
    expect(extractLinkTargets('no links here')).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// checkS1Block
// ---------------------------------------------------------------------------

describe('checkS1Block', () => {
  it('passes a well-formed single-line italic block', () => {
    const lines = [
      '## Agent Architecture',
      'intro',
      '',
      '_Canonical source for this roster: [`docs/AGENTS.md` § Roster](docs/AGENTS.md#the-seven-subagents). On disagreement, the docs/AGENTS.md side wins._',
    ];
    expect(runS1(lines, S1_DESCRIPTOR)).toHaveLength(0);
  });

  it('passes a well-formed MULTI-LINE italic paragraph (paragraph-join proof)', () => {
    const lines = [
      '## Agent Architecture',
      'intro',
      '',
      '_Canonical source for this roster:',
      '[`docs/AGENTS.md` § Roster](docs/AGENTS.md#the-seven-subagents). On',
      'disagreement, the docs/AGENTS.md side wins._',
    ];
    expect(runS1(lines, S1_DESCRIPTOR)).toHaveLength(0);
  });

  it('reports absence when no Canonical-source italic paragraph exists', () => {
    const lines = ['## Agent Architecture', 'intro', '', 'just some prose.'];
    const findings = runS1(lines, S1_DESCRIPTOR);
    expect(findings).toHaveLength(1);
    expect(findings[0].kind).toBe('absence');
    expect(findings[0].shape).toBe('S1');
  });

  it('reports absence when the section anchor is missing', () => {
    const lines = ['## Other Section', 'content'];
    const findings = runS1(lines, S1_DESCRIPTOR);
    expect(findings).toHaveLength(1);
    expect(findings[0].kind).toBe('absence');
  });

  it('reports malformation when the expected link is missing', () => {
    const lines = [
      '## Agent Architecture',
      '',
      '_Canonical source for this roster: the docs/AGENTS.md side wins._',
    ];
    const findings = runS1(lines, S1_DESCRIPTOR);
    expect(findings).toHaveLength(1);
    expect(findings[0].kind).toBe('malformation');
    expect(findings[0].message).toContain('missing a link');
  });

  it('reports malformation when the link points at the wrong target', () => {
    const lines = [
      '## Agent Architecture',
      '',
      '_Canonical source for this roster: [x](docs/OTHER.md#elsewhere). The docs/OTHER.md side wins._',
    ];
    const findings = runS1(lines, S1_DESCRIPTOR);
    expect(findings).toHaveLength(1);
    expect(findings[0].kind).toBe('malformation');
    expect(findings[0].message).toContain('missing a link');
  });

  it('reports malformation when the "side wins" clause is missing', () => {
    const lines = [
      '## Agent Architecture',
      '',
      '_Canonical source for this roster: [x](docs/AGENTS.md#the-seven-subagents)._',
    ];
    const findings = runS1(lines, S1_DESCRIPTOR);
    expect(findings).toHaveLength(1);
    expect(findings[0].kind).toBe('malformation');
    expect(findings[0].message).toContain('side wins');
  });

  it('does not treat a non-italic paragraph mentioning Canonical source as the note', () => {
    const lines = [
      '## Agent Architecture',
      '',
      'The Canonical source is documented elsewhere with a link [x](docs/AGENTS.md#the-seven-subagents) side wins.',
    ];
    const findings = runS1(lines, S1_DESCRIPTOR);
    expect(findings).toHaveLength(1);
    expect(findings[0].kind).toBe('absence');
  });
});
