import { describe, expect, it } from 'vitest';
import type { EventoConcentradoCardiometabolicoEsc } from '@/interfaces/documentos.inteface';
import { derivarResumenIndicadoresCompleto } from './informeLongitudinalIndicadores';
import { derivarResumenCondicionesDesdeEventos } from './informeLongitudinalOperativo';
import { inferirNivelRiesgoLongitudinalDescontrol } from './informeLongitudinalRiesgoTrayectoria';

const metBase = {
  numeroSeguimientosProgramados: 2,
  porcentajeAsistencia: 100,
};

function inferir(
  eventos: EventoConcentradoCardiometabolicoEsc[],
  rc?: Parameters<typeof inferirNivelRiesgoLongitudinalDescontrol>[0]['resumenCondiciones'],
) {
  const ind = derivarResumenIndicadoresCompleto(eventos);
  return inferirNivelRiesgoLongitudinalDescontrol({
    resumenIndicadores: ind,
    resumenCondiciones: rc,
    metricas: metBase,
    nEventosIncluidos: eventos.length,
    numeroEventosValidos: eventos.length,
    datosFaltantesCount: 0,
    eventosConcentrados: eventos,
  });
}

describe('inferirNivelRiesgoLongitudinalDescontrol', () => {
  it('2 visitas glucosa mejora → trayectoria Favorable', () => {
    const r = inferir([
      { fechaControl: '2025-01-01', laboratorio: { glucosaMgDl: 200 } },
      { fechaControl: '2025-06-01', laboratorio: { glucosaMgDl: 140 } },
    ]);
    expect(r.tendenciaLongitudinal).toBe('Favorable');
  });

  it('glucosa mejora pero LDL peor 190 → riesgo elevado', () => {
    const r = inferir([
      { fechaControl: '2025-01-01', laboratorio: { glucosaMgDl: 200, ldlMgDl: 120 } },
      { fechaControl: '2025-06-01', laboratorio: { glucosaMgDl: 140, ldlMgDl: 190 } },
    ]);
    expect(r.tendenciaLongitudinal).toBe('Favorable');
    expect(['Alto', 'Crítico', 'Moderado']).toContain(r.nivelRiesgoLongitudinal);
    expect(r.drivers?.riesgo.some((x) => /LDL elevado/i.test(x))).toBe(true);
  });

  it('pico intermedio glucosa 400 eleva riesgo aunque final normal', () => {
    const r = inferir([
      { fechaControl: '2025-01-01', laboratorio: { glucosaMgDl: 200 } },
      { fechaControl: '2025-03-01', laboratorio: { glucosaMgDl: 400 } },
      { fechaControl: '2025-06-01', laboratorio: { glucosaMgDl: 110 } },
    ]);
    expect(r.tendenciaLongitudinal).toBe('Favorable');
    expect(['Alto', 'Crítico']).toContain(r.nivelRiesgoLongitudinal);
  });

  it('triglicéridos peor 520 → riesgo alto y advertencia TG', () => {
    const r = inferir([
      { fechaControl: '2025-01-01', laboratorio: { trigliceridosMgDl: 300 } },
      { fechaControl: '2025-06-01', laboratorio: { trigliceridosMgDl: 520 } },
    ]);
    expect(['Alto', 'Crítico']).toContain(r.nivelRiesgoLongitudinal);
    expect(r.drivers?.advertencias.some((x) => /Triglicéridos ≥ 500/i.test(x))).toBe(true);
  });

  it('2 visitas TA sin tieneDatosSuficientes en slim → trayectoria no Insuficiente', () => {
    const r = inferir([
      {
        fechaControl: '2025-01-01',
        signosVitales: { tensionArterialSistolica: 150, tensionArterialDiastolica: 95 },
      },
      {
        fechaControl: '2025-06-01',
        signosVitales: { tensionArterialSistolica: 130, tensionArterialDiastolica: 85 },
      },
    ]);
    expect(r.tendenciaLongitudinal).not.toBe('Insuficiente información');
  });

  it('HTA NO_CONTROLADA → CONTROLADA vota Mejoría en trayectoria', () => {
    const r = inferir(
      [
        {
          fechaControl: '2025-01-01',
          signosVitales: { tensionArterialSistolica: 150, tensionArterialDiastolica: 95 },
        },
        {
          fechaControl: '2025-06-01',
          signosVitales: { tensionArterialSistolica: 125, tensionArterialDiastolica: 80 },
        },
      ],
      {
        hipertension: {
          presente: true,
          estadoActual: 'CONTROLADA',
          tendencia: 'Mejoría',
        },
      },
    );
    expect(r.tendenciaLongitudinal).toBe('Favorable');
  });

  it('alteración DM2 sin dx no incrementa condiciones no controladas', () => {
    const eventos = [
      {
        fechaControl: '2025-01-01',
        laboratorio: { glucosaMgDl: 145, categoriaGlucosa: 'Elevada', hba1cPorcentaje: 6.8 },
      },
    ];
    const rc = derivarResumenCondicionesDesdeEventos(eventos);
    const r = inferir(eventos, rc);
    expect(rc?.diabetes?.presente).toBe(false);
    expect(rc?.diabetes?.codigoEstadoVigencia).toBe('ALTERACION_DOCUMENTADA');
  });

  it('0 eventos → No valorable e Insuficiente información', () => {
    const r = inferirNivelRiesgoLongitudinalDescontrol({
      resumenIndicadores: undefined,
      resumenCondiciones: undefined,
      metricas: metBase,
      nEventosIncluidos: 0,
      numeroEventosValidos: 0,
      datosFaltantesCount: 0,
    });
    expect(r.nivelRiesgoLongitudinal).toBe('No valorable');
    expect(r.tendenciaLongitudinal).toBe('Insuficiente información');
  });
});
