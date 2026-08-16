import { describe, expect, it } from 'vitest';
import { requiresGenericCurpForEntidadNacimiento } from './giisResidenciaGeo';

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
