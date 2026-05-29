/**
 * Doc-consistency recognition functions — pure logic, no I/O.
 *
 * Each function receives pre-read Markdown content (as a line array) plus an
 * expectation descriptor and returns a findings array. The separation from the
 * runner allows unit testing without filesystem access.
 *
 * Imported by:
 * - scripts/check-doc-consistency.mjs (CLI runner)
 * - scripts/doc-consistency/checks.test.mjs (unit tests)
 *
 * DESIGN DECISIONS:
 *
 * Regex/string-token based, not Markdown-AST based (deliberate).
 * The recognition is content-addressed by section anchor + required tokens, not
 * by line number, so prose reflow inside a section does not break it. This is a
 * best-effort heuristic that trades parser precision for zero dependencies,
 * consistent with the deliberate regex-not-AST choice in
 * scripts/conventions/checks.mjs. The protected set is six static surfaces; an
 * AST parser would be disproportionate.
 *
 * Each note shape (S1/S2/S3) has its OWN recognition rule and its OWN
 * well-formedness definition. There is deliberately no single "well-formed note"
 * predicate — that is the heart of the false-positive defence.
 */

/**
 * Finding shape shared across all recognition functions.
 *
 * - kind: 'absence' (the note/structure is missing entirely),
 *   'malformation' (the note is present but a required element is dropped or
 *   wrong), or 'divergence' (roster cells differ across copies).
 *
 * @typedef {{ file: string, anchor: string, shape: string, kind: string, message: string }} Finding
 */

// ---------------------------------------------------------------------------
// Section extraction
// ---------------------------------------------------------------------------

/**
 * Slugify a Markdown heading text the way GitHub anchors are derived: lowercase,
 * drop characters that are not alphanumeric / space / hyphen, then convert runs
 * of whitespace to single hyphens. Backtick fences and other punctuation are
 * stripped (e.g. `Critical Rules (never break these)` → `critical-rules-never-break-these`).
 *
 * @param {string} headingText — the text after the leading `#` markers
 * @returns {string} the anchor slug
 */
export function slugifyHeading(headingText) {
  return headingText
    .trim()
    .toLowerCase()
    .replaceAll(/[^a-z0-9 -]/g, '')
    .trim()
    .replaceAll(/ /g, '-');
}

/**
 * Parse a heading line into { level, slug } or null when the line is not an
 * ATX heading. Only `#`-prefixed headings are recognised (the docs use ATX
 * exclusively).
 *
 * @param {string} line
 * @returns {{ level: number, slug: string } | null}
 */
function parseHeading(line) {
  const match = /^(#{1,6})\s+(.*)$/.exec(line);
  if (!match) {
    return null;
  }
  return { level: match[1].length, slug: slugifyHeading(match[2]) };
}

/**
 * Extract the block of lines belonging to the section identified by `anchor`:
 * from the matching heading (exclusive) up to — but not including — the next
 * heading of the same or higher level. Returns an empty array when no heading
 * matches the anchor.
 *
 * @param {string[]} lines — the full document split by newline
 * @param {string} anchor — the heading slug to locate
 * @returns {string[]} the section body lines (heading line excluded)
 */
export function extractSection(lines, anchor) {
  let startIndex = -1;
  let sectionLevel = 0;
  for (let i = 0; i < lines.length; i++) {
    const heading = parseHeading(lines[i]);
    if (heading && heading.slug === anchor) {
      startIndex = i;
      sectionLevel = heading.level;
      break;
    }
  }
  if (startIndex === -1) {
    return [];
  }
  const body = [];
  for (let i = startIndex + 1; i < lines.length; i++) {
    const heading = parseHeading(lines[i]);
    if (heading && heading.level <= sectionLevel) {
      break;
    }
    body.push(lines[i]);
  }
  return body;
}

// ---------------------------------------------------------------------------
// Paragraph grouping
// ---------------------------------------------------------------------------

/**
 * Group section body lines into paragraphs (blank-line-separated runs), joining
 * each paragraph's physical lines with a single space. This lets a `_…_` italic
 * block that opens on one physical line and closes two or three lines later be
 * recognised as one emphasised paragraph.
 *
 * @param {string[]} lines
 * @returns {string[]} joined paragraph strings (no empty paragraphs)
 */
export function groupParagraphs(lines) {
  const paragraphs = [];
  let current = [];
  for (const line of lines) {
    if (line.trim() === '') {
      if (current.length > 0) {
        paragraphs.push(current.join(' ').trim());
        current = [];
      }
    } else {
      current.push(line.trim());
    }
  }
  if (current.length > 0) {
    paragraphs.push(current.join(' ').trim());
  }
  return paragraphs;
}

/**
 * Test whether a joined paragraph is wholly emphasised — i.e. wrapped in a
 * single `_…_` italic span spanning the whole paragraph. Markdown italic can use
 * `_` or `*`; the live blocks all use `_`, so we accept either underscore or
 * single-asterisk wrappers but require the wrapper to span the entire paragraph.
 *
 * @param {string} paragraph
 * @returns {boolean}
 */
export function isWhollyEmphasised(paragraph) {
  const p = paragraph.trim();
  if (p.startsWith('_') && p.endsWith('_') && p.length > 1) {
    return true;
  }
  // Single-asterisk italic (not bold `**`).
  if (
    p.startsWith('*') &&
    !p.startsWith('**') &&
    p.endsWith('*') &&
    !p.endsWith('**') &&
    p.length > 1
  ) {
    return true;
  }
  return false;
}

/**
 * Extract the URL targets of all Markdown links `[label](target)` in a string.
 *
 * @param {string} text
 * @returns {string[]} link targets in order of appearance
 */
export function extractLinkTargets(text) {
  const targets = [];
  const linkPattern = /\[[^\]]*\]\(([^)]+)\)/g;
  let match = linkPattern.exec(text);
  while (match !== null) {
    targets.push(match[1]);
    match = linkPattern.exec(text);
  }
  return targets;
}

