import { describe, expect, it } from 'vitest';
import {
  validatePersonNameCharacters,
  validatePersonNameCharactersRule,
  validatePersonNameDieresisPlacement,
} from './personNameCharacterValidation';

describe('personNameCharacterValidation', () => {
  describe('validatePersonNameDieresisPlacement', () => {
    it('acepta vocales precompuestas con diéresis', () => {
      expect(validatePersonNameDieresisPlacement('ARGÜELLO')).toBe(true);
      expect(validatePersonNameDieresisPlacement('GARCÄ')).toBe(true);
    });

    it('rechaza diéresis suelta o sobre consonante', () => {
      expect(validatePersonNameDieresisPlacement('¨')).toBe(false);
      expect(validatePersonNameDieresisPlacement('G¨')).toBe(false);
      expect(validatePersonNameDieresisPlacement('ARGU¨')).toBe(false);
      expect(validatePersonNameDieresisPlacement('B\u0308')).toBe(false);
    });
  });

  describe('validatePersonNameCharacters', () => {
    it('debe permitir vocales con diéresis', () => {
      expect(validatePersonNameCharacters('ARGÜELLO', 'Apellido').isValid).toBe(
        true,
      );
    });

    it('debe rechazar diéresis suelta o sobre consonante', () => {
      expect(validatePersonNameCharacters('¨', 'Apellido').isValid).toBe(false);
      expect(validatePersonNameCharacters('G¨', 'Apellido').isValid).toBe(false);
      expect(validatePersonNameCharacters('ARGU¨', 'Apellido').isValid).toBe(
        false,
      );
      expect(validatePersonNameCharacters('B\u0308', 'Apellido').isValid).toBe(
        false,
      );
    });

    it('debe rechazar acentos en SIRES_NOM024', () => {
      expect(validatePersonNameCharactersRule('JOSÉ', 'SIRES_NOM024')).toBe(
        false,
      );
    });

    it('debe rechazar caracteres no permitidos', () => {
      expect(validatePersonNameCharactersRule('JUAN@PEREZ')).toBe(false);
      expect(validatePersonNameCharactersRule('GARCIA, LOPEZ')).toBe(false);
      expect(validatePersonNameCharactersRule('JUAN2')).toBe(false);
      expect(validatePersonNameCharactersRule('ANA[]')).toBe(false);
    });
  });
});
