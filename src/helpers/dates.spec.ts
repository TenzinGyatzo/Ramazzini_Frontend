import { describe, it, expect } from 'vitest';
import {
  formatearFechaDDMMAAAA,
  calcularEdad,
  calcularEdadPrecisa,
  calcularAntiguedad,
  isBirthDateInRegistrationRange,
  getRegistrationBirthDateInputBounds,
  buildRegistrationAgeRangeMessage,
  fechaLocalHoy,
} from './dates';

describe('fechaLocalHoy', () => {
  it('usa la fecha de la hora del usuario, no la de UTC', () => {
    // 18 de octubre a las 23:30 en la hora local: en UTC (México) ya sería 19
    expect(fechaLocalHoy(new Date(2026, 9, 18, 23, 30))).toBe('2026-10-18');
    expect(fechaLocalHoy(new Date(2026, 0, 5, 0, 5))).toBe('2026-01-05');
  });
});
import {
  FIRMANTE_EDAD_MINIMA,
  FIRMANTE_EDAD_MAXIMA,
  TRABAJADOR_EDAD_MINIMA,
  TRABAJADOR_EDAD_MAXIMA,
} from '../../formkit.config';

const REF = new Date(2026, 7, 7);

function date(y: number, m: number, d: number): Date {
  return new Date(y, m - 1, d);
}

