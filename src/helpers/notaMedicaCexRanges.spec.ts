import { describe, expect, it } from 'vitest';
import {
  validateNotaMedicaCexField,
  validateNotaMedicaCexQuantities,
  mensajeErrorCexField,
  isCexUnknown,
} from './notaMedicaCexRanges';
import { validarNotaMedicaPreSubmit } from './validacionCampos';

describe('notaMedicaCexRanges', () => {
  it('isCexUnknown reconoce null/0/999 según campo', () => {
    expect(isCexUnknown('peso', null)).toBe(true);
    expect(isCexUnknown('peso', 999)).toBe(true);
    expect(isCexUnknown('peso', 70)).toBe(false);
    expect(isCexUnknown('glucemia', 0)).toBe(true);
    expect(isCexUnknown('frecuenciaCardiaca', 0)).toBe(true);
  });

  it('mensajeErrorCexField vacío si seDesconoce', () => {
    expect(mensajeErrorCexField('peso', 0, true)).toBe('');
    expect(mensajeErrorCexField('peso', 0, false)).toContain('mínimo');
  });

  it('acepta SpO2 65 y FR 70 (CEX, no util genérico)', () => {
    expect(validateNotaMedicaCexField('saturacionOxigeno', 65)).toBeNull();
    expect(validateNotaMedicaCexField('frecuenciaRespiratoria', 70)).toBeNull();
  });

  it('valida glucemia condicional', () => {
    expect(
      validateNotaMedicaCexQuantities({
        glucemia: 90,
        tipoMedicion: -1,
        resultadoObtenidoaTravesde: 1,
      }),
    ).toBeTruthy();
    expect(
      validateNotaMedicaCexQuantities({
        glucemia: 90,
        tipoMedicion: 1,
        resultadoObtenidoaTravesde: 1,
      }),
    ).toBeNull();
  });
});

describe('validarNotaMedicaPreSubmit CEX', () => {
  it('bloquea rango inválido y apunta a signos', () => {
    const r = validarNotaMedicaPreSubmit(
      {
        fechaNotaMedica: '2024-01-15',
        frecuenciaCardiaca: 30,
      },
      { fechaNacimiento: '1990-01-01' },
      true,
      false,
    );
    expect(r.valido).toBe(false);
    expect(r.mensaje).toContain('40');
    expect(r.paso).toBe(6); // SIRES hombre: signos = 6
  });

  it('bloquea glucemia sin tipoMedicion en SIRES', () => {
    const r = validarNotaMedicaPreSubmit(
      {
        fechaNotaMedica: '2024-01-15',
        glucemia: 100,
        tipoMedicion: -1,
        resultadoObtenidoaTravesde: 1,
      },
      { fechaNacimiento: '1990-01-01' },
      true,
      false,
    );
    expect(r.valido).toBe(false);
    expect(r.paso).toBe(8);
  });

  it('no valida somatometría/glucemia en SIN_REGIMEN', () => {
    const r = validarNotaMedicaPreSubmit(
      {
        fechaNotaMedica: '2024-01-15',
        glucemia: 5,
        tipoMedicion: -1,
      },
      { fechaNacimiento: '1990-01-01' },
      false,
      false,
    );
    expect(r.valido).toBe(true);
  });

  it('acepta payload CEX válido', () => {
    const r = validarNotaMedicaPreSubmit(
      {
        fechaNotaMedica: '2024-01-15',
        tensionArterialSistolica: 120,
        tensionArterialDiastolica: 80,
        frecuenciaCardiaca: 72,
        frecuenciaRespiratoria: 18,
        temperatura: 36.5,
        saturacionOxigeno: 65,
        peso: 70.5,
        talla: 170,
        circunferenciaCintura: 80,
        glucemia: 100,
        tipoMedicion: 1,
        resultadoObtenidoaTravesde: 2,
      },
      { fechaNacimiento: '1990-01-01' },
      true,
      false,
    );
    expect(r.valido).toBe(true);
  });
});
