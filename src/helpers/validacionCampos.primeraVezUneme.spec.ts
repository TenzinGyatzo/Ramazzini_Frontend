import { describe, expect, it } from 'vitest';
import {
  validarCamposRequeridos,
  validarNotaMedicaPreSubmit,
} from './validacionCampos';

const baseNotaMedica = {
  fechaNotaMedica: '2026-03-15',
  motivoConsulta: 'Consulta de seguimiento',
  codigoCIE10Principal: 'E11',
  relacionTemporal: 0,
};

describe('primeraVezUneme en submit de nota médica', () => {
  it('bloquea el submit SIRES si la pregunta aplica y no hay Sí/No', () => {
    const pre = validarNotaMedicaPreSubmit(
      { ...baseNotaMedica, primeraVezUnemeAplica: true },
      { fechaNacimiento: '1990-01-01' },
      true,
      false,
    );
    expect(pre.valido).toBe(false);
    expect(pre.paso).toBe(1);
    expect(pre.mensaje).toMatch(/Unidad de Especialidades Médicas/i);

    const campos = validarCamposRequeridos(
      'notaMedica',
      { ...baseNotaMedica, primeraVezUnemeAplica: true },
      { showSiresUI: true, cie10Required: true },
    );
    expect(campos.esValido).toBe(false);
    expect(campos.camposFaltantes.some((c) => c.paso === 1)).toBe(true);
  });

  it('acepta 0 (No) cuando la pregunta aplica', () => {
    const datos = {
      ...baseNotaMedica,
      primeraVezUnemeAplica: true,
      primeraVezUneme: 0,
    };
    expect(
      validarNotaMedicaPreSubmit(datos, { fechaNacimiento: '1990-01-01' }, true, false)
        .valido,
    ).toBe(true);
    expect(
      validarCamposRequeridos('notaMedica', datos, {
        showSiresUI: true,
        cie10Required: true,
      }).esValido,
    ).toBe(true);
  });

  it('acepta 1 (Sí) cuando la pregunta aplica', () => {
    const datos = {
      ...baseNotaMedica,
      primeraVezUnemeAplica: true,
      primeraVezUneme: 1,
    };
    expect(
      validarNotaMedicaPreSubmit(datos, { fechaNacimiento: '1990-01-01' }, true, false)
        .valido,
    ).toBe(true);
    expect(
      validarCamposRequeridos('notaMedica', datos, {
        showSiresUI: true,
        cie10Required: true,
      }).esValido,
    ).toBe(true);
  });

  it('no exige el campo si la pregunta no aplica', () => {
    const datos = { ...baseNotaMedica, primeraVezUnemeAplica: false };
    expect(
      validarNotaMedicaPreSubmit(datos, { fechaNacimiento: '1990-01-01' }, true, false)
        .valido,
    ).toBe(true);
    expect(
      validarCamposRequeridos('notaMedica', datos, {
        showSiresUI: true,
        cie10Required: true,
      }).esValido,
    ).toBe(true);
  });
});
