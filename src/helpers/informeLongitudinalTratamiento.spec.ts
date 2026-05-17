import { describe, expect, it } from 'vitest';
import type { EventoConcentradoCardiometabolicoEsc } from '@/interfaces/documentos.inteface';
import {
  buildCeldasTratamientoPeriodo,
  fingerprintRegimenTratamiento,
  hayRegimenTerapeuticoEstableEnPeriodo,
  hayVariosRegimenesTratamientoEnPeriodo,
  refrescarEventosConcentradosEnInforme,
  resumenRegimenTratamientoEnPeriodo,
} from './informeLongitudinalTratamiento';

const metformina = {
  medicamento: 'Metformina',
  dosis: '850 mg',
  frecuencia: 'Cada 12 h',
  motivoUso: 'DM2',
};

function ev(
  fecha: string,
  opts?: { tratamiento?: typeof metformina[] },
): EventoConcentradoCardiometabolicoEsc {
  return {
    fechaControl: fecha,
    tratamientoActual: opts?.tratamiento,
  };
}

describe('buildCeldasTratamientoPeriodo — agrupación por fingerprint', () => {
  it('agrupa 3 controles con mismo régimen en una tarjeta con periodo', () => {
    const eventos = [
      ev('2025-01-01', { tratamiento: [metformina] }),
      ev('2025-03-15', { tratamiento: [metformina] }),
      ev('2025-06-20', { tratamiento: [metformina] }),
    ];
    const celdas = buildCeldasTratamientoPeriodo(eventos);
    expect(celdas).toHaveLength(1);
    expect(celdas[0].fechaLabel).toBe('01-01-2025 – 20-06-2025');
    expect(celdas[0].fechaInicio).toBe('2025-01-01');
    expect(celdas[0].fechaFin).toBe('2025-06-20');
    expect(celdas[0].medicamentos[0]).toContain('Metformina');
  });

  it('abre segunda tarjeta cuando cambia el fingerprint (p. ej. dosis)', () => {
    const eventos = [
      ev('2025-01-01', { tratamiento: [metformina] }),
      ev('2025-04-01', {
        tratamiento: [{ ...metformina, dosis: '1000 mg' }],
      }),
    ];
    expect(fingerprintRegimenTratamiento(eventos[0])).not.toBe(
      fingerprintRegimenTratamiento(eventos[1]),
    );
    const celdas = buildCeldasTratamientoPeriodo(eventos);
    expect(celdas).toHaveLength(2);
    expect(celdas[0].fechaLabel).toBe('01-01-2025');
    expect(celdas[1].fechaLabel).toBe('01-04-2025');
    expect(celdas[1].medicamentos[0]).toContain('1000 mg');
  });

  it('refrescarEventosConcentradosEnInforme usa tratamiento actual del expediente', () => {
    const form = {
      eventosIncluidos: ['ev1', 'ev2'],
      eventosConcentrados: [
        {
          idEventoOriginal: 'ev1',
          fechaControl: '2025-01-01',
          tratamientoActual: [{ ...metformina, dosis: '500 mg' }],
        },
      ],
    };
    const expediente = [
      {
        _id: 'ev1',
        fechaEventoSeguimientoCardiometabolico: '2025-01-01',
        tratamientoActual: [metformina],
      },
      {
        _id: 'ev2',
        fechaEventoSeguimientoCardiometabolico: '2025-03-01',
        tratamientoActual: [metformina],
      },
    ];
    expect(refrescarEventosConcentradosEnInforme(form, expediente)).toBe(true);
    expect(form.eventosConcentrados).toHaveLength(2);
    expect(form.eventosConcentrados![0].tratamientoActual![0].dosis).toBe('850 mg');
    const celdas = buildCeldasTratamientoPeriodo(form.eventosConcentrados);
    expect(celdas).toHaveLength(1);
    expect(celdas[0].fechaLabel).toBe('01-01-2025 – 01-03-2025');
  });
});

describe('resumenRegimenTratamientoEnPeriodo', () => {
  it('cuenta controles con y sin tratamiento', () => {
    const r = resumenRegimenTratamientoEnPeriodo([
      ev('2025-01-01', { tratamiento: [metformina] }),
      ev('2025-06-01'),
    ]);
    expect(r.controlesTotales).toBe(2);
    expect(r.controlesConTratamiento).toBe(1);
    expect(r.fingerprintsDistintos).toBe(1);
    expect(hayRegimenTerapeuticoEstableEnPeriodo([ev('2025-01-01', { tratamiento: [metformina] })])).toBe(
      true,
    );
  });
});

describe('hayVariosRegimenesTratamientoEnPeriodo', () => {
  it('devuelve false con un solo régimen', () => {
    const eventos = [
      ev('2025-01-01', { tratamiento: [metformina] }),
      ev('2025-06-01', { tratamiento: [metformina] }),
    ];
    expect(hayVariosRegimenesTratamientoEnPeriodo(eventos)).toBe(false);
  });

  it('devuelve true con dos fingerprints distintos', () => {
    const eventos = [
      ev('2025-01-01', { tratamiento: [metformina] }),
      ev('2025-04-01', { tratamiento: [{ ...metformina, dosis: '1000 mg' }] }),
    ];
    expect(hayVariosRegimenesTratamientoEnPeriodo(eventos)).toBe(true);
  });
});
