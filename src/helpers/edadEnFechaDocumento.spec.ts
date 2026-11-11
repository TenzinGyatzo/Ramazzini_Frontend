import { describe, expect, it } from 'vitest';
import {
  fechaEnQueCumple,
  fechasMinimasPorEdad,
  mensajeEdadEnFechaDocumento,
} from './edadEnFechaDocumento';

describe('edad en la fecha del documento (E2, cumplimiento normativo)', () => {
  it('día en que cumple, con 29 de febrero en año no bisiesto', () => {
    expect(fechaEnQueCumple('2009-11-11', 17)).toBe('2026-11-11');
    expect(fechaEnQueCumple('2008-02-29', 17)).toBe('2025-03-01');
    expect(fechaEnQueCumple(null, 17)).toBeNull();
  });

  it('trabajador: cumple 17 ese día → sin mensaje; un día antes → mensaje', () => {
    const edades = { trabajadorNacimiento: '2009-11-11' };
    expect(mensajeEdadEnFechaDocumento('2026-11-11', edades)).toBe('');
    expect(mensajeEdadEnFechaDocumento('2026-11-10', edades)).toBe(
      'En la fecha del documento el trabajador aún no tenía 17 años (los cumple el 11/11/2026).',
    );
  });

  it('firmante: 18 cumplidos en la fecha del documento', () => {
    const edades = { firmanteNacimiento: '2008-11-11' };
    expect(mensajeEdadEnFechaDocumento('2026-11-11', edades)).toBe('');
    expect(mensajeEdadEnFechaDocumento('2026-10-20', edades)).toBe(
      'En la fecha del documento aún no tenías 18 años. Solo puedes firmar atenciones con fecha a partir del 11/11/2026.',
    );
  });

  it('acepta fechas ISO del servidor y sin datos no hay mensaje', () => {
    expect(
      mensajeEdadEnFechaDocumento('2026-11-10T00:00:00.000Z', {
        trabajadorNacimiento: '2009-11-11T00:00:00.000Z',
      }),
    ).toContain('aún no tenía 17 años');
    expect(mensajeEdadEnFechaDocumento('2026-11-10', {})).toBe('');
  });

  it('límites del calendario por edad', () => {
    expect(
      fechasMinimasPorEdad({ trabajadorNacimiento: '2009-11-11', firmanteNacimiento: '2008-10-01' }),
    ).toEqual({ trabajador: '2026-11-11', firmante: '2026-10-01' });
  });
});
