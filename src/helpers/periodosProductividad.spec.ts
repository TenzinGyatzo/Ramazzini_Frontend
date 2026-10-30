import { describe, expect, it } from 'vitest';
import { fechasDePeriodo } from './periodosProductividad';

describe('fechasDePeriodo', () => {
  it('en domingo, «Esta semana» es la que termina ese día', () => {
    // 1 de noviembre de 2026, domingo
    expect(fechasDePeriodo('Esta semana', new Date(2026, 10, 1, 22, 30))).toEqual({
      inicio: '2026-10-26',
      fin: '2026-11-01',
    });
  });

  it('entre semana va de lunes a domingo', () => {
    expect(fechasDePeriodo('Esta semana', new Date(2026, 9, 30, 12))).toEqual({
      inicio: '2026-10-26',
      fin: '2026-11-01',
    });
  });

  it('por la noche no se pasa al día siguiente', () => {
    expect(fechasDePeriodo('Hoy', new Date(2026, 9, 30, 23, 45))).toEqual({
      inicio: '2026-10-30',
      fin: '2026-10-30',
    });
  });

  it('«Mes anterior» cruza el año', () => {
    expect(fechasDePeriodo('Mes anterior', new Date(2026, 0, 15))).toEqual({
      inicio: '2025-12-01',
      fin: '2025-12-31',
    });
  });

  it('un periodo desconocido no da fechas', () => {
    expect(fechasDePeriodo('')).toBeNull();
  });
});
