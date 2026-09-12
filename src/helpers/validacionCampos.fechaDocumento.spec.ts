import { describe, expect, it } from 'vitest';
import {
  DOCUMENT_DATE_MAX_LOOKBACK_DAYS,
  validarFechaDocumentoNoFutura,
  validarFechaDocumentoPreSubmit,
  validarNotaMedicaPreSubmit,
} from './validacionCampos';

function ymd(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function daysAgo(days: number): Date {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - days);
  return date;
}

describe('validarFechaDocumentoNoFutura ventana SIRES', () => {
  it('permite hoy y hoy − 30 días en SIRES', () => {
    expect(validarFechaDocumentoNoFutura(ymd(new Date()), true).valido).toBe(true);
    expect(
      validarFechaDocumentoNoFutura(ymd(daysAgo(DOCUMENT_DATE_MAX_LOOKBACK_DAYS)), true)
        .valido,
    ).toBe(true);
  });

  it('rechaza hoy − 31 días en SIRES', () => {
    const r = validarFechaDocumentoNoFutura(ymd(daysAgo(31)), true);
    expect(r.valido).toBe(false);
    expect(r.mensaje).toBe(
      'La fecha del documento no puede tener más de 30 días de antigüedad',
    );
  });

  it('rechaza fecha futura en SIRES', () => {
    const r = validarFechaDocumentoNoFutura(ymd(daysAgo(-1)), true);
    expect(r.valido).toBe(false);
    expect(r.mensaje).toBe('La fecha no puede ser posterior al día de hoy');
  });

  it('no restringe antigüedad ni futuro en SIN_REGIMEN', () => {
    expect(validarFechaDocumentoNoFutura(ymd(daysAgo(31)), false).valido).toBe(true);
    expect(validarFechaDocumentoNoFutura(ymd(daysAgo(-1)), false).valido).toBe(true);
  });

  it('validarFechaDocumentoPreSubmit usa el campo de fecha del tipo', () => {
    const r = validarFechaDocumentoPreSubmit(
      'antidoping',
      { fechaAntidoping: ymd(daysAgo(31)) },
      true,
    );
    expect(r.valido).toBe(false);
    expect(r.paso).toBe(1);
  });
});

describe('validarNotaMedicaPreSubmit ventana SIRES', () => {
  it('rechaza consulta con más de 30 días de antigüedad', () => {
    const r = validarNotaMedicaPreSubmit(
      { fechaNotaMedica: ymd(daysAgo(31)) },
      { fechaNacimiento: '1990-01-01' },
      true,
      false,
    );
    expect(r.valido).toBe(false);
    expect(r.mensaje).toBe(
      'La fecha de consulta no puede tener más de 30 días de antigüedad',
    );
    expect(r.paso).toBe(1);
  });

  it('acepta consulta de hoy − 30 días', () => {
    const r = validarNotaMedicaPreSubmit(
      { fechaNotaMedica: ymd(daysAgo(30)) },
      { fechaNacimiento: '1990-01-01' },
      true,
      false,
    );
    expect(r.valido).toBe(true);
  });
});
