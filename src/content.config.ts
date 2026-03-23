/**
 * Content Collection definitions.
 *
 * This file defines the schema for all content collections using Zod.
 * Astro validates frontmatter against these schemas at build time,
 * providing type-safe content access throughout the project.
 *
 * @see https://docs.astro.build/en/guides/content-collections/
 */
import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';
import { coachIds } from '~/data/coaches';
import { programTypes } from '~/data/successStories';

/**
 * Success Stories Collection.
 *
 * Each .mdx file in src/content/success-stories/ represents one client transformation.
 * Frontmatter contains all metadata (name, images, program, coach, etc.).
 * The MDX body contains the full story text rendered with prose styling.
 *
 * Relationship to src/data/successStories.ts:
 * - This collection owns the CONTENT (individual story data + body text)
 * - successStories.ts owns the SCHEMA TYPES (ProgramType, CoachId),
 *   DISPLAY CONFIG (programLabels), and SECTION CONFIG (homepage headline/intro)
 */
const successStories = defineCollection({
  loader: glob({ pattern: '**/*.mdx', base: './src/content/success-stories' }),
  schema: z.object({
    /** Client name */
    name: z.string(),
    /** Before transformation image URL */
    beforeImage: z.string(),
    /** After transformation image URL */
    afterImage: z.string(),
    /** Portrait image URL (optional, for detail page header) */
    portrait: z.string().optional(),
    /** Transformation summary, e.g. "Lost 30lbs in 6 months" */
    transformation: z.string(),
    /** Coaching program type — validated against programTypes in successStories.ts */
    program: z.enum(programTypes),
    /** Assigned coach — validated against coachIds in coaches.ts */
    coach: z.enum(coachIds),
    /** Client quote (short teaser for cards) */
    quote: z.string(),
    /** Transformation duration, e.g. "6 months" */
    duration: z.string(),
  }),
});

export const collections = { 'success-stories': successStories };
