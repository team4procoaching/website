/**
 * Shared TypeScript types for components.
 *
 * IMAGE ARCHITECTURE (ADR-0010):
 *
 * `ImageSource` is the discriminated union that replaces the old
 * `string | ImageMetadata` pattern. It explicitly models image origin:
 *
 * - `local`: Imported assets (ImageMetadata) — dimensions known at build time
 * - `remote`: External URLs — dimensions must be provided explicitly
 *
 * `SmartImage.astro` consumes `ImageSource` and handles Astro's `<Image />`
 * overloads internally. Components never need to narrow the type themselves.
 *
 * `ImageProp` bundles `ImageSource` with alt text and optional metadata
 * for Section components (Content, Hero, Testimonial) that receive a
 * complete image configuration as a single prop.
 *
 * Small decorative images (≤ 64px, e.g. avatars) may use plain `<img>`
 * to avoid unnecessary build-time overhead.
 */

/**
 * Discriminated union for image sources.
 * Replaces the old `ImageMetadata | string` union that required
 * runtime type guards to satisfy Astro's `<Image />` overloads.
 *
 * @example Local image (imported asset):
 * ```ts
 * import heroPhoto from '~/assets/images/hero.jpg';
 * const source: ImageSource = { kind: 'local', src: heroPhoto };
 * ```
 *
 * @example Remote image (URL with known dimensions):
 * ```ts
 * const source: ImageSource = remoteImage('https://example.com/photo.jpg', 800, 600);
 * ```
 */
type ImageSource =
  | { kind: 'local'; src: ImageMetadata }
  | { kind: 'remote'; src: string; width: number; height: number };

/**
 * Create a remote ImageSource with explicit dimensions.
 * Convenience helper to keep data layers concise.
 */
function remoteImage(src: string, width: number, height: number): ImageSource {
  return { kind: 'remote', src, width, height };
}

/**
 * Extract the URL string from any ImageSource.
 * Useful for serializing image URLs to client-side JavaScript
 * (e.g. CoachDetailModal) where Astro's build-time processing
 * is not available.
 */
function getImageUrl(source: ImageSource): string {
  return source.kind === 'local' ? source.src.src : source.src;
}

/**
 * Image prop type for Section components that receive a complete
 * image configuration (source + alt + optional metadata).
 *
 * @example
 * ```ts
 * const image: ImageProp = {
 *   src: remoteImage('https://placehold.co/800x600', 800, 600),
 *   alt: 'Hero image',
 * };
 * ```
 */
type ImageProp = {
  /** Image source — local asset or remote URL with dimensions */
  src: ImageSource;
  /** Alt text for accessibility (required) */
  alt: string;
  /** Loading strategy (default: 'lazy', use 'eager' for above-the-fold) */
  loading?: 'lazy' | 'eager';
  /** Optional caption displayed below the image */
  caption?: string;
};

// ---------------------------------------------------------------------------
// CTA (Call-to-Action) Types
// ---------------------------------------------------------------------------

/**
 * Link CTA — navigates to a URL.
 *
 * `type` is optional for ergonomic data definitions — most CTAs are links,
 * so requiring `type: 'link'` everywhere adds noise. Use {@link isModalCta}
 * for safe narrowing instead of manual type checks.
 *
 * @example
 * ```ts
 * const cta: LinkCta = { label: 'Get Started', href: '/contact' };
 * ```
 */
type LinkCta = {
  /** Button label text */
  label: string;
  /** Target URL */
  href: string;
  /** Discriminator (optional — omit for link CTAs, the common case) */
  type?: 'link';
};

/**
 * Modal CTA — opens a modal dialog via the Invoker API.
 *
 * @example
 * ```ts
 * const cta: ModalCta = { label: 'Take Quiz', type: 'modal', modalId: 'quiz-modal' };
 * ```
 */
type ModalCta = {
  /** Button label text */
  label: string;
  /** Discriminator — must be 'modal' */
  type: 'modal';
  /** ID of the target dialog element (used as `commandfor` value) */
  modalId: string;
};

/**
 * Union type for CTA actions — either a navigation link or a modal trigger.
 * Used by Hero components, CTA boxes, and any component offering a primary action.
 *
 * **Important:** Because `LinkCta.type` is optional (for data ergonomics),
 * this is NOT a strict discriminated union. Direct checks like
 * `if (cta.type === 'link')` will NOT match CTAs without an explicit `type`.
 * Always use {@link isModalCta} for type-safe narrowing:
 *
 * ```ts
 * if (isModalCta(cta)) {
 *   // cta is ModalCta — cta.modalId is available
 * } else {
 *   // cta is LinkCta — cta.href is available
 * }
 * ```
 */
type CtaAction = LinkCta | ModalCta;

/**
 * Secondary CTA — always a simple text link.
 * Used alongside a primary CTA in Hero sections and CTA boxes.
 */
type SecondaryCta = {
  /** Link label text */
  label: string;
  /** Target URL */
  href: string;
};

/**
 * Type guard to narrow a {@link CtaAction} to {@link ModalCta}.
 * Centralizes the narrowing logic so components don't need manual
 * `'type' in cta && cta.type === 'modal'` checks.
 *
 * @example
 * ```ts
 * const cta: CtaAction = props.primaryCta;
 * if (isModalCta(cta)) {
 *   // TypeScript knows: cta.modalId is string
 * } else {
 *   // TypeScript knows: cta.href is string
 * }
 * ```
 */
function isModalCta(cta: CtaAction): cta is ModalCta {
  return cta.type === 'modal';
}

// Export
export { remoteImage, getImageUrl, isModalCta };
export type { ImageSource, ImageProp, LinkCta, ModalCta, CtaAction, SecondaryCta };
