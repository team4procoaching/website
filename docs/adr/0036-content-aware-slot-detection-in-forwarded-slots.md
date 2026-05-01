# Content-Aware Slot Detection in Forwarded Slots

Date: 2026-04-24

## Status

Accepted

## Context

`Astro.slots.has(name)` is whitespace-permissive. It returns `true` whenever the
consumer's source contains anything between the open and close tags of the
component invocation — pure indentation whitespace, comment nodes, and JSX
expressions that render to an empty string all count. The check inspects the
parsed slot payload, not the rendered output.

For a component that owns its own consumers (the slot is written inline at the
call site), this is harmless: a developer who writes `<Card><p>...</p></Card>`
clearly intends a header slot, and a developer who writes `<Card />` clearly
does not.

The behaviour changes when a wrapper component **forwards** a slot via
`<slot />` to a child:

```astro
<!-- Wrapper.astro -->
<SectionHeader headline={headline}>
  <slot />
</SectionHeader>
```

The literal source of `Wrapper.astro` always contains a child node between the
`<SectionHeader>` tags (the `<slot />` element itself, plus the indentation
around it), regardless of what the outer caller of `<Wrapper>` passes. Inside
`SectionHeader`, `Astro.slots.has('default')` therefore returns `true` even when
no caller has supplied any default content. If `SectionHeader` uses that flag to
gate visible markup — for instance, an intro-text wrapper with top-margin
spacing — the wrapper renders as an empty element and produces visible layout
artefacts: extra vertical gap, stacked spacing collisions with adjacent
siblings.

This was not theoretical. The section-adapter pattern documented in
`docs/CONVENTIONS.md` ("Section Components Wrap `Content.astro`") routes every
adapter's default slot through a two-step forwarding chain: `Stats`, `Coaches`,
`Usps`, and `SuccessStories` forward into `Content.astro`, which forwards into
`SectionHeader`. `TestimonialGrid` takes a direct single-step variant into
`SectionHeader`. Each of these six forwarders registered a non-empty slot
payload under `Astro.slots.has('default')` in `SectionHeader` even when the
outermost caller passed nothing — producing an empty `<div class="mt-6 ...">`
below the heading, doubling the gap before the next payload.

Commit `aeacd2f`
(`fix(section-header): detect empty default slot via render-and-trim`) shipped
the render-and-trim fix inside `SectionHeader` and closed the trap for the whole
forwarding wave in one change, rather than patching each forwarder. The trap was
first documented in
`src/components/sections/services/ServicesCatalog.astro:64-69` as a JSDoc note
suggesting the trim-fallback for "future consumers passing whitespace-only" —
that future arrived, but the convention had no canonical home, and the trap
stayed armed across the entire section-adapter pattern.

### Decision drivers

- **Structural safety over reviewer discipline.** A convention named in one
  component's JSDoc will be missed by the next architect designing the next
  forwarder. The pattern needs a documented home an audit can point at.
- **Fix the trap at the source, not at every forwarder.** Patching individual
  wrapper components to compensate for `slots.has` semantics leaves the same bug
  latent in every other forwarder; the contract belongs to the slotted child.
- **Do not blanket-replace `Astro.slots.has`.** It is still the right call for
  inline-only consumption. A rule that converts every existing call site is
  noise; the rule must carve out where the trap actually applies.

### Evaluated approaches

1. **Keep documenting the trim-idiom in per-component JSDoc.** Rejected — a
   JSDoc-only convention is invisible to anyone not already reading the specific
   file. The `SectionHeader` regression occurred with the prior-art comment
   sitting two folders away.
2. **Replace `Astro.slots.has` everywhere with render-and-trim.** Rejected —
   this incurs a render pass on every slot detection, including ones that do not
   need it, and obscures the actual signal (the trap is forwarding, not the
   API).
3. **Codify a content-aware detection rule scoped to the forwarding case,
   anchored by an ADR with a copy-paste implementation snippet.** **Chosen.**

## Decision

When a component reads a slot's presence to gate visible rendering, and the slot
can be forwarded into the component by an intermediate wrapper, presence
**must** be determined by rendering the slot and trimming its output, not by
`Astro.slots.has`.

Concretely, the slotted child uses:

