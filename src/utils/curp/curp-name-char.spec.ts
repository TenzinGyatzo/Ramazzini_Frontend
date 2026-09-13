import { describe, expect, it } from 'vitest';
import {
  getCurpFirstInternalConsonant,
  getCurpFirstInternalVowel,
  getCurpInitial,
} from './curp-name-char';
import { deriveCurpNameSegments } from './curp-name-segments';

describe('curp-name-char', () => {
  describe('getCurpInitial', () => {
    it('debe usar X cuando el token inicia con carácter especial', () => {
      expect(getCurpInitial("'ESSIO")).toBe('X');
      expect(getCurpInitial('-BRAVO')).toBe('X');
      expect(getCurpInitial("D'Amico")).toBe('D');
    });
  });

  describe('getCurpFirstInternalVowel', () => {
    it('debe retornar X ante apóstrofo o diagonal internos', () => {
      expect(getCurpFirstInternalVowel("D'Amico")).toBe('X');
      expect(getCurpFirstInternalVowel('D/Amico')).toBe('X');
      expect(getCurpFirstInternalVowel('L-Castillo')).toBe('X');
    });

    it('debe escanear la vocal interna después de un carácter especial inicial', () => {
      expect(getCurpFirstInternalVowel("'ESSIO")).toBe('E');
      expect(getCurpFirstInternalVowel("'TORRES")).toBe('O');
      expect(getCurpFirstInternalVowel('-BRAVO')).toBe('A');
    });
  });

  describe('getCurpFirstInternalConsonant', () => {
    it('debe retornar X ante apóstrofo, diagonal o guión internos', () => {
      expect(getCurpFirstInternalConsonant("O'Hara")).toBe('X');
      expect(getCurpFirstInternalConsonant('D/Amico')).toBe('X');
      expect(getCurpFirstInternalConsonant('L-Castillo')).toBe('X');
    });

    it('debe escanear la consonante interna después de un carácter especial inicial', () => {
      expect(getCurpFirstInternalConsonant("'ESSIO")).toBe('S');
      expect(getCurpFirstInternalConsonant("'Essio")).toBe('S');
      expect(getCurpFirstInternalConsonant("'TORRES")).toBe('T');
      expect(getCurpFirstInternalConsonant('-BRAVO')).toBe('B');
      expect(getCurpFirstInternalConsonant('.ANA')).toBe('N');
      expect(getCurpFirstInternalConsonant('/AMICO')).toBe('M');
    });
  });

  describe("integración 'ESSIO TORRES BRAVO", () => {
    it('debe generar iniciales TOBX y consonantes RRS', () => {
      const segments = deriveCurpNameSegments({
        nombre: "'ESSIO",
        primerApellido: 'TORRES',
        segundoApellido: 'BRAVO',
      });

      expect(segments.iniciales).toBe('TOBX');
      expect(segments.consonantes).toBe('RRS');
    });
  });
});
