/**
 * Shared TypeScript types for components.
 */

/**
 * Image prop type supporting both local assets (with Astro optimization)
 * and external URLs (with optional loading strategy).
 *
 * @example Local image (recommended for production):
 * ```ts
 * import heroImage from '~/assets/images/hero.jpg';
 * const image: ImageProp = { src: heroImage, alt: 'Hero image' };
 * ```
 *
 * @example External URL (for development/placeholders):
 * ```ts
 * const image: ImageProp = { src: 'https://placehold.co/800x600', alt: 'Placeholder' };
 * ```
 */
export type ImageProp = {
  /** Image source - either imported ImageMetadata or external URL string */
  src: ImageMetadata | string;
  /** Alt text for accessibility (required) */
  alt: string;
  /** Loading strategy for external images (default: 'lazy') */
  loading?: 'lazy' | 'eager';
  /** Optional caption displayed below the image */
  caption?: string;
};

/**
 * Type guard to check if an image source is local (ImageMetadata) or external (string).
 * Use this to determine which image component to render.
 *
 * @example
 * ```ts
 * if (isLocalImage(image.src)) {
 *   // Use Astro's <Image /> component
 * } else {
 *   // Use standard <img> tag
 * }
 * ```
 */
export function isLocalImage(src: ImageMetadata | string): src is ImageMetadata {
  return typeof src !== 'string';
}