function getFechaNacimientoYearsAgo(years: number): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() - years);
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${month}-${day}`;
}

describe('calcularEdadPrecisa - médico firmante', () => {
  it('should calculate precise age including months and days', () => {
    const fecha18 = getFechaNacimientoYearsAgo(18);
    const fecha17 = getFechaNacimientoYearsAgo(17);
    const fecha90 = getFechaNacimientoYearsAgo(90);
    const fecha91 = getFechaNacimientoYearsAgo(91);

    expect(calcularEdadPrecisa(fecha18)).toBe(18);
    expect(calcularEdadPrecisa(fecha17)).toBe(17);
    expect(calcularEdadPrecisa(fecha90)).toBe(90);
    expect(calcularEdadPrecisa(fecha91)).toBe(91);
  });

  it('límites: trabajadores de 17 a 100 cumplidos; firmantes de 18 a 90', () => {
    expect(TRABAJADOR_EDAD_MINIMA).toBe(17);
    expect(TRABAJADOR_EDAD_MAXIMA).toBe(100);
    expect(FIRMANTE_EDAD_MINIMA).toBe(18);
    expect(FIRMANTE_EDAD_MAXIMA).toBe(90);

    const edadValida = calcularEdadPrecisa(getFechaNacimientoYearsAgo(45));
    expect(edadValida).toBeGreaterThanOrEqual(FIRMANTE_EDAD_MINIMA);
    expect(edadValida).toBeLessThanOrEqual(FIRMANTE_EDAD_MAXIMA);
  });
});

// Espejo de backend/src/utils/age-registration.util.spec.ts (REF = 7 ago 2026)
describe('isBirthDateInRegistrationRange - años cumplidos', () => {
  const trabajador = (fecha: Date | string) =>
    isBirthDateInRegistrationRange(fecha, REF, TRABAJADOR_EDAD_MINIMA, TRABAJADOR_EDAD_MAXIMA);
  const firmante = (fecha: Date | string) =>
    isBirthDateInRegistrationRange(fecha, REF, FIRMANTE_EDAD_MINIMA, FIRMANTE_EDAD_MAXIMA);

  it('trabajador: cumple 17 hoy → válido; le falta un día → rechazado', () => {
    expect(trabajador(date(2009, 8, 7))).toBe(true);
    expect(trabajador(date(2009, 8, 8))).toBe(false);
  });

  it('trabajador: acepta 100a 0m 1d y la víspera de cumplir 101; rechaza al cumplir 101', () => {
    expect(trabajador(date(1926, 8, 6))).toBe(true);
    expect(trabajador(date(1925, 8, 8))).toBe(true);
    expect(trabajador(date(1925, 8, 7))).toBe(false);
  });

  it('firmante: cumple 18 hoy → válido; le falta un día → rechazado', () => {
    expect(firmante(date(2008, 8, 7))).toBe(true);
    expect(firmante(date(2008, 8, 8))).toBe(false);
  });

  it('firmante: acepta 90a 0m 1d y la víspera de cumplir 91; rechaza al cumplir 91', () => {
    expect(firmante(date(1936, 8, 6))).toBe(true);
    expect(firmante(date(1935, 8, 8))).toBe(true);
    expect(firmante(date(1935, 8, 7))).toBe(false);
  });

  it('parsea strings YYYY-MM-DD como fecha local (input type=date)', () => {
    expect(trabajador('1925-08-08')).toBe(true);
    expect(trabajador('1925-08-07')).toBe(false);
    expect(firmante('1935-08-08')).toBe(true);
    expect(firmante('1935-08-07')).toBe(false);
  });

  it('parsea fechas ISO UTC como date-only', () => {
    expect(trabajador('1925-08-08T00:00:00.000Z')).toBe(true);
    expect(trabajador(new Date('1925-08-08T00:00:00.000Z'))).toBe(true);
  });

  it('nacido un 29 de febrero: la víspera de 101 sí, al cumplirlos no', () => {
    expect(isBirthDateInRegistrationRange(date(1924, 2, 29), date(2025, 2, 28), 17, 100)).toBe(true);
    expect(isBirthDateInRegistrationRange(date(1924, 2, 29), date(2025, 3, 1), 17, 100)).toBe(false);
  });

  it('genera mensaje descriptivo con edad calculada', () => {
    expect(
      buildRegistrationAgeRangeMessage(
        TRABAJADOR_EDAD_MINIMA,
        TRABAJADOR_EDAD_MAXIMA,
        '1925-08-07',
        REF,
      ),
    ).toBe(
      'Edad fuera de rango (de 17 a 100 años cumplidos; no se aceptan 101 o más). Edad calculada: 101 años, 0 meses y 0 días.',
    );
  });
});

describe('getRegistrationBirthDateInputBounds', () => {
  it('el calendario va de la víspera del máximo + 1 al día en que cumple el mínimo', () => {
    const trabajador = getRegistrationBirthDateInputBounds(
      TRABAJADOR_EDAD_MINIMA,
      TRABAJADOR_EDAD_MAXIMA,
      REF,
    );
    expect(trabajador.min).toBe('1925-08-08');
    expect(trabajador.max).toBe('2009-08-07');

    const firmante = getRegistrationBirthDateInputBounds(
      FIRMANTE_EDAD_MINIMA,
      FIRMANTE_EDAD_MAXIMA,
      REF,
    );
    expect(firmante.min).toBe('1935-08-08');
    expect(firmante.max).toBe('2008-08-07');
  });
});

describe('calcularEdad / calcularAntiguedad con fechaReferencia', () => {
  const fechaNacimiento = '1990-06-15';

  it('debe calcular edad contra fecha del documento extemporánea', () => {
    const edadHoy = calcularEdad(fechaNacimiento);
    const edadDocumento = calcularEdad(fechaNacimiento, '2020-01-01');
    expect(edadDocumento).toBe(29);
    expect(edadDocumento).toBeLessThan(edadHoy);
  });

  it('debe ajustar si el cumpleaños no ha ocurrido en la fecha del documento', () => {
    expect(calcularEdad(fechaNacimiento, '2020-03-01')).toBe(29);
    expect(calcularEdad(fechaNacimiento, '2020-06-15')).toBe(30);
  });

  it('calcularEdad delega en calcularEdadPrecisa', () => {
    expect(calcularEdad(fechaNacimiento, '2020-01-01')).toBe(
      calcularEdadPrecisa(fechaNacimiento, '2020-01-01'),
    );
  });

  it('debe evaluar antigüedad contra fecha del documento', () => {
    const fechaIngreso = '2020-01-10';
    expect(calcularAntiguedad(fechaIngreso, '2020-01-12')).toBe('Nuevo Ingreso');
    expect(calcularAntiguedad(fechaIngreso, '2020-01-20')).toMatch(/semana/);
  });
});

describe('formatearFechaDDMMAAAA', () => {
  it('formatea fechas guardadas a medianoche UTC sin correr el día', () => {
    expect(formatearFechaDDMMAAAA('1990-05-01T00:00:00.000Z')).toBe('01/05/1990');
    expect(formatearFechaDDMMAAAA('2024-12-31')).toBe('31/12/2024');
    expect(formatearFechaDDMMAAAA(new Date(Date.UTC(2001, 0, 9)))).toBe('09/01/2001');
  });

  it('devuelve vacío si no hay fecha válida', () => {
    expect(formatearFechaDDMMAAAA(undefined)).toBe('');
    expect(formatearFechaDDMMAAAA(null)).toBe('');
    expect(formatearFechaDDMMAAAA('')).toBe('');
    expect(formatearFechaDDMMAAAA('no es fecha')).toBe('');
  });
});
