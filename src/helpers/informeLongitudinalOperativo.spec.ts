import { describe, expect, it } from 'vitest';
import type { EventoConcentradoCardiometabolicoEsc } from '@/interfaces/documentos.inteface';
import {
  aplicarIteracionDosAlFormulario,
  calcularSugerenciaRiesgoLongitudinal,
  derivarContextoTerapeutico,
  derivarResumenCondicionesDesdeEventos,
} from './informeLongitudinalOperativo';
import type { InformeLongitudinalCardiometabolico } from '@/interfaces/documentos.inteface';

const metformina = {
  medicamento: 'Metformina',
  dosis: '850 mg',
  frecuencia: 'Cada 12 h',
  motivoUso: 'DM2',
};

function ev(fecha: string, tratamiento?: typeof metformina[]): EventoConcentradoCardiometabolicoEsc {
  return { fechaControl: fecha, tratamientoActual: tratamiento };
}

describe('derivarResumenCondicionesDesdeEventos', () => {
  it('deriva último control y tendencia de hipertensión con dx activo', () => {
    const rc = derivarResumenCondicionesDesdeEventos([
      {
        fechaControl: '2025-01-01',
        diagnosticosActivos: ['HIPERTENSION_ARTERIAL'],
        estadoCondiciones: { hipertensionArterial: { control: 'NO_CONTROLADA' } },
        signosVitales: { tensionArterialSistolica: 150, tensionArterialDiastolica: 95 },
      },
      {
        fechaControl: '2025-06-01',
        diagnosticosActivos: ['HIPERTENSION_ARTERIAL'],
        estadoCondiciones: { hipertensionArterial: { control: 'CONTROLADA' } },
        signosVitales: { tensionArterialSistolica: 120, tensionArterialDiastolica: 78 },
      },
    ]);
    expect(rc?.hipertension?.presente).toBe(true);
    expect(rc?.hipertension?.estadoActual).toBe('CONTROLADA');
    expect(rc?.hipertension?.tendencia).toBe('Mejoría');
  });

  it('alteración DM2 sin dx → presente false, vigencia ALTERACION', () => {
    const rc = derivarResumenCondicionesDesdeEventos([
      {
        fechaControl: '2025-01-01',
        laboratorio: { glucosaMgDl: 145, categoriaGlucosa: 'Elevada', hba1cPorcentaje: 6.8 },
      },
      { fechaControl: '2025-06-01' },
    ]);
    expect(rc?.diabetes?.presente).toBe(false);
    expect(rc?.diabetes?.codigoEstadoVigencia).toBe('SIN_DIAGNOSTICO_ACTIVO');
    expect(rc?.diabetes?.estadoActual).toBeUndefined();
  });

  it('CONTROLADA → NO_VALORABLE con dx: sin tendencia', () => {
    const rc = derivarResumenCondicionesDesdeEventos([
      {
        fechaControl: '2025-01-01',
        diagnosticosActivos: ['DIABETES_MELLITUS_TIPO_2'],
        estadoCondiciones: { diabetesMellitusTipo2: { control: 'CONTROLADA' } },
        laboratorio: { hba1cPorcentaje: 6.0, categoriaHbA1c: 'Normal' },
      },
      {
        fechaControl: '2025-06-01',
        diagnosticosActivos: ['DIABETES_MELLITUS_TIPO_2'],
        laboratorio: { glucosaMgDl: 110, categoriaGlucosa: 'Alterada', hba1cPorcentaje: 5.9, categoriaHbA1c: 'Prediabetes' },
      },
    ]);
    expect(rc?.diabetes?.presente).toBe(true);
    expect(rc?.diabetes?.tendencia).toBeUndefined();
  });

  it('NO_VALORABLE → CONTROLADA con dx: sin tendencia (no Mejoría)', () => {
    const rc = derivarResumenCondicionesDesdeEventos([
      {
        fechaControl: '2025-01-01',
        diagnosticosActivos: ['DIABETES_MELLITUS_TIPO_2'],
        laboratorio: { glucosaMgDl: 110, categoriaGlucosa: 'Alterada', hba1cPorcentaje: 5.9 },
      },
      {
        fechaControl: '2025-06-01',
        diagnosticosActivos: ['DIABETES_MELLITUS_TIPO_2'],
        estadoCondiciones: { diabetesMellitusTipo2: { control: 'CONTROLADA' } },
        laboratorio: { hba1cPorcentaje: 6.0, categoriaHbA1c: 'Normal' },
      },
    ]);
    expect(rc?.diabetes?.tendencia).toBeUndefined();
  });

  it('sin datos de coherencia en ninguna visita devuelve undefined', () => {
    expect(derivarResumenCondicionesDesdeEventos([{ fechaControl: '2025-01-01' }])).toBeUndefined();
  });
});

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

  it('régimen estable con tendencia favorable prioriza viñeta de mejoría', () => {
    const ctx = derivarContextoTerapeutico({
      eventosConcentrados: [ev('2025-01-01', [metformina]), ev('2025-06-01', [metformina])],
      resumenIndicadores: undefined,
      tendenciaLongitudinal: 'Favorable',
    });
    expect(ctx[0]).toMatch(/mejoría/i);
  });
});

