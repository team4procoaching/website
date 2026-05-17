import { describe, expect, it } from 'vitest';
import { validateFormSelectOptionality } from './formSelectOptionalityValidation';

describe('validateFormSelectOptionality — XOR contract', () => {
  it('passes with optional only', () => {
    expect(() =>
      validateFormSelectOptionality({ optional: true, required: undefined }),
    ).not.toThrow();
  });

  it('passes with required only', () => {
    expect(() =>
      validateFormSelectOptionality({ optional: undefined, required: true }),
    ).not.toThrow();
  });

  it('passes with neither (legal default — surrounding fieldset or no chrome hint)', () => {
    expect(() =>
      validateFormSelectOptionality({ optional: undefined, required: undefined }),
    ).not.toThrow();
  });

  it('throws "not both" when both optional and required are set', () => {
    expect(() => validateFormSelectOptionality({ optional: true, required: true })).toThrow(
      /not both/i,
    );
  });

  it('passes with explicit `false` on both — distinct from `undefined`, not a collision', () => {
    // `optional={false}` and `required={false}` express "no chrome hint and
    // not required". The validator must not treat falsy-but-defined as
    // present, otherwise a future call site that explicitly disables the
    // chrome hint would trip the guard.
    expect(() => validateFormSelectOptionality({ optional: false, required: false })).not.toThrow();
  });
});
