import { describe, expect, it } from 'vitest';
import {
  requiresGenericCurpForEntidadNacimiento,
  requiresGenericCurpForNacimiento,
  requiresGenericCurpForPaisNacimiento,
} from './giisResidenciaGeo';

describe('requiresGenericCurpForEntidadNacimiento', () => {
  it('es true para 00 y 99', () => {
    expect(requiresGenericCurpForEntidadNacimiento('00')).toBe(true);
    expect(requiresGenericCurpForEntidadNacimiento('99')).toBe(true);
    expect(requiresGenericCurpForEntidadNacimiento(' 00 ')).toBe(true);
  });

  it('es false para estatales, 88 y vacío', () => {
    expect(requiresGenericCurpForEntidadNacimiento('09')).toBe(false);
    expect(requiresGenericCurpForEntidadNacimiento('88')).toBe(false);
    expect(requiresGenericCurpForEntidadNacimiento('NE')).toBe(false);
    expect(requiresGenericCurpForEntidadNacimiento('')).toBe(false);
    expect(requiresGenericCurpForEntidadNacimiento(null)).toBe(false);
  });
});

describe('requiresGenericCurpForPaisNacimiento', () => {
  it('es true para 247 (SE IGNORA) y 248 (NO ESPECIFICADO), como número o texto', () => {
    expect(requiresGenericCurpForPaisNacimiento(247)).toBe(true);
    expect(requiresGenericCurpForPaisNacimiento('248')).toBe(true);
  });

  it('es false para México, otro país o vacío', () => {
    expect(requiresGenericCurpForPaisNacimiento(142)).toBe(false);
    expect(requiresGenericCurpForPaisNacimiento('840')).toBe(false);
    expect(requiresGenericCurpForPaisNacimiento('')).toBe(false);
    expect(requiresGenericCurpForPaisNacimiento(null)).toBe(false);
  });
});

describe('requiresGenericCurpForNacimiento', () => {
  it('basta el país o la entidad desconocidos', () => {
    expect(requiresGenericCurpForNacimiento('88', 247)).toBe(true);
    expect(requiresGenericCurpForNacimiento('88', '248')).toBe(true);
    expect(requiresGenericCurpForNacimiento('99', 142)).toBe(true);
    expect(requiresGenericCurpForNacimiento('09', 142)).toBe(false);
    expect(requiresGenericCurpForNacimiento('88', 840)).toBe(false);
  });
});
