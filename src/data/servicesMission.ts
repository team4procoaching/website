/**
 * Services-page mission block content.
 *
 * The Services overview page opens with a mission-driven block that
 * introduces the three coaches as carriers of the brand mission rather
 * than as a credential strip. The strings in this module are the copy
 * the page passes to `<MissionBlock content={servicesMission} />`; the
 * component is presentation-only.
 *
 * Content brief for placeholder fill-in.
 *
 * The placeholder strings (mission heading, mission paragraph, three coach
 * mini-sentences) are working copy that the coaches will review and refine.
 * The brief for each, verbatim from the Phase-0 handover:
 *
 * **Mission statement (heading + paragraph):**
 *
 * The heading should communicate the mission in one short, confident line.
 * "Coaching for women, by women." is a strong working version because it is
 * direct, short, and gives the page its anchor. Alternatives that the coaches
 * may prefer: framings that emphasise lived experience ("Coaches who have
 * been there.") or expertise ("Built on what we wished we had.").
 *
 * The paragraph should accomplish three things in two to three sentences:
 * (1) name that women's bodies have different needs than men's — hormonal
 * cycles, recovery patterns, life phases; (2) state that the three coaches
 * have lived this themselves, as athletes and as women, and that this is what
 * they bring to coaching; (3) make clear, without making it the loudest note,
 * that this is why Team 4 Pro works exclusively with women. The tone is
 * inviting, not exclusionary; confident, not defensive.
 *
 * **Coach mini-sentences (one per coach):**
 *
 * Each sentence should connect the coach to the mission. It is not a credential
 * restatement and not a list of personal achievements. It is what this coach
 * brings to the team's collective work — phrased so that the three sentences
 * together feel complementary, not competitive.
 *
 * For Helle, the direction is depth and longevity. For Gina, the direction is
 * structural care informed by what wrong coaching can cost. For Irene, the
 * direction is closeness to women earlier in their journey or in different life
 * phases. The coaches may rephrase these directions entirely; what matters is
 * that each sentence reads as mission-connected, not as a CV line.
 *
 * **Photos:**
 *
 * Photographs of the three coaches in consistent style and quality. Working
 * implementation can begin with placeholder image slots; final photos to be
 * swapped in during the content-fill pass.
 *
 * TODO(content): replace the four `[PLACEHOLDER]`-prefixed strings (mission
 * heading, mission paragraph, three coach mini-sentences) with coach-reviewed
 * final copy. The prefix is visible in the rendered DOM by design — a
 * forgotten placeholder is a publicly visible failure rather than a silent one.
 * The `transitionLine` is existing final copy and does not carry the prefix.
 */

import type { CoachId } from './coaches';

/**
 * Typed shape consumed by the `MissionBlock` component. The
 * `coachSentences` record uses `Record<CoachId, string>` so adding a
 * coach in `~/data/coaches.ts` is a compile error here until a
 * mission-connected sentence is supplied.
 */
type MissionBlockContent = {
  readonly heading: string;
  readonly paragraph: string;
  readonly coachSentences: Readonly<Record<CoachId, string>>;
  readonly transitionLine: string;
};

const servicesMission = {
  heading: '[PLACEHOLDER] Coaching for women, by women.',
  paragraph:
    "[PLACEHOLDER] Women's bodies aren't smaller men's bodies — hormonal cycles, recovery patterns, and life phases shape what training actually does. The three of us have lived this ourselves, as athletes and as women, and it's what we bring to every plan we write. That's why Team 4 Pro works exclusively with women.",
  coachSentences: {
    helle:
      '[PLACEHOLDER] Twenty-five years on competitive stages and in the coaching room teach you what stays true across decades — and what only looks true in the short run.',
    gina: '[PLACEHOLDER] I have felt what coaching designed for the wrong body costs, so I build plans that respect the body in front of me, not a template.',
    irene:
      '[PLACEHOLDER] I remember every stage I have ever stood on, and I bring that memory into the room for women earlier in their journey.',
  },
  transitionLine: 'Find the service that fits where you are right now.',
} as const satisfies MissionBlockContent;

export { servicesMission };
export type { MissionBlockContent };
