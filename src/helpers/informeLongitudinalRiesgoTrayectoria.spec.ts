import { describe, expect, it } from 'vitest';
import { inferirNivelRiesgoLongitudinalDescontrol } from '@/helpers/informeLongitudinalRiesgoTrayectoria';
import type { ParamsInferenciaRiesgoDescontrol } from '@/helpers/informeLongitudinalRiesgoTrayectoria';

const metricasBase = {
  numeroSeguimientosProgramados: 0,
  porcentajeAsistencia: undefined as number | undefined,
};

function baseParams(
  partial: Partial<ParamsInferenciaRiesgoDescontrol>,
): ParamsInferenciaRiesgoDescontrol {
  return {
    resumenIndicadores: undefined,
    resumenCondiciones: undefined,
    metricas: metricasBase,
    nEventosIncluidos: 2,
    numeroEventosValidos: 2,
    datosFaltantesCount: 0,
    eventosConcentrados: [],
    ...partial,
  };
}

describe('inferirNivelRiesgoLongitudinalDescontrol (ILC riesgo vs trayectoria)', () => {
  it('CP1 — picos extremos con mejoría marcada: riesgo Alto/Crítico, trayectoria Favorable, no Muy Bajo', () => {
    const resumenIndicadores = {
      tensionArterialSistolica: {
        valorInicial: 143,
        valorFinal: 156,
        peorValor: 156,
        mejorValor: 143,
        tieneDatosSuficientes: true,
        numeroMediciones: 4,
        tendencia: 'Empeoramiento',
      },
      indiceMasaCorporal: {
        valorInicial: 37.51,
        valorFinal: 38.62,
        peorValor: 38.62,
        mejorValor: 37.51,
        tieneDatosSuficientes: true,
        numeroMediciones: 4,
        tendencia: 'Empeoramiento',
      },
      glucosaMgDl: {
        valorInicial: 410,
        valorFinal: 125,
        peorValor: 410,
        mejorValor: 125,
        tieneDatosSuficientes: true,
        numeroMediciones: 4,
        tendencia: 'Mejoría',
      },
      hba1cPorcentaje: {
        valorInicial: 22,
        valorFinal: 6.3,
        peorValor: 22,
        mejorValor: 6.3,
        tieneDatosSuficientes: true,
        numeroMediciones: 4,
        tendencia: 'Mejoría',
      },
    };
    const resumenCondiciones = {
      hipertension: { presente: true, estadoActual: 'NO_CONTROLADA', tendencia: 'Estable' },
      diabetes: { presente: true, estadoActual: 'NO_CONTROLADA', tendencia: 'Mejoría' },
      dislipidemia: { presente: true, estadoActual: 'NO_CONTROLADA', tendencia: 'Estable' },
      obesidad: { presente: true, gradoActual: 'OBESIDAD_II', tendencia: 'Estable' },
    };
    const eventosConcentrados = [1, 2, 3, 4].map(() => ({
      estadoCondiciones: {
        diabetesMellitusTipo2: { control: 'NO_CONTROLADA' },
      },
    }));
    const r = inferirNivelRiesgoLongitudinalDescontrol(
      baseParams({
        resumenIndicadores,
        resumenCondiciones,
        eventosConcentrados,
      }),
    );
    expect(['Alto', 'Crítico']).toContain(r.nivelRiesgoLongitudinal);
    expect(r.nivelRiesgoLongitudinal).not.toBe('Muy Bajo');
    expect(r.nivelRiesgoLongitudinal).not.toBe('Bajo');
    expect(r.tendenciaLongitudinal).toBe('Favorable');
    expect(r.interpretacionRiesgoLongitudinal?.toLowerCase()).toContain('favorable');
  });

  it('CP2 — valores leves y pocas condiciones: riesgo bajo y trayectoria favorable o estable', () => {
    const resumenIndicadores = {
      tensionArterialSistolica: {
        valorInicial: 118,
        valorFinal: 122,
        peorValor: 122,
        mejorValor: 118,
        tieneDatosSuficientes: true,
        numeroMediciones: 2,
        tendencia: 'Estable',
      },
      glucosaMgDl: {
        valorInicial: 92,
        valorFinal: 88,
        peorValor: 92,
        mejorValor: 88,
        tieneDatosSuficientes: true,
        numeroMediciones: 2,
        tendencia: 'Mejoría',
      },
    };
    const resumenCondiciones = {
      hipertension: { presente: true, estadoActual: 'CONTROLADA', tendencia: 'Estable' },
    };
    const r = inferirNivelRiesgoLongitudinalDescontrol(
      baseParams({ resumenIndicadores, resumenCondiciones }),
    );
    expect(['Muy Bajo', 'Bajo']).toContain(r.nivelRiesgoLongitudinal);
    expect(['Favorable', 'Estable']).toContain(r.tendenciaLongitudinal);
  });

  it('CP3 — pico glucémico extremo aislado (una medición): advertencia y riesgo no solo Crítico por aislamiento', () => {
    const resumenIndicadores = {
      glucosaMgDl: {
        valorInicial: 420,
        valorFinal: 420,
        peorValor: 420,
        mejorValor: 420,
        tieneDatosSuficientes: false,
        numeroMediciones: 1,
      },
      tensionArterialSistolica: {
        valorInicial: 118,
        valorFinal: 120,
        peorValor: 120,
        mejorValor: 118,
        tieneDatosSuficientes: true,
        numeroMediciones: 3,
        tendencia: 'Estable',
      },
    };
    const r = inferirNivelRiesgoLongitudinalDescontrol(
      baseParams({ resumenIndicadores, numeroEventosValidos: 2, nEventosIncluidos: 2 }),
    );
    expect(r.nivelRiesgoLongitudinal).not.toBe('Crítico');
    expect(r.drivers?.advertencias.some((a) => /Pico glucémico|una sola medición/i.test(a))).toBe(true);
  });

  it('CP4 — carga múltiple alta: Crítico y trayectoria desfavorable o mixta', () => {
    const resumenIndicadores = {
      hba1cPorcentaje: {
        valorInicial: 13,
        valorFinal: 13,
        peorValor: 13,
        mejorValor: 13,
        tieneDatosSuficientes: true,
        numeroMediciones: 3,
        tendencia: 'Estable',
      },
      glucosaMgDl: {
        valorInicial: 350,
        valorFinal: 340,
        peorValor: 350,
        mejorValor: 340,
        tieneDatosSuficientes: true,
        numeroMediciones: 3,
        tendencia: 'Estable',
      },
      tensionArterialSistolica: {
        valorInicial: 172,
        valorFinal: 170,
        peorValor: 172,
        mejorValor: 170,
        tieneDatosSuficientes: true,
        numeroMediciones: 3,
        tendencia: 'Estable',
      },
      tensionArterialDiastolica: {
        valorInicial: 88,
        valorFinal: 86,
        peorValor: 88,
        mejorValor: 86,
        tieneDatosSuficientes: true,
        numeroMediciones: 3,
        tendencia: 'Estable',
      },
    };
    const r = inferirNivelRiesgoLongitudinalDescontrol(
      baseParams({ resumenIndicadores, nEventosIncluidos: 3, numeroEventosValidos: 3 }),
    );
    expect(r.nivelRiesgoLongitudinal).toBe('Crítico');
    expect(['Desfavorable', 'Mixta', 'Estable']).toContain(r.tendenciaLongitudinal);
  });

  it('CP5 — sin eventos: No valorable e Insuficiente información', () => {
    const r = inferirNivelRiesgoLongitudinalDescontrol(
      baseParams({ nEventosIncluidos: 0, numeroEventosValidos: 0 }),
    );
    expect(r.nivelRiesgoLongitudinal).toBe('No valorable');
    expect(r.tendenciaLongitudinal).toBe('Insuficiente información');
    expect(r.drivers?.datosInsuficientes).toBe(true);
  });
});
