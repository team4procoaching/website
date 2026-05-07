# Use `ImageSource` Discriminated Union and `SmartImage` Wrapper

Date: 2026-03-08

## Status

Accepted

## Context

The codebase handled images with a `string | ImageMetadata` union type and an
`isLocalImage()` type guard to branch between Astro's `<Image />` component (for
local assets) and a plain `<img>` tag (for remote URLs):

```astro
{
  isLocalImage(image.src) ? (
    <Image src={image.src} alt={image.alt} widths={[640, 960]} ... />
  ) : (
    <img src={image.src} alt={image.alt} loading="lazy" ... />
  )
}
```

This pattern existed in 6+ components, bypassed Astro's optimization for remote
images, and was error-prone.

Astro's `<Image />` natively supports both local assets and remote URLs, making
the `<img>` fallback unnecessary. However, migrating to `<Image />` exclusively
revealed a TypeScript limitation: Astro defines `<Image />` props as
discriminated union overloads (`src: ImageMetadata` vs. `src: string`). When
`src` is `string | ImageMetadata`, TypeScript cannot resolve the overload,
requiring type narrowing at every call site — even when both branches use
`<Image />`.

After consulting multiple independent reviews, the consensus was:

1. **Model the image source explicitly** with a discriminated union in the
   domain layer, not with `typeof` checks in templates.
2. **Encapsulate the narrowing once** in a wrapper component.
3. **Allow plain `<img>` for small decorative images** (≤ 64px) where
   optimization overhead is unjustified.

## Decision

All image handling uses a three-layer architecture:

### 1. `ImageSource` — Discriminated Union Type

Replaces `string | ImageMetadata` with an explicit domain model:

```typescript
type ImageSource =
  | { kind: 'local'; src: ImageMetadata }
  | { kind: 'remote'; src: string; width: number; height: number };
```

Remote images require explicit dimensions (no `inferSize` at build time). A
`remoteImage()` helper keeps data layers concise:

```typescript
image: remoteImage('https://example.com/photo.jpg', 800, 600);
```

### 2. `SmartImage.astro` — Wrapper Component

Handles Astro's `<Image />` type overloads in one place. Consumer components
pass `ImageSource` without any narrowing:

```astro
<SmartImage src={image.src} alt={image.alt} widths={[640, 960]} />
```

Internally, SmartImage narrows by `src.kind` and calls `<Image />` with the
correct overload. The narrowing logic exists exactly once.

### 3. Small Decorative Images — Plain `<img>`

Images ≤ 64px in any dimension (avatars, small badges) may use plain `<img>`
tags with explicit `width`/`height`. The build-time overhead of `<Image />`
(format conversion, srcset generation) is unjustified for these sizes.

**Documented exceptions for `<img>`:**

- `Logo.astro`: Decorative SVGs with `role="presentation"` and flexible sizing
- `CoachDetailModal.astro`: Runtime-dynamic `src` set via client-side JS
- `TestimonialCard.astro`: 40px avatar
- `SuccessStoryCardBody.astro`: 32px coach avatar badge (rendered through
  `SuccessStoryGridCard.astro`)

### Scope and Non-Goals

**In Scope:**

- `ImageSource` type and `remoteImage()` / `getImageUrl()` helpers
- `SmartImage.astro` wrapper component
- Migration of all components and data layers
- Updated `ImageProp` type using `ImageSource`

**Out of Scope:**

- `public/` image source kind (not currently used; trivially addable later)
- Astro responsive `layout` configuration (5.10+ feature)
- Migrating placeholder URLs to local assets

## Consequences

### Positive

- **Domain-driven types:** `kind: 'local' | 'remote'` is self-documenting and
  extensible (add `'public'` later if needed).
- **Single narrowing point:** SmartImage eliminates duplicated type checks
  across 6+ components.
- **Full optimization:** All content images go through Astro's pipeline (WebP
  conversion, srcset, dimension enforcement).
- **Pragmatic exceptions:** Small decorative images avoid unnecessary build
  overhead.
- **Clean consumer API:** Components write `<SmartImage src={...} />` — no
  branching, no type guards, no `inferSize` decisions.

### Negative

- **More verbose data:** `remoteImage('url', 800, 600)` instead of `'url'`.
  Mitigated by the helper function.
- **Two rendering paths remain:** SmartImage + plain `<img>` for small images.
  Documented and intentional.
- **Remote domains must be allowlisted:** In `astro.config.mjs` `image.domains`
  for build-time optimization.

### Risk Mitigation

- **Helper functions:** `remoteImage()` and `getImageUrl()` reduce verbosity.
- **Size threshold documented:** ≤ 64px → `<img>` is a clear, measurable rule.
- **Build failures are loud:** Missing domain configuration produces a clear
  Astro error message.

## Success Criteria

- Zero `isLocalImage()` calls remain in the codebase.
- Zero `typeof ... === 'string'` narrowing for images in component templates.
- All content images (> 64px) render via `SmartImage` or `<Image />`.
- `ImageSource` is the sole type for image sources in data layers and props.
- `astro check` passes without image-related errors.

## References

- [Astro Image Component API](https://docs.astro.build/en/reference/modules/astro-assets/#image-)
- [Astro Images Guide](https://docs.astro.build/en/guides/images/)
- [Authorizing Remote Images](https://docs.astro.build/en/guides/images/#authorizing-remote-images)
