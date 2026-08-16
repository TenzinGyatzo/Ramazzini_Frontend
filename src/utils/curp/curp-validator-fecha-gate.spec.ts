import { describe, expect, it } from 'vitest';
import { isFechaNacimientoReadyForCurpCrossCheck } from './curp-validator';

describe('isFechaNacimientoReadyForCurpCrossCheck', () => {
  it.each([null, undefined, '', '   '] as const)(
    'retorna false para valor vacío (%s)',
    (fecha) => {
      expect(isFechaNacimientoReadyForCurpCrossCheck(fecha)).toBe(false);
    },
  );

  it.each(['0001-11-30', '0019-11-30', '0199-11-30', '1899-12-31'] as const)(
    'retorna false para año incompleto o < 1900 (%s)',
    (fecha) => {
      expect(isFechaNacimientoReadyForCurpCrossCheck(fecha)).toBe(false);
    },
  );

  it.each(['1900-01-01', '1994-11-30', '2000-11-30'] as const)(
    'retorna true para año completo usable (%s)',
    (fecha) => {
      expect(isFechaNacimientoReadyForCurpCrossCheck(fecha)).toBe(true);
    },
  );
});
