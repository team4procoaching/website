/**
 * Coaches data and configuration.
 * Used by Coaches.astro section and individual coach pages.
 */
import type { ImageSource } from '~/types/components';
import { remoteImage } from '~/types/components';

/**
 * Coach identifiers — single source of truth.
 * Used to derive the CoachId type.
 * Add new coaches here; TypeScript will flag every location that needs updating.
 */
const coachIds = ['helle', 'gina', 'irene'] as const;

/** Coach identifier type, derived from {@link coachIds}. */
type CoachId = (typeof coachIds)[number];

/**
 * Coach profile with all data fields.
 * Used by Coaches.astro section, coach cards, and detail modals.
 *
 * All fields are required — every coach must have a complete profile.
 * If a field were truly optional, components would need null-checks;
 * making it required ensures build-time validation instead.
 */
type CoachExpanded = {
  /** Unique identifier — must be a value from {@link coachIds} */
  id: CoachId;
  /** Coach's full name */
  name: string;
  /** Coach's first name (for personalized CTAs) */
  firstName: string;
  /** Professional title/credentials */
  title: string;
  /** Short biography (1-2 sentences, used as fallback in compact cards) */
  bio: string;
  /** Profile image */
  image: ImageSource;
  /** Link to coach's detail page */
  href: string;
  /** Shorter bio for card previews */
  shortBio: string;
  /** Full biography for detail pages and modals */
  fullBio: string;
  /** List of notable achievements */
  achievements: string[];
  /** Years of coaching experience */
  coachingYears: number;
  /** Years of competing experience */
  competingYears: number;
  /** Coaching specialties */
  specialties: string[];
};

/** Coaches section configuration */
type CoachesSection = {
  /** Section headline */
  headline: string;
  /** Optional subheadline */
  subheadline?: string;
};

/**
 * Coach profiles keyed by ID — compile-time completeness guarantee.
 *
 * `Record<CoachId, CoachExpanded>` ensures that every value in {@link coachIds}
 * has a corresponding data entry. Adding a new ID to `coachIds` without adding
 * a coach record here is a compile error.
 *
 * Sources: Wikipedia, Wings of Strength, NPC News Online, official social media.
 */
