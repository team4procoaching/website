/**
 * Coaches data and configuration.
 * Used by Coaches.astro section and potentially individual coach pages.
 */

/** Coach profile information */
type Coach = {
  /** Unique identifier (used for URLs and anchor links) */
  id: string;
  /** Coach's full name */
  name: string;
  /** Coach's first name (for personalized CTAs) */
  firstName: string;
  /** Professional title/credentials */
  title: string;
  /** Short biography */
  bio: string;
  /** Profile image URL */
  image: string;
  /** Link to coach's detail section/page */
  href: string;
};

/** Coaches section configuration */
type CoachesSection = {
  /** Section headline */
  headline: string;
};

// TODO: Replace placeholder bios before go-live
const coaches = [
  {
    id: 'helle',
    name: 'Helle Trevino',
    firstName: 'Helle',
    title: '2x World Champion',
    bio: 'Praesentium iure error aliquam voluptas ut libero. Commodi placeat sit iure nulla officiis. Ut ex sit repellat tempora. Qui est accusamus exercitationem natus ut voluptas. Officiis velit eos ducimus.',
    image: 'https://placehold.co/800x533/4a9199/f7eee5?text=Helle',
    href: '/coaches#helle',
  },
  {
    id: 'gina',
    name: 'Gina Cavaliero',
    firstName: 'Gina',
    title: 'Multiple Time Olympian',
    bio: 'Turpis lectus et amet elementum. Mi duis integer sed in vitae consequat. Nam vitae, in felis mi dui tempus. Porta at turpis eu odio. Et, sed duis in blandit bibendum accumsan. Purus viverra facilisi suspendisse quis est.',
    image: 'https://placehold.co/800x533/4a9199/f7eee5?text=Gina',
    href: '/coaches#gina',
  },
  {
    id: 'irene',
    name: 'Irene Anderson',
    firstName: 'Irene',
    title: 'Ms. International Champion',
    bio: 'Aliquet adipiscing lectus praesent cras sed quis lectus egestas erat. Bibendum curabitur eget habitant feugiat nec faucibus eu lorem suscipit. Vitae vitae tempor enim eget lacus nulla leo.',
    image: 'https://placehold.co/800x533/4a9199/f7eee5?text=Irene',
    href: '/coaches#irene',
  },
] as const satisfies readonly Coach[];

const coachesSection: CoachesSection = {
  headline: 'Meet Your Coaches',
} as const;

export { coaches, coachesSection };
export type { Coach, CoachesSection };
