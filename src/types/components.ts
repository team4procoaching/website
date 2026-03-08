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
export type ImageSource =
  | { kind: 'local'; src: ImageMetadata }
  | { kind: 'remote'; src: string; width: number; height: number };

/**
 * Create a remote ImageSource with explicit dimensions.
 * Convenience helper to keep data layers concise.
 */
export function remoteImage(src: string, width: number, height: number): ImageSource {
  return { kind: 'remote', src, width, height };
}

/**
 * Extract the URL string from any ImageSource.
 * Useful for serializing image URLs to client-side JavaScript
 * (e.g. CoachDetailModal) where Astro's build-time processing
 * is not available.
 */
export function getImageUrl(source: ImageSource): string {
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
export type ImageProp = {
  /** Image source — local asset or remote URL with dimensions */
  src: ImageSource;
  /** Alt text for accessibility (required) */
  alt: string;
  /** Loading strategy (default: 'lazy', use 'eager' for above-the-fold) */
  loading?: 'lazy' | 'eager';
  /** Optional caption displayed below the image */
  caption?: string;
};
