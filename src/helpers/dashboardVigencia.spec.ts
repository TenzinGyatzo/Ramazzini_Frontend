import { describe, expect, it } from 'vitest';
import { estadoDeVigencia, resumirVigencia } from './dashboardVigencia';

const HOY = new Date('2026-10-11T12:00:00.000Z');
const hace = (dias: number) => new Date(HOY.getTime() - dias * 864e5).toISOString();

describe('tablero: vigencia de la aptitud', () => {
  it('usa los mismos cortes que la tabla de trabajadores', () => {
    expect(estadoDeVigencia(hace(0), HOY)).toBe('Vigente');
    expect(estadoDeVigencia(hace(303), HOY)).toBe('Vigente');
    expect(estadoDeVigencia(hace(304), HOY)).toBe('Por vencer');
    expect(estadoDeVigencia(hace(364), HOY)).toBe('Por vencer');
    expect(estadoDeVigencia(hace(365), HOY)).toBe('Vencido');
    expect(estadoDeVigencia(hace(900), HOY)).toBe('Vencido');
  });

  it('sin fecha o con fecha inválida no hay vigencia', () => {
    expect(estadoDeVigencia(null, HOY)).toBeNull();
    expect(estadoDeVigencia('no es fecha', HOY)).toBeNull();
  });

  it('cuenta a los activos sin aptitud aparte', () => {
    expect(
      resumirVigencia(
        [
          { fechaAptitudPuesto: hace(10) },
          { fechaAptitudPuesto: hace(100) },
          { fechaAptitudPuesto: hace(320) },
          { fechaAptitudPuesto: hace(500) },
          { fechaAptitudPuesto: null },
        ],
        HOY,
      ),
    ).toEqual({ activos: 5, conAptitud: 4, sinAptitud: 1, vigentes: 2, porVencer: 1, vencidas: 1 });
    expect(resumirVigencia([], HOY).conAptitud).toBe(0);
  });
});
