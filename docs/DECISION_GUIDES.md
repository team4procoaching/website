# Decision Guides

Reusable decision frameworks for recurring architectural questions. Each guide
provides a rule, applies it to this project's features, and documents when to
revisit the decision.

---

## Modal vs. Page

When a feature introduces a new view, use this guide to decide whether it should
be a modal/inline expand or a standalone page.

### The Rule

| Condition                                             | Use          |
| :---------------------------------------------------- | :----------- |
| Content is shareable via URL                          | Page         |
| Content is SEO-relevant (benefits from indexing)      | Page         |
| Content is substantial (500+ words, multiple images)  | Page         |
| Content is a quick preview in context of current page | Modal        |
| Content is a workflow step (quiz, form confirmation)  | Modal        |
| User expects to return to exactly where they were     | Modal/Expand |

### Applied to This Project

| Feature                         | Decision                         | Reasoning                                                                 |
| :------------------------------ | :------------------------------- | :------------------------------------------------------------------------ |
| Coach detail (current)          | Modal — stays                    | Quick preview, not SEO-relevant in isolation                              |
| Coach biography (if 500+ words) | Page (`/coaches/[slug]`)         | Substantial content, shareable, SEO value. Modal becomes teaser with link |
| Success Story detail            | Page (`/success-stories/[slug]`) | Shareable, SEO-relevant, multiple images                                  |
| Service additional info         | Inline expand                    | Short text, stays in context of service card                              |
| Quiz                            | Modal — stays                    | Workflow, not linkable content                                            |

### When in Doubt

Ask: "Would someone share a link to just this content?" If yes → page. If no →
modal or inline expand.

### After deciding

- **Page outcome** → the page is built as a dynamic detail route. See
  [ADR-0038 — Dynamic Detail Route Pattern](adr/0038-dynamic-detail-route-pattern.md)
  and
  [`CONVENTIONS.md` § Dynamic Detail Routes](CONVENTIONS.md#dynamic-detail-routes).
- **Modal outcome** → the modal trigger uses the Invokers API on a TailwindPlus
  element. See
  [ADR-0027 — Invokers API Modal Trigger Standard](adr/0027-invokers-api-modal-trigger-standard.md)
  and
  [ADR-0019 — Use TailwindPlus Elements for Interactive UI](adr/0019-use-tailwindplus-elements-for-interactive-ui.md).

---

## When to Use MDX

MDX was previously in the project and was intentionally removed to reduce
complexity. All pages currently use `.astro` files with typed data modules.

### When MDX Is Justified

MDX earns its place when **all three** conditions are met:

1. The page is **content-heavy** (primarily prose, not UI components)
2. The prose needs **embedded Astro components** (not just images — actual
   interactive elements like carousels, callout boxes, comparison tables)
3. The content will **change frequently** or be authored by someone who benefits
   from writing Markdown rather than editing `.astro` files

### When MDX Is Not Justified

- Pages that are **primarily components with some text** → use `.astro` with
  data modules
- Pages where the content is **static and rarely changes** → `.astro` is simpler
- Pages where the only "dynamic" part is **images** → `SmartImage` in `.astro`
  handles this
- Content that could be served by **typed data modules** (`as const satisfies`)
  → prefer type safety over MDX flexibility

### Applied to This Project

| Content                | MDX?  | Reasoning                                                                                                      |
| :--------------------- | :---- | :------------------------------------------------------------------------------------------------------------- |
| Coach biographies      | Maybe | Only if bios contain embedded components. Text + images → `.astro` with data module                            |
| How It Works expansion | No    | Structured content best served by typed data + components                                                      |
| Success Story details  | Maybe | If stories mix prose with before/after galleries and pull quotes, MDX could help. Evaluate when content exists |
| Privacy Policy / Terms | No    | Legal text, no components needed. Plain `.astro`                                                               |

### Current Decision

Do not reintroduce MDX now. None of the current features require it. Revisit
when coach biographies or success story detail pages are being built and the
actual content is available. The decision should be based on real content, not
hypothetical needs.
