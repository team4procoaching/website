# Documentation follow-ups — CONVENTIONS.md structural gaps

Recorded: 2026-05-01

## Origin

Two structural gaps in `docs/CONVENTIONS.md` were surfaced while introducing the
Topic Hub Index. They sit outside the scope of that change (which deliberately
carved them out) and are recorded here so the structural analysis is not lost.

## DEBT-260501-01 — Forms section is missing from CONVENTIONS.md

**Finding.** `CLAUDE.md`'s Conventions Quick Reference lists
`Forms: Netlify Forms with honeypot spam protection` as an authoritative bullet,
but `docs/CONVENTIONS.md` has no Forms section to back it. Every other Quick
Reference bullet resolves to a CONVENTIONS.md heading via an inline "see
CONVENTIONS.md § <Section>" pointer; the Forms bullet stays bare because there
is no destination.

**Why it matters.** A future contributor or AI subagent writing a form has no
canonical reference for the Netlify-Forms-plus-honeypot pattern. The rule exists
implicitly in the codebase but is not codified.

**Suggested resolution.** New `## Forms` H2 in `docs/CONVENTIONS.md` covering:
Netlify Forms attribute set, honeypot field convention, validation approach,
error display, redirect-on-success pattern. Update the Topic Hub Index entry and
the `CLAUDE.md` `Forms:` bullet pointer in the same change.

**Effort.** M — requires deciding what is canonical, what is example, and what
stays out of scope before writing prose.

## DEBT-260501-02 — `### Image Handling` is misfiled under `## TypeScript Conventions`

**Finding.** The Image Handling rules (`SmartImage` wrapper, `ImageSource`
discriminated union, decorative-image cutoff) live as an H3 inside
`## TypeScript Conventions` in `docs/CONVENTIONS.md`. The Topic Hub Index entry
and the `CLAUDE.md` `Images:` bullet both point at this H3 path explicitly. Both
work today.

**Why it matters.** Image handling is an asset-pipeline concern, not a
TypeScript-style concern. A reader scanning CONVENTIONS.md's table of contents
would not find it under TypeScript. Promoting or moving the H3 tightens the
document's structure.

**Suggested resolution.** Promote Image Handling to its own H2, move it under §
CSS Conventions, or introduce a new § Assets section. Update the Topic Hub Index
entry's anchor and the `CLAUDE.md` `Images:` bullet pointer in the same change.

**Effort.** S — one placement decision plus three coupled edits (CONVENTIONS
heading, Hub Index entry, CLAUDE.md bullet).