```astro
---
const slotHtml = (await Astro.slots.render('default')) ?? '';
const hasSlotContent = slotHtml.trim().length > 0;
---

{
  hasSlotContent && (
    <div class="...wrapper classes...">
      <Fragment set:html={slotHtml} />
    </div>
  )
}
```

The `?? ''` coalesce is defensive — `Astro.slots.render` returns `undefined`
when the slot is unbound — and keeps `trim()` total over the result. The
template emits the rendered HTML via `<Fragment set:html>` rather than a second
`<slot />`, so the slot is consumed exactly once.

The wrapper component (the forwarder) reverts to an unconditional `<slot />`
forward. The gating logic lives in the child where the trap originates.

### When the rule applies

The rule applies when both of the following are true:

1. **The slot is forwarded into the component today by at least one live
   caller** (grep-verifiable via `<slot />` inside an intermediate wrapper that
   invokes this component).
2. **The slot's presence drives visible markup** — a wrapper element, a spacing
   rule, conditional chrome. An empty rendered slot would produce a visible
   artefact.

Condition 1 is mechanically decidable — a grep finds forwarders or it does not.
A future forwarder triggers migration at that point, not speculatively earlier.
This matches the framing the prior-art JSDoc in `ServicesCatalog.astro:64-69`
used before commit `aeacd2f` shrunk it to a pointer ("if a future consumer
passes whitespace-only, switch to…").

### When `Astro.slots.has` remains acceptable

- The component has no live forwarder today and no plan to be wrapped by one.
  Its slot payloads are always written directly at the call site.
- The detection has no visible-markup consequence (e.g., a class toggle that
  does not change layout, a logging branch).
- A self-closing call (`<X />`) is a structurally meaningful contract distinct
  from an empty-slot call, and the component documents the distinction.

The rule does not justify a blanket sweep of existing `Astro.slots.has` call
sites. Each site is evaluated against the two conditions above; a separate
debt-audit pass identifies violators (see Compliance below).

### Anti-pattern

```astro
---
// Anti-pattern: slot may be forwarded into this component.
const hasSlotContent = Astro.slots.has('default');
---

{
  hasSlotContent && (
    <div class="mt-6 ...">
      <slot />
    </div>
  )
}
```

This renders an empty `<div class="mt-6 ...">` whenever a wrapper forwards an
absent slot through `<slot />`.

### What does NOT change

- `Astro.slots.has` remains the API for inline-only slot detection. This ADR
  does not deprecate it.
- Slot naming, `Props` typing for slottable components, and the
  [`type Props` contract](../CONVENTIONS.md#typescript-conventions)
  (consolidated from ADR-0009) are unaffected.
- The extract-first composition policy
  ([ADR-0034](0034-extract-first-for-ai-assisted-development.md)) is unchanged —
  the rule applies inside extracted components, not against extraction.
- No retroactive sweep of `Astro.slots.has` call sites. Migration is per-site
  and evaluated against the two conditions above.

### Scope and non-goals

**In scope:**

- The slot-presence detection idiom for any slot that has a live forwarder and
  drives visible markup.
- The negative-space definition that bounds the rule.
- A canonical implementation snippet that other components copy.

**Out of scope:**

- Slot composition strategies beyond presence detection (multi-slot
  fall-through, named-slot fallbacks, slot-content type validation).
- A debt-register entry for existing violators — produced by a separate
  `debt-auditor` pass over the `Astro.slots.has` call sites identified in
  Compliance.
- Build-time perf budgets for slot rendering — eager rendering of one
  paragraph-sized slot per detection is not a measurable cost in this static
  build.

## Consequences

### Positive

- The forwarding-trap class of bugs closes at the contract boundary. New
  forwarders inherit correct behaviour from the slotted child.
- One named convention with one canonical implementation — the next architect
  designing a slottable component has a single document to consult.
- Pattern alignment with the prior-art pointer in
  `src/components/sections/services/ServicesCatalog.astro`. That comment is now
  a two-line pointer at this ADR rather than re-deriving the rationale inline.
- Negative space is defined: existing `Astro.slots.has` call sites are not
  blanket-rewritten, only those meeting both forwarding-and-visible conditions.

### Negative

- A small build-time cost per detection: the slot renders once to test for
  presence, even when the wrapper would not be emitted. For a static Astro build
  with paragraph-sized slot payloads, this is negligible and produced no
  measurable regression in the `SectionHeader` rollout.
- Two-sided contract: the rule lives in the slotted child, but the trigger
  (forwarding via `<slot />`) lives in the wrapper. A reviewer auditing only the
  wrapper cannot tell whether the child follows the rule without reading the
  child as well. The in-code comment pointing at this ADR mitigates the gap.

### Risk mitigation

- **Convention drift in new components.** Every slottable component whose slot
  is **forwardable and** drives visible markup carries a one-line comment
  referencing this ADR next to the detection. The comment is the canonical
  reminder; the snippet above is the canonical shape. Non-forwarded visible-gate
  sites — currently `Card.astro` and `Content.astro` — do not carry the pointer,
  because they are Compliant under the rule and a comment would misleadingly
  suggest the render-and-trim idiom applies.
- **Negative-space misapplication.** A reviewer who suspects an
  `Astro.slots.has` violation evaluates the two `When the rule applies`
  conditions before flagging. A site failing either condition is not a
  violation.

## Compliance

Live `Astro.slots.has` call sites at the time of acceptance (from
`rg "Astro\.slots\.has" src/`, see concept's Consumers section for the full
command output):

| Site                                                                                                | Forwarding today? | Visible-gate? | Status                                                                                                                                                                                                                                                                           |
| :-------------------------------------------------------------------------------------------------- | :---------------- | :------------ | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/components/ui/Card.astro:40-41` (`header`, `footer`)                                           | No                | Yes           | **Compliant** — no live forwarder today; revisit if one appears. Per the tightened condition 1, future-triggered migration applies: if a Card-wrapping adapter forwards its default/header/footer into Card's slots, Card migrates to render-and-trim at that point.             |
| `src/components/sections/Content.astro:76-77` (`content`, `aside`)                                  | No                | Yes           | **Compliant** — named slots `content` and `aside` are passed inline via `<Fragment slot="...">` by section adapters; no `<slot name="content" />` forwarding chain exists. The default-slot forward at `Content.astro:137` is a separate slot and is handled by `SectionHeader`. |
| `src/components/sections/services/ServicesCatalog.astro:66-67` (`intro-primary`, `intro-secondary`) | No                | Yes           | **Compliant** — slots are consumed inline by the `/services` page only; no forwarder.                                                                                                                                                                                            |
| `src/components/ui/SectionHeader.astro` (default slot, render-and-trim already live)                | Yes               | Yes           | **Compliant — canonical implementation.** Six live forwarders (see Context).                                                                                                                                                                                                     |

**Non-compliance-table callers.** Five section adapters — `Stats.astro`,
`Coaches.astro`, `Usps.astro`, `SuccessStories.astro`, and
`TestimonialGrid.astro` — each forward their default slot through
`Content.astro` into `SectionHeader` (or directly, for `TestimonialGrid`). They
contain no `Astro.slots.has` call of their own, so they are not Compliance-table
entries. They inherit correct behaviour from the `SectionHeader` render-and-trim
implementation. The six live forwarders are listed here to document the full
reach of the chain that commit `aeacd2f` closed in one change.

A separate `debt-auditor` pass re-evaluates each call site against the two
conditions above when it runs. That pass is not part of this ADR.

## References

- Commit `aeacd2f` —
  `fix(section-header): detect empty default slot via render-and-trim`, the
  regression that triggered this codification.
- [`src/components/ui/SectionHeader.astro`](../../src/components/ui/SectionHeader.astro)
  frontmatter render-and-trim block — canonical live implementation.
- [`docs/CONVENTIONS.md`](../CONVENTIONS.md) § "Section Components Wrap
  `Content.astro`" — the forwarding pattern this ADR addresses; the
  cross-reference goes both ways.
- [Astro reference: `Astro.slots`](https://docs.astro.build/en/reference/api-reference/#astroslots)
  — upstream documentation for `slots.has` and `slots.render`.
- [`type Props` for components](../CONVENTIONS.md#typescript-conventions) —
  consolidated from ADR-0009, unchanged by this decision.
- [ADR-0034](0034-extract-first-for-ai-assisted-development.md) — extract-first
  composition; the rule applies inside extracted components, not against
  extraction.
