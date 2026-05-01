/**
 * Central DOM ID registry — single source of truth for IDs that cross
 * component boundaries.
 *
 * Consumers: modal-trigger attributes (`commandfor`), controller
 * `document.getElementById()` calls, and the Cta component's `modalId`
 * prop. Co-locating these IDs here makes renames a one-line change and
 * lets TypeScript reject unknown IDs at call sites via {@link ModalId}.
 *
 * Adding a new modal: register its ID here first, then define the
 * `<Modal id={MODAL_IDS.yourModal}>` component and update triggers to
 * reference `commandfor={MODAL_IDS.yourModal}`.
 */

/** Modal dialog IDs registered in the project. */
export const MODAL_IDS = {
  quiz: 'quiz-modal',
  coachDetail: 'coach-detail-modal',
  successStoryReadMore: 'success-story-read-more-modal',
} as const;

/**
 * Type of a registered modal ID. Consumers that accept a modal ID as a
 * prop (e.g. `ModalCta.modalId`) use this type so that unknown strings
 * are rejected at compile time. The type enforces _registration_ in
 * MODAL_IDS, not _reference via the registry constant_ — a literal
 * `'quiz-modal'` passes, but `MODAL_IDS.quiz` is the convention for
 * drift protection.
 */
export type ModalId = (typeof MODAL_IDS)[keyof typeof MODAL_IDS];