// ---------------------------------------------------------------------------
// Shape S1 — standalone italic block (surfaces 1, 2, 3, 4)
// ---------------------------------------------------------------------------

/**
 * Recognise a well-formed standalone-italic canonical-pointer-note (shape S1).
 *
 * Well-formed iff, within the section under `descriptor.sectionAnchor`, an
 * emphasised paragraph exists that satisfies ALL of:
 *   1. is wholly emphasised, AND
 *   2. contains the lead token `Canonical source` (case-sensitive), AND
 *   3. contains a Markdown link whose target includes
 *      `descriptor.expectedLinkTarget`, AND
 *   4. contains a precedence clause — the substring `side wins`.
 *
 * Findings:
 *   - No emphasised paragraph passing (1)+(2) → one `absence` finding.
 *   - A candidate paragraph (passes 1+2) that drops (3) or (4) → one
 *     `malformation` finding naming the dropped/mismatched element.
 *
 * @param {string} file
 * @param {string[]} lines — the full document split by newline
 * @param {{ sectionAnchor: string, expectedLinkTarget: string }} descriptor
 * @param {Finding[]} findings — array to push findings into
 */
export function checkS1Block(file, lines, descriptor, findings) {
  const { sectionAnchor, expectedLinkTarget } = descriptor;
  const section = extractSection(lines, sectionAnchor);
  const paragraphs = groupParagraphs(section);

  const candidate = paragraphs.find((p) => isWhollyEmphasised(p) && p.includes('Canonical source'));

  if (candidate === undefined) {
    findings.push({
      file,
      anchor: sectionAnchor,
      shape: 'S1',
      kind: 'absence',
      message: `No standalone italic "Canonical source" note found in section "${sectionAnchor}".`,
    });
    return;
  }

  const targets = extractLinkTargets(candidate);
  const hasExpectedLink = targets.some((t) => t.includes(expectedLinkTarget));
  if (!hasExpectedLink) {
    findings.push({
      file,
      anchor: sectionAnchor,
      shape: 'S1',
      kind: 'malformation',
      message: `Canonical-source note in "${sectionAnchor}" is missing a link to "${expectedLinkTarget}".`,
    });
  }

  if (!candidate.includes('side wins')) {
    findings.push({
      file,
      anchor: sectionAnchor,
      shape: 'S1',
      kind: 'malformation',
      message: `Canonical-source note in "${sectionAnchor}" is missing the "side wins" precedence clause.`,
    });
  }
}

// ---------------------------------------------------------------------------
// Shape S2 — link-less precedence line (surface 5)
// ---------------------------------------------------------------------------

/**
 * Recognise a well-formed link-less precedence line (shape S2).
 *
 * This shape deliberately does NOT require a Markdown link — the surface names
 * its canonical source (`docs/CONVENTIONS.md / the cited ADR`) in prose, not as a
 * link. Requiring a link here would be a guaranteed false positive, so the
 * descriptor carries no expected-link-target field.
 *
 * Well-formed iff, within the section under `descriptor.sectionAnchor`, an
 * emphasised paragraph exists that satisfies ALL of:
 *   1. is wholly emphasised, AND
 *   2. contains the token `is a summary`, AND
 *   3. contains the canonical-source phrase `canonical prose lives in`, AND
 *   4. contains the precedence clause `canonical wins`.
 *
 * Findings:
 *   - No emphasised paragraph passing (1)+(2) → one `absence` finding.
 *   - A candidate paragraph (passes 1+2) that drops (3) or (4) → one
 *     `malformation` finding naming the dropped element.
 *
 * @param {string} file
 * @param {string[]} lines — the full document split by newline
 * @param {{ sectionAnchor: string }} descriptor
 * @param {Finding[]} findings — array to push findings into
 */
