/**
 * @vitest-environment node
 */
import { describe, expect, it } from 'vitest';
import {
  isAgeAllowedForLinfLsup,
  isSexAllowedForLsex,
  parseCatalogAgeLimit,
} from './cie10';
import { isTipoPersonalAllowedForDiagnostico1 } from './notaMedicaDiagnosticosSis';

function d(year: number, month: number, day: number): Date {
  return new Date(year, month - 1, day);
}

describe('CIE SIS helpers (paridad FE)', () => {
  describe('isSexAllowedForLsex', () => {
    it('solo HOMBRE / MUJER / NO', () => {
      expect(isSexAllowedForLsex('MUJER', 1)).toBe(false);
      expect(isSexAllowedForLsex('MUJER', 2)).toBe(true);
      expect(isSexAllowedForLsex('HOMBRE', 2)).toBe(false);
      expect(isSexAllowedForLsex('NO', 1)).toBe(true);
      expect(isSexAllowedForLsex('SI', 2)).toBe(true);
      expect(isSexAllowedForLsex('MUJER', 3)).toBe(true);
    });
  });

  describe('parseCatalogAgeLimit / isAgeAllowedForLinfLsup', () => {
    it('parsea unidades nativas', () => {
      expect(parseCatalogAgeLimit('028D')).toEqual({ value: 28, unit: 'D' });
      expect(parseCatalogAgeLimit('006M')).toEqual({ value: 6, unit: 'M' });
      expect(parseCatalogAgeLimit('010A')).toEqual({ value: 10, unit: 'A' });
      expect(parseCatalogAgeLimit('NO')).toBeNull();
    });

    it('010A: válido el día del décimo cumpleaños', () => {
      const birth = d(2014, 6, 15);
      expect(isAgeAllowedForLinfLsup('010A', '120A', birth, d(2024, 6, 15))).toBe(
        true,
      );
      expect(isAgeAllowedForLinfLsup('010A', '120A', birth, d(2024, 6, 14))).toBe(
        false,
      );
    });

    it('028D: válido al cumplir 28 días', () => {
      const birth = d(2024, 1, 1);
      expect(isAgeAllowedForLinfLsup('028D', 'NO', birth, d(2024, 1, 29))).toBe(
        true,
      );
      expect(isAgeAllowedForLinfLsup('028D', 'NO', birth, d(2024, 1, 28))).toBe(
        false,
      );
    });

    it('006M: válido al cumplir 6 meses', () => {
      const birth = d(2024, 1, 15);
      expect(isAgeAllowedForLinfLsup('006M', 'NO', birth, d(2024, 7, 15))).toBe(
        true,
      );
      expect(isAgeAllowedForLinfLsup('006M', 'NO', birth, d(2024, 7, 14))).toBe(
        false,
      );
    });
  });

  describe('isTipoPersonalAllowedForDiagnostico1', () => {
    it('lista vacía o NO restringe', () => {
      expect(isTipoPersonalAllowedForDiagnostico1(0, 2, [], [1])).toEqual({
        allowed: false,
        requiresTipoPersonal: true,
        emptyAuthorizedList: true,
      });
    });

    it('permite si el firmante está en la lista', () => {
      expect(isTipoPersonalAllowedForDiagnostico1(0, 2, [1, 2, 3], [1])).toEqual({
        allowed: true,
        requiresTipoPersonal: true,
        emptyAuthorizedList: false,
      });
    });
  });
});
