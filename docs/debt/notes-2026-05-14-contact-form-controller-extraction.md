# ContactForm Form-Init Controller Extraction (2026-05-14)

The Contact-Form revision that added the Configurator branch and the
Configurator-wins-over-Quiz short-circuit pushed the inline form-init `<script>`
block in `src/components/sections/contact/ContactForm.astro` from ~150 LOC to
~210 LOC. At that size, ADR-0020's "complex scripts → extract" guidance and the
ADR-0026 `bootstrapOnLoad` + ADR-0037 jsdom-test pattern collectively argue for
moving the form-init logic into `src/scripts/contactFormController.ts` with a
sibling `*.test.ts` mirroring the existing `quizModalController` /
`accordionController` shape.

This document is a `notes-` bundle, not an `audit-` report — it captures a
deferred-extraction rationale recorded at the time the Configurator branch
shipped.

## DEBT-260514-01 — Extract `ContactForm` form-init script

### Why deferred at first observation

Extracting the script in the same delivery would have added ~300–500 LOC of test
scaffolding (a moved-logic file, a jsdom-fixture test covering four behavioural
branches plus idempotent init, and the migration of every inline `querySelector`
and event binding into the new controller) on top of a delivery already carrying
three substantive adjustments plus two structural fixes. The same-PR escalation
trigger — _a reviewer-blocker filed against the conflict resolution branch_ —
would have forced extraction with the jsdom-fixture invented against a concrete
bug, not in the abstract. That trigger did not fire (review returned clean), so
the extraction is deferred to a follow-up stream.

### Exit condition

The item closes when:

1. `src/scripts/contactFormController.ts` exists with the moved form-init logic.
2. `src/scripts/contactFormController.test.ts` covers the four behavioural
   branches — quiz prefill, Configurator prefill, the conflict resolution that
   lets Configurator win over Quiz, validation copy for the required service
   field — plus an idempotent-init case.
3. The inline `<script>` block in `ContactForm.astro` shrinks to a single
   `bootstrapOnLoad` import and a single function call mirroring the
   `quizModalController` / `accordionController` shape.

### Estimated effort

Medium: ~300–500 LOC across the new controller, its test file, and the
inline-to-controller migration. Comparable in shape to the existing
`quizModalController` and `accordionController` files.

### Suggested trigger to pick up

Any of the following warrants reopening:

- A reviewer-blocker is found against the form-init script behaviour (the
  Configurator branch, the conflict-resolution short-circuit, the validation
  copy for the required service field) in a subsequent PR.
- The inline form-init block grows beyond ~210 LOC.
- A second consumer of the form-init helper logic emerges (currently only
  `ContactForm.astro` consumes it).
