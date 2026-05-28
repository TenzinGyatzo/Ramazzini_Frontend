import { describe, it, expect } from 'vitest';
import { calcularEdadPrecisa } from './dates';
import { FIRMANTE_EDAD_MINIMA, FIRMANTE_EDAD_MAXIMA } from '../../formkit.config';

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
