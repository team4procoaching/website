/**
 * Wire-key constants for the contact-form sessionStorage carry that
 * bridges the contact page's submit handler (writer) and the thanks page's
 * restate reader (reader).
 *
 * Lives in `~/utils` rather than alongside the writer or reader script so
 * neither runtime module has to import from the other for a constant that
 * is, by definition, shared. The writer
 * (`~/scripts/contactFormController`) imports the key to write at submit
 * time; the reader (`~/scripts/thanksSelectionReader`) imports it to
 * read-once-and-clear at thanks-page bootstrap. The payload type
 * (`ContactFormSelectionCarry`) stays on the writer side as the writer's
 * contract surface — see the writer's JSDoc for the rationale.
 *
 * Namespacing follows `~/utils/quizContext`'s `STORAGE_KEY` precedent —
 * `team4pro-<concern>` to avoid collisions with other libraries that may
 * read the same origin's sessionStorage.
 */

/**
 * sessionStorage key for the contact-form selection carry — the payload
 * the thanks-page reader consumes (read-once-and-clear).
 */
export const CONTACT_FORM_SELECTION_STORAGE_KEY = 'team4pro-contact-form-selection';