const coachesById = {
  helle: {
    id: 'helle',
    name: 'Helle Trevino',
    firstName: 'Helle',
    title: '2× Rising Phoenix World Champion',
    bio: 'Danish-born IFBB Pro and two-time Rising Phoenix World Champion with multiple Ms. Olympia top-three finishes. Coaching since 2003.',
    shortBio:
      'Two-time Rising Phoenix World Champion bringing elite competition prep expertise refined over 25+ years on the world stage.',
    fullBio: `Born and raised on a farm in Sønderborg, Denmark, Helle discovered weight training at 17 and gained 13 kg of muscle in her first year — a clear sign of exceptional genetics. After dominating the 1998 Danish and Scandinavian Championships, she became the first Danish female pro bodybuilder since 1984 when she won the 2003 Jan Tana Classic (Heavyweight & Overall).

TODO: Add Helle's full biography — competition career arc, coaching philosophy, and personal story. Target: 2–3 paragraphs.`,
    image: remoteImage('https://placehold.co/800x1000/4a9199/f7eee5?text=Helle', 800, 1000),
    href: '/coaches/helle',
    achievements: [
      '2× Rising Phoenix World Champion (2017, 2019)',
      'Ms. Olympia 2nd Place (2021)',
      'Ms. Olympia 3rd Place (2020, 2022)',
      '2019 Tampa Pro Champion',
      '2015 Chicago Pro Champion',
      '2003 Jan Tana Classic Champion (HW & Overall)',
    ],
    coachingYears: 22,
    competingYears: 27,
    specialties: [
      'Strategic Muscle Development',
      'Competition Prep',
      'Peak Week Protocols',
      'Mental Strength Training',
    ],
  },
  gina: {
    id: 'gina',
    name: 'Gina Cavaliero',
    firstName: 'Gina',
    title: 'IFBB Pro & NPC Ms International LW Champion',
    bio: 'Florida-based IFBB Pro, certified personal trainer, and NPC Ms International Classic Lightweight Champion. Specialist in competition prep and physique optimization.',
    shortBio:
      'IFBB Pro and certified personal trainer specializing in competition prep, physique optimization, and lifestyle transformations.',
    fullBio: `Gina earned her IFBB Pro card through consistent dedication, winning the 2020 NPC Ms International Classic (Lightweight) and the NPC Teen, Collegiate & Masters Nationals (Masters 35+ and 40+ Lightweight). As an IFBB Pro she has competed at shows including the New York Pro, Toronto Pro Supershow, and Norfolk Pro.

TODO: Add Gina's full biography — competition journey, coaching approach, and transformation philosophy. Target: 2–3 paragraphs.`,
    image: remoteImage('https://placehold.co/800x1000/4a9199/f7eee5?text=Gina', 800, 1000),
    href: '/coaches/gina',
    achievements: [
      '2020 NPC Ms International Classic LW Champion',
      '2020 NPC Masters Nationals Champion (35+ & 40+ LW)',
      '2024 IFBB New York Pro – 5th Place',
      '2024 IFBB Toronto Pro Supershow – 6th Place',
      'Certified Personal Trainer & NXPro Coach',
    ],
    coachingYears: 10,
    competingYears: 8,
    specialties: [
      'Competition Prep',
      'Physique Optimization',
      'Neuro Stim Coaching',
      'Lifestyle Transformations',
    ],
  },
  irene: {
    id: 'irene',
    name: 'Irene Andersen',
    firstName: 'Irene',
    title: 'IFBB Pro & Documentary Filmmaker',
    bio: 'Swedish IFBB Pro competing at the highest level since 2006. Multiple Ms. Olympia and Rising Phoenix top-five finisher. Star and co-producer of "Too Big for the World".',
    shortBio:
      'IFBB Pro since 2006, proving that longevity and peak performance go hand in hand — still placing top-five at the Olympia in her fifties.',
    fullBio: `Born in Denmark and raised in Sweden, Irene began training at age 15 and practiced martial arts — including judo, kickboxing, and Thai boxing — from age nine. Although people urged her to compete for years, she didn't enter her first show until 2003 at age 36, after raising three children in the 1990s. She immediately dominated Swedish competition, winning the 2004 Swedish Championships (Senior, Veteran, Overall, and Rookie of the Year) and earning her IFBB Pro card.

TODO: Add Irene's full biography — longevity story, documentary background, and masters athlete philosophy. Target: 2–3 paragraphs.`,
    image: remoteImage('https://placehold.co/800x1000/4a9199/f7eee5?text=Irene', 800, 1000),
    href: '/coaches/irene',
    achievements: [
      '3rd Place Rising Phoenix World Championships (2019)',
      '5th Place Ms. Olympia (2020, 2021)',
      '3rd Place IFBB Europa Pro (2024)',
      '2004 Swedish Championships Overall Champion',
      'Star & Co-Producer: "Too Big for the World" (2016)',
    ],
    coachingYears: 15,
    competingYears: 22,
    specialties: [
      'Longevity Training',
      'Muscle Maturity',
      'Lifestyle & Prep Coaching',
      'Masters Athletes',
    ],
  },
} as const satisfies Record<CoachId, CoachExpanded>;

/**
 * Coach profiles as an ordered array, derived from {@link coachesById}.
 * Order follows {@link coachIds} — the canonical display order.
 * All consumers (pages, components, modals) use this array.
 */
const coachesExpanded: readonly CoachExpanded[] = coachIds.map((id) => coachesById[id]);

const coachesSection: CoachesSection = {
  headline: 'Meet Your Coaches',
  subheadline: 'Three individual legends who chose to unite their expertise for something greater.',
};

/**
 * Get a coach by their ID. Direct record lookup — no array search needed.
 */
function getCoachById(id: CoachId): CoachExpanded {
  return coachesById[id];
}

/**
 * Calculate total team experience.
 */
function getTotalExperience(): { coaching: number; competing: number } {
  return coachesExpanded.reduce(
    (acc, coach) => ({
      coaching: acc.coaching + coach.coachingYears,
      competing: acc.competing + coach.competingYears,
    }),
    { coaching: 0, competing: 0 },
  );
}

// Export
export { coachIds, coachesExpanded, coachesSection, getCoachById, getTotalExperience };
export type { CoachId, CoachExpanded, CoachesSection };
