import { describe, expect, it, vi } from 'vitest';
import {
  aplicaConfirmacionDiagnostico1,
  aplicaConfirmacionDiagnostico23,
  isTipoPersonalMedicoConfirmacion,
} from './confirmacionDiagnostica';

describe('confirmacionDiagnostica (frontend)', () => {
  it('tipoPersonal médico incluye 1,2,3,4,19,24', () => {
    expect(isTipoPersonalMedicoConfirmacion(2)).toBe(true);
    expect(isTipoPersonalMedicoConfirmacion(6)).toBe(false);
  });

  it('diag1: crónico primera vez >=20', () => {
    expect(
      aplicaConfirmacionDiagnostico1({
        tipoPersonal: 2,
        edad: 45,
        flags: { diaCronicos: true, diaCaInfantil: false },
        relacionTemporal: 0,
      }),
    ).toBe(true);
    expect(
      aplicaConfirmacionDiagnostico1({
        tipoPersonal: 2,
        edad: 45,
        flags: { diaCronicos: true, diaCaInfantil: false },
        relacionTemporal: 1,
      }),
    ).toBe(false);
  });

  it('diag2: requiere primeraVez=1', () => {
    expect(
      aplicaConfirmacionDiagnostico23({
        tipoPersonal: 4,
        edad: 30,
        flags: { diaCronicos: true, diaCaInfantil: false },
        primeraVezDiagnostico: 1,
      }),
    ).toBe(true);
  });

  it('no aplica si tipoPersonal no es médico', () => {
    expect(
      aplicaConfirmacionDiagnostico1({
        tipoPersonal: 6,
        edad: 10,
        flags: { diaCronicos: false, diaCaInfantil: true },
        relacionTemporal: 0,
      }),
    ).toBe(false);
  });
});
