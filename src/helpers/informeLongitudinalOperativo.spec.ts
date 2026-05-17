import { describe, expect, it } from 'vitest';
import type { EventoConcentradoCardiometabolicoEsc } from '@/interfaces/documentos.inteface';
import { derivarContextoTerapeutico } from './informeLongitudinalOperativo';

const metformina = {
  medicamento: 'Metformina',
  dosis: '850 mg',
  frecuencia: 'Cada 12 h',
  motivoUso: 'DM2',
};

function ev(fecha: string, tratamiento?: typeof metformina[]): EventoConcentradoCardiometabolicoEsc {
  return { fechaControl: fecha, tratamientoActual: tratamiento };
}

describe('derivarContextoTerapeutico', () => {
  it('sin tratamiento en ningún control no genera viñetas', () => {
    expect(
      derivarContextoTerapeutico({
        eventosConcentrados: [ev('2025-01-01'), ev('2025-06-01')],
        resumenIndicadores: undefined,
        tendenciaLongitudinal: undefined,
      }),
    ).toEqual([]);
  });

  it('régimen estable en varios controles genera viñeta de estabilidad', () => {
    const ctx = derivarContextoTerapeutico({
      eventosConcentrados: [
        ev('2025-01-01', [metformina]),
        ev('2025-03-01', [metformina]),
        ev('2025-06-01', [metformina]),
      ],
      resumenIndicadores: undefined,
      tendenciaLongitudinal: undefined,
    });
    expect(ctx.length).toBeGreaterThanOrEqual(1);
    expect(ctx[0]).toMatch(/mismo régimen terapéutico|régimen terapéutico estable/i);
  });

  it('variación de dosis entre controles genera viñeta de variación', () => {
    const ctx = derivarContextoTerapeutico({
      eventosConcentrados: [
        ev('2025-01-01', [metformina]),
        ev('2025-04-01', [{ ...metformina, dosis: '1000 mg' }]),
      ],
      resumenIndicadores: undefined,
      tendenciaLongitudinal: undefined,
    });
    expect(ctx.some((v) => /variación de régimen/i.test(v))).toBe(true);
  });

  it('tratamiento solo en un control de varios añade viñeta parcial', () => {
    const ctx = derivarContextoTerapeutico({
      eventosConcentrados: [ev('2025-01-01', [metformina]), ev('2025-06-01')],
      resumenIndicadores: undefined,
      tendenciaLongitudinal: undefined,
    });
    expect(ctx.some((v) => /un solo control|no consta en todos/i.test(v))).toBe(true);
  });

  it('único control del periodo con tratamiento', () => {
    const ctx = derivarContextoTerapeutico({
      eventosConcentrados: [ev('2025-01-01', [metformina])],
      resumenIndicadores: undefined,
      tendenciaLongitudinal: undefined,
    });
    expect(ctx[0]).toMatch(/único control del periodo/i);
  });

  it('régimen estable con tendencia favorable prioriza viñeta de mejoría', () => {
    const ctx = derivarContextoTerapeutico({
      eventosConcentrados: [ev('2025-01-01', [metformina]), ev('2025-06-01', [metformina])],
      resumenIndicadores: undefined,
      tendenciaLongitudinal: 'Favorable',
    });
    expect(ctx[0]).toMatch(/mejoría/i);
  });
});
