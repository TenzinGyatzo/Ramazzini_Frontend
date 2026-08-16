import { describe, expect, it } from 'vitest';
import {
  curpHasUnfilteredInconvenientWord,
  curpInicialesMatchExpected,
  getInconvenientWordVariants,
  isInconvenientWord,
} from './curp-inconvenient-words';

describe('curp-inconvenient-words', () => {
  it('isInconvenientWord detecta palabras del catálogo', () => {
    expect(isInconvenientWord('JOTO')).toBe(true);
    expect(isInconvenientWord('GALJ')).toBe(false);
  });

  it('getInconvenientWordVariants expone raw y filtered', () => {
    expect(getInconvenientWordVariants('LOCO')).toEqual({
      raw: 'LOCO',
      filtered: 'LXCO',
      isInconvenient: true,
    });
  });

  it('curpInicialesMatchExpected acepta crudo o sustituto', () => {
    expect(curpInicialesMatchExpected('PUTO', 'PUTO')).toBe(true);
    expect(curpInicialesMatchExpected('PXTO', 'PUTO')).toBe(true);
  });

  it('curpHasUnfilteredInconvenientWord detecta pos. 1-4 sin filtrar', () => {
    expect(curpHasUnfilteredInconvenientWord('JOTO900515HDFRPN08')).toBe(true);
    expect(curpHasUnfilteredInconvenientWord('JXTO900515HDFRPN08')).toBe(false);
  });
});
