/**
 * "How It Works" page data: process steps and FAQ items.
 *
 * Process steps describe the coaching journey from first contact to results.
 * FAQ items are displayed as an accordion (el-disclosure) on the page.
 */

/** A single step in the coaching process timeline */
type ProcessStep = {
  /** Step number (displayed in the circle) */
  number: number;
  /** Short step title */
  title: string;
  /** Description of what happens in this step */
  description: string;
  /**
   * One-sentence tagline used by the compact `ProcessSteps` variant. When
   * absent or an empty string, the compact variant falls back to
   * `description`.
   */
  shortDescription?: string;
};

/** A single FAQ item */
type FaqItem = {
  /** The question */
  question: string;
  /** The answer */
  answer: string;
};

/** Coaching process steps shown in the vertical timeline */
const processSteps: readonly ProcessStep[] = [
  {
    number: 1,
    title: 'Free Consultation',
    description: `Tell us about your goals, experience, and lifestyle. We'll match you with the right coach and program in a free, no-pressure consultation.`,
    shortDescription: 'Your goals, your situation — no commitment yet.',
  },
  {
    number: 2,
    title: 'Your Custom Plan',
    description:
      'Your coach creates a fully personalized training and nutrition plan — tailored to your goals, schedule, and starting point.',
    shortDescription: 'Training and nutrition built from scratch.',
  },
  {
    number: 3,
    title: 'Weekly Coaching & Check-ins',
    description:
      'Regular check-ins, progress tracking, and plan adjustments. Your coach stays in close contact and actively guides you every step of the way.',
    shortDescription: 'Real-time guidance, not a set-and-forget plan.',
  },
  {
    number: 4,
    title: 'Results & Evolution',
    description: `See visible progress through structured feedback cycles. Your program evolves with you — whether you're transforming your lifestyle or preparing for competition.`,
    shortDescription: 'Your program adapts as you progress.',
  },
];

/** FAQ items shown as an accordion */
const faqItems: readonly FaqItem[] = [
  {
    question: 'How does online coaching work?',
    answer: `After your free consultation, your coach designs a personalized training and nutrition plan. You'll receive your personalized plan directly from your coach, check in weekly, and get real-time adjustments based on your progress. It's like having a personal trainer in your pocket.`,
  },
  {
    question: 'How often will I hear from my coach?',
    answer: `You'll have structured weekly check-ins where your coach reviews your progress, adjusts your plan, and answers questions. Between check-ins, you can reach out to your coach directly for quick questions or support.`,
  },
  {
    question: 'Do I need a gym membership?',
    answer: `Most programs are designed for a fully equipped gym, but we can adapt your plan for home training or limited equipment. Let us know your setup during the consultation and we'll make it work.`,
  },
  {
    question: `What if I've never worked with a coach before?`,
    answer: `Perfect — that's exactly where many of our clients start. Your coach will guide you through everything, from learning proper form to understanding your nutrition. No experience necessary.`,
  },
  {
    question: 'Can I switch coaches or programs?',
    answer: `Absolutely. If your goals change or you feel a different coach would be a better fit, we'll help you transition smoothly. Your progress and history stay with you.`,
  },
  {
    question: 'What results can I realistically expect?',
    answer: `Results depend on your starting point, consistency, and goals. Most clients see noticeable changes within the first 4–6 weeks. We'll set honest, measurable milestones during your consultation so you know exactly what to expect.`,
  },
  {
    question: 'How is this different from a generic workout plan?',
    answer: `A generic plan doesn't know you. Our coaching is fully personalized and actively managed. Your coach monitors your progress, adjusts your plan weekly, and holds you accountable. You're not following a template — you're working with an IFBB Pro who's invested in your success.`,
  },
];

// Export
export { processSteps, faqItems };
export type { ProcessStep, FaqItem };