describe('calcularSugerenciaRiesgoLongitudinal', () => {
  it('devuelve nivel e interpretación sin mutar el formulario', () => {
    const form: InformeLongitudinalCardiometabolico = {
      fechaInformeLongitudinalCardiometabolico: '2025-12-01',
      periodoInicio: '2025-01-01',
      periodoFin: '2025-12-01',
      numeroEventosIncluidos: 2,
      nivelRiesgoLongitudinal: 'Bajo',
      interpretacionRiesgoLongitudinal: 'Texto fijo del médico',
      eventosConcentrados: [
        {
          fechaControl: '2025-01-01',
          laboratorio: { glucosaMgDl: 200, ldlMgDl: 120 },
          signosVitales: { tensionArterialSistolica: 80, tensionArterialDiastolica: 95 },
        },
        {
          fechaControl: '2025-06-01',
          laboratorio: { glucosaMgDl: 140, ldlMgDl: 190 },
        },
      ],
    };
    const s = calcularSugerenciaRiesgoLongitudinal(form);
    expect(s.nivelRiesgoLongitudinal).toBeTruthy();
    expect(s.interpretacionRiesgoLongitudinal).toBeTruthy();
    expect(form.nivelRiesgoLongitudinal).toBe('Bajo');
    expect(form.interpretacionRiesgoLongitudinal).toBe('Texto fijo del médico');
  });
});

describe('aplicarIteracionDosAlFormulario', () => {
  it('integra riesgo y trayectoria con sobrescribirInterpretacionAutomatizada', () => {
    const form: InformeLongitudinalCardiometabolico = {
      fechaInformeLongitudinalCardiometabolico: '2025-12-01',
      periodoInicio: '2025-01-01',
      periodoFin: '2025-12-01',
      numeroEventosIncluidos: 2,
      eventosConcentrados: [
        {
          fechaControl: '2025-01-01',
          laboratorio: { glucosaMgDl: 200, ldlMgDl: 120 },
          signosVitales: { tensionArterialSistolica: 80, tensionArterialDiastolica: 95 },
        },
        {
          fechaControl: '2025-06-01',
          laboratorio: { glucosaMgDl: 140, ldlMgDl: 190 },
        },
      ],
    };
    aplicarIteracionDosAlFormulario(form, { sobrescribirInterpretacionAutomatizada: true });
    expect(form.tendenciaLongitudinal).not.toBe('Insuficiente información');
    expect(form.resumenIndicadores?.glucosaMgDl?.tendencia).toBe('Mejoría');
    expect(form.nivelRiesgoLongitudinal).toBeTruthy();
    expect(form.interpretacionRiesgoLongitudinal).toBeTruthy();
  });

  it('preservarJuicioClinicoRiesgo no pisa riesgo ni interpretación del médico', () => {
    const form: InformeLongitudinalCardiometabolico = {
      fechaInformeLongitudinalCardiometabolico: '2025-12-01',
      periodoInicio: '2025-01-01',
      periodoFin: '2025-12-01',
      numeroEventosIncluidos: 2,
      nivelRiesgoLongitudinal: 'Moderado',
      interpretacionRiesgoLongitudinal: 'Juicio clínico personalizado.',
      eventosConcentrados: [
        {
          fechaControl: '2025-01-01',
          laboratorio: { glucosaMgDl: 200, ldlMgDl: 120 },
          signosVitales: { tensionArterialSistolica: 80, tensionArterialDiastolica: 95 },
        },
        {
          fechaControl: '2025-06-01',
          laboratorio: { glucosaMgDl: 140, ldlMgDl: 190 },
        },
      ],
    };
    aplicarIteracionDosAlFormulario(form, {
      recalcDatosFaltantes: true,
      preservarJuicioClinicoRiesgo: true,
    });
    expect(form.nivelRiesgoLongitudinal).toBe('Moderado');
    expect(form.interpretacionRiesgoLongitudinal).toBe('Juicio clínico personalizado.');
    expect(form.tendenciaLongitudinal).toBeTruthy();
    expect(form.resumenIndicadores?.glucosaMgDl?.tendencia).toBe('Mejoría');
  });
});
