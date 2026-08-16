import { describe, expect, it } from 'vitest';
import fixtures from './fixtures/curp-parity.fixtures.json';
import { A1_FIELD_TO_CODE } from './curp-validation-catalog';
import { validateCURPCrossCheck } from './curp-validator';
import { validateCurpLive } from './validate-curp-live';

describe('CURP parity fixtures (FE)', () => {
  for (const fixture of fixtures) {
    it(`${fixture.id}: cross-check isValid=${fixture.expectCrossValid}`, () => {
      const result = validateCURPCrossCheck(fixture.curp, fixture.demographics);
      expect(result.isValid).toBe(fixture.expectCrossValid);

      const codes = result.discrepancies.map(
        (d) => A1_FIELD_TO_CODE[d.field],
      );
      for (const code of fixture.expectCodes) {
        expect(codes).toContain(code);
      }
    });

    it(`${fixture.id}: live engine codes align`, () => {
      const live = validateCurpLive(fixture.curp, fixture.demographics, {
        allowGenericCurp: true,
      });
      const errorCodes = live.issues
        .filter((i) => i.severity === 'error')
        .map((i) => i.code);

      if (fixture.expectCrossValid) {
        for (const code of fixture.expectCodes) {
          expect(errorCodes).not.toContain(code);
        }
      } else {
        for (const code of fixture.expectCodes) {
          expect(errorCodes).toContain(code);
        }
      }
    });
  }
});
