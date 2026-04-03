/**
 * Convention check functions — pure logic, no I/O.
 *
 * Each check receives pre-read data and pushes violations into an array.
 * This separation allows unit testing without filesystem access.
 *
 * Imported by:
 * - scripts/check-conventions.mjs (CLI runner)
 * - scripts/conventions/checks.test.mjs (unit tests)
 *
 * DESIGN DECISIONS:
 *
 * Regex-based, not AST-based (deliberate).
 * This is a best-effort heuristic that trades precision for zero dependencies
 * and simplicity. The project has ~30 .ts files with flat, declarative data
 * modules — no edge cases like `parseInt` inside strings or `interface` inside
 * block comments exist today. Known limitations:
 *
 * - Matches inside strings, template literals, and block comments are NOT
 *   excluded. If a false positive appears, fix the heuristic or promote
 *   the affected rule to AST-based checking (ts-morph / TS Compiler API).
 * - The `interface` regex uses a line-start anchor to reduce false positives
 *   but cannot distinguish declarations from documentation examples.
 *
 * Reconsider this approach when:
 * - False positives appear in CI that require suppression comments
 * - The script grows beyond ~5 rules (at that point, a proper lint plugin
 *   or ts-morph integration pays for itself)
 * - The project starts using .tsx files (currently not the case)
 */

/**
 * Violation shape shared across all checks.
 * @typedef {{ file: string, line: number, rule: string, message: string, content: string }} Violation
 */

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Check if a .ts filename (without extension) is camelCase (or single word).
 *  Allows digits after the first letter (e.g., `step2Utils`).
 *  Test/spec suffixes are part of the name and handled by the regex. */
export function isCamelCase(name) {
  return /^[a-z][a-zA-Z0-9]*(\.(test|spec))?$/.test(name);
}

// ---------------------------------------------------------------------------
// Check 1: No parseInt / parseFloat
// ---------------------------------------------------------------------------

/**
 * Detect parseInt/parseFloat usage.
 *
 * Google TS §5: "Code must not use parseInt or parseFloat to parse numbers."
 * Matches both standalone (`parseInt(...)`) and namespaced (`Number.parseInt(...)`)
 * forms — the Google guide prohibits both.
 *
 * Skips single-line comments (`//` and leading `*` for JSDoc continuations).
 * Does NOT skip block comments or strings — see DESIGN DECISIONS above.
 *
 * @param {string} file — file path (for violation reporting)
 * @param {string[]} lines — file content split by newline
 * @param {Violation[]} violations — array to push findings into
 */
export function checkNoParseInt(file, lines, violations) {
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trimStart();
    if (trimmed.startsWith('//') || trimmed.startsWith('*')) {
      continue;
    }
    if (/\bparseInt\s*\(/.test(lines[i])) {
      violations.push({
        file,
        line: i + 1,
        rule: 'no-parse-int',
        message:
          'Avoid parseInt(). Prefer Number() for numeric conversion, apply Math.trunc() only when integer rounding is intended.',
        content: lines[i].trim(),
      });
    }
    if (/\bparseFloat\s*\(/.test(lines[i])) {
      violations.push({
        file,
        line: i + 1,
        rule: 'no-parse-float',
        message:
          'Avoid parseFloat(). Prefer Number() for numeric conversion. Note: Number() rejects trailing non-numeric characters that parseFloat() silently ignores.',
        content: lines[i].trim(),
      });
    }
  }
}

// ---------------------------------------------------------------------------
// Check 2: No `interface` for object shapes (ADR-0009)
// ---------------------------------------------------------------------------

/**
 * Detect `interface` declarations.
 *
 * Uses a line-start-anchored regex to match actual declarations:
 *   `interface Foo {`  or  `export interface Foo {`
 * This reduces (but does not eliminate) false positives from inline mentions.
 * See DESIGN DECISIONS above for known limitations.
 *
 * @param {string} file
 * @param {string[]} lines
 * @param {Violation[]} violations
 */
export function checkNoInterface(file, lines, violations) {
  for (let i = 0; i < lines.length; i++) {
    if (/^\s*(export\s+)?interface\s+\w+/.test(lines[i])) {
      violations.push({
        file,
        line: i + 1,
        rule: 'no-interface (ADR-0009)',
        message: 'Use `type` instead of `interface` for object shapes.',
        content: lines[i].trim(),
      });
    }
  }
}

// ---------------------------------------------------------------------------
// Check 3: File naming
// ---------------------------------------------------------------------------

/**
 * Verify .ts file names follow camelCase convention.
 *
 * Content-independent — only checks the filename, not the file contents.
 * Applied to ALL .ts files including tests (naming consistency is universal).
 *
 * @param {string} file — full file path
 * @param {string} nameWithoutExt — filename without extension (e.g., "quizContext" or "slugify.test")
 * @param {Violation[]} violations
 */
export function checkFileNaming(file, nameWithoutExt, violations) {
  if (!isCamelCase(nameWithoutExt)) {
    violations.push({
      file,
      line: 0,
      rule: 'file-naming',
      message: `File name should be camelCase, got "${nameWithoutExt}"`,
      content: '',
    });
  }
}