export function checkS2PrecedenceLine(file, lines, descriptor, findings) {
  const { sectionAnchor } = descriptor;
  const section = extractSection(lines, sectionAnchor);
  const paragraphs = groupParagraphs(section);

  const candidate = paragraphs.find((p) => isWhollyEmphasised(p) && p.includes('is a summary'));

  if (candidate === undefined) {
    findings.push({
      file,
      anchor: sectionAnchor,
      shape: 'S2',
      kind: 'absence',
      message: `No link-less "is a summary" precedence line found in section "${sectionAnchor}".`,
    });
    return;
  }

  if (!candidate.includes('canonical prose lives in')) {
    findings.push({
      file,
      anchor: sectionAnchor,
      shape: 'S2',
      kind: 'malformation',
      message: `Precedence line in "${sectionAnchor}" is missing the "canonical prose lives in" canonical-source phrase.`,
    });
  }

  if (!candidate.includes('canonical wins')) {
    findings.push({
      file,
      anchor: sectionAnchor,
      shape: 'S2',
      kind: 'malformation',
      message: `Precedence line in "${sectionAnchor}" is missing the "canonical wins" precedence clause.`,
    });
  }
}

// ---------------------------------------------------------------------------
// Shape S3 — inline see-cross-reference (surface 6)
// ---------------------------------------------------------------------------

/**
 * Extract the single bullet (and its continuation lines) whose text contains the
 * given lead phrase, joined into one string. A bullet starts with a `-`/`*`/`+`
 * list marker; continuation lines are the subsequent non-marker, non-blank lines
 * indented under it. Returns null when no bullet contains the lead phrase.
 *
 * Keying on a single bullet — not the whole section paragraph — is what keeps S3
 * from being satisfied by an `adr-lifecycle` link living in a different bullet.
 *
 * @param {string[]} lines — section body lines
 * @param {string} leadPhrase
 * @returns {string | null}
 */
export function extractBulletContaining(lines, leadPhrase) {
  const isMarker = (line) => /^\s*[-*+]\s+/.test(line);
  for (let i = 0; i < lines.length; i++) {
    if (!isMarker(lines[i])) {
      continue;
    }
    const bulletLines = [lines[i].replace(/^\s*[-*+]\s+/, '')];
    for (let j = i + 1; j < lines.length; j++) {
      if (isMarker(lines[j]) || lines[j].trim() === '') {
        break;
      }
      bulletLines.push(lines[j].trim());
    }
    const text = bulletLines.join(' ').trim();
    if (text.includes(leadPhrase)) {
      return text;
    }
  }
  return null;
}

/**
 * Recognise a well-formed inline see-cross-reference (shape S3).
 *
 * This is the documented main false-positive risk: an inline `— see [link]` is
 * syntactically indistinguishable from dozens of ordinary cross-references. The
 * contract is therefore narrowly content-addressed to ONE bullet via its unique
 * lead phrase, never to "any inline see-link".
 *
 * Well-formed iff, within the section under `descriptor.sectionAnchor`:
 *   1. a bullet whose text contains `descriptor.leadPhrase` exists, AND
 *   2. that bullet contains a Markdown link whose target includes
 *      `descriptor.expectedLinkTarget`.
 *
 * Findings:
 *   - No bullet contains the lead phrase → one `absence` finding (the bullet was
 *     restructured away; the sensor goes noisy, never silently blind).
 *   - The bullet exists but drops the expected link target → one `malformation`
 *     finding.
 *
 * @param {string} file
 * @param {string[]} lines — the full document split by newline
 * @param {{ sectionAnchor: string, leadPhrase: string, expectedLinkTarget: string }} descriptor
 * @param {Finding[]} findings — array to push findings into
 */
export function checkS3InlineXref(file, lines, descriptor, findings) {
  const { sectionAnchor, leadPhrase, expectedLinkTarget } = descriptor;
  const section = extractSection(lines, sectionAnchor);
  const bullet = extractBulletContaining(section, leadPhrase);

  if (bullet === null) {
    findings.push({
      file,
      anchor: sectionAnchor,
      shape: 'S3',
      kind: 'absence',
      message: `No bullet containing the lead phrase "${leadPhrase}" found in section "${sectionAnchor}".`,
    });
    return;
  }

  const targets = extractLinkTargets(bullet);
  const hasExpectedLink = targets.some((t) => t.includes(expectedLinkTarget));
  if (!hasExpectedLink) {
    findings.push({
      file,
      anchor: sectionAnchor,
      shape: 'S3',
      kind: 'malformation',
      message: `The "${leadPhrase}" bullet in "${sectionAnchor}" is missing an inline cross-reference to "${expectedLinkTarget}".`,
    });
  }
}
