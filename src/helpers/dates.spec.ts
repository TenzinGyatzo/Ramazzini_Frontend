import { describe, it, expect } from 'vitest';
import {
  calcularEdad,
  calcularEdadPrecisa,
  calcularAntiguedad,
  isBirthDateInRegistrationRange,
  getRegistrationBirthDateInputBounds,
  buildRegistrationAgeRangeMessage,
} from './dates';
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

  it('should use firmante age constants 18-90', () => {
    expect(FIRMANTE_EDAD_MINIMA).toBe(18);
    expect(FIRMANTE_EDAD_MAXIMA).toBe(90);

    const edadValida = calcularEdadPrecisa(getFechaNacimientoYearsAgo(45));
    expect(edadValida).toBeGreaterThanOrEqual(FIRMANTE_EDAD_MINIMA);
    expect(edadValida).toBeLessThanOrEqual(FIRMANTE_EDAD_MAXIMA);
  });
});

describe('isBirthDateInRegistrationRange - regla 2', () => {
  it('trabajador: rechaza 17a 11m 30d y 100a 0m 1d', () => {
    expect(
      isBirthDateInRegistrationRange(
        date(2008, 8, 8),
        REF,
        TRABAJADOR_EDAD_MINIMA,
        TRABAJADOR_EDAD_MAXIMA,
      ),
    ).toBe(false);
    expect(
      isBirthDateInRegistrationRange(
        date(1926, 8, 6),
        REF,
        TRABAJADOR_EDAD_MINIMA,
        TRABAJADOR_EDAD_MAXIMA,
      ),
    ).toBe(false);
  });

  it('trabajador: acepta 18a 0m 0d, 18a 0m 1d y 100a 0m 0d', () => {
    expect(
      isBirthDateInRegistrationRange(
        date(2008, 8, 7),
        REF,
        TRABAJADOR_EDAD_MINIMA,
        TRABAJADOR_EDAD_MAXIMA,
      ),
    ).toBe(true);
    expect(
      isBirthDateInRegistrationRange(
        date(2008, 8, 6),
        REF,
        TRABAJADOR_EDAD_MINIMA,
        TRABAJADOR_EDAD_MAXIMA,
      ),
    ).toBe(true);
    expect(
      isBirthDateInRegistrationRange(
        date(1926, 8, 7),
        REF,
        TRABAJADOR_EDAD_MINIMA,
        TRABAJADOR_EDAD_MAXIMA,
      ),
    ).toBe(true);
  });

  it('firmante: rechaza 90a 0m 1d y acepta 90a 0m 0d', () => {
    expect(
      isBirthDateInRegistrationRange(date(1936, 8, 6), REF, 18, 90),
    ).toBe(false);
    expect(
      isBirthDateInRegistrationRange(date(1936, 8, 7), REF, 18, 90),
    ).toBe(true);
  });

  it('parsea strings YYYY-MM-DD como fecha local (input type=date)', () => {
    expect(
      isBirthDateInRegistrationRange(
        '1926-08-07',
        REF,
        TRABAJADOR_EDAD_MINIMA,
        TRABAJADOR_EDAD_MAXIMA,
      ),
    ).toBe(true);
    expect(
      isBirthDateInRegistrationRange(
        '1926-08-06',
        REF,
        TRABAJADOR_EDAD_MINIMA,
        TRABAJADOR_EDAD_MAXIMA,
      ),
    ).toBe(false);
    expect(
      isBirthDateInRegistrationRange('1936-08-07', REF, 18, 90),
    ).toBe(true);
    expect(
      isBirthDateInRegistrationRange('1936-08-06', REF, 18, 90),
    ).toBe(false);
  });

  it('parsea fechas ISO UTC como date-only', () => {
    expect(
      isBirthDateInRegistrationRange(
        '1926-08-07T00:00:00.000Z',
        REF,
        TRABAJADOR_EDAD_MINIMA,
        TRABAJADOR_EDAD_MAXIMA,
      ),
    ).toBe(true);
    expect(
      isBirthDateInRegistrationRange(
        new Date('1926-08-07T00:00:00.000Z'),
        REF,
        TRABAJADOR_EDAD_MINIMA,
        TRABAJADOR_EDAD_MAXIMA,
      ),
    ).toBe(true);
  });

  it('genera mensaje descriptivo con edad calculada', () => {
    expect(
      buildRegistrationAgeRangeMessage(
        TRABAJADOR_EDAD_MINIMA,
        TRABAJADOR_EDAD_MAXIMA,
        '1926-08-07',
        REF,
      ),
    ).toBe(
      'Edad fuera de rango (18 a 100 años, incluyendo meses y días). Edad calculada: 100 años, 0 meses y 0 días.',
    );
  });
});

describe('getRegistrationBirthDateInputBounds', () => {
  it('genera límites YYYY-MM-DD alineados con la regla exacta', () => {
    const bounds = getRegistrationBirthDateInputBounds(
      TRABAJADOR_EDAD_MINIMA,
      TRABAJADOR_EDAD_MAXIMA,
      REF,
    );
    expect(bounds.min).toBe('1926-08-07');
    expect(bounds.max).toBe('2008-08-07');
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
