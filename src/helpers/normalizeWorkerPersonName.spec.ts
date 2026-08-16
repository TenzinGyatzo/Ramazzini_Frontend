import { describe, expect, it } from 'vitest';
import {
  normalizeWorkerPersonName,
  stripPersonNameAccents,
} from './normalizeWorkerPersonName';

describe('normalizeWorkerPersonName', () => {
  describe('stripPersonNameAccents', () => {
    it('debe quitar acentos en vocales', () => {
      expect(stripPersonNameAccents('José')).toBe('Jose');
      expect(stripPersonNameAccents('MARÍA')).toBe('MARIA');
    });

    it('debe preservar ñ y Ñ', () => {
      expect(stripPersonNameAccents('Muñoz')).toBe('Muñoz');
      expect(stripPersonNameAccents('MUÑOZ')).toBe('MUÑOZ');
    });

    it('debe preservar diéresis en vocales', () => {
      expect(stripPersonNameAccents('Argüello')).toBe('Argüello');
      expect(stripPersonNameAccents('ARGÜELLO')).toBe('ARGÜELLO');
    });
  });

  describe('normalizeWorkerPersonName', () => {
    it('debe conservar diéresis y quitar acentos en SIRES', () => {
      expect(normalizeWorkerPersonName('Argüello', 'SIRES_NOM024')).toBe(
        'ARGÜELLO',
      );
      expect(normalizeWorkerPersonName('José', 'SIRES_NOM024')).toBe('JOSE');
    });

    it('debe capitalizar por palabra en SIN_REGIMEN sin quitar diéresis', () => {
      expect(normalizeWorkerPersonName('argüello', 'SIN_REGIMEN')).toBe(
        'Argüello',
      );
    });
  });
});
