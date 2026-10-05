import { describe, expect, it } from 'vitest';
import { esAudiometriaExternaUtilizable, usarAudiometriaExterna } from './audiometriaFuente';
import {
  calcularProporcionAudiometria,
  distribuirResultadosAudiometria,
  type AudiometriaResumen,
} from './dashboardDataProcessor';

const externa = (fechaEstudio: string, resultadoGlobal = 'ANORMAL') => ({ fechaEstudio, resultadoGlobal });

// Mismos casos que backend/src/utils/audiometria-fuente.util.spec.ts
describe('audiometriaFuente', () => {
  it('sin audiometría de Ramazzini se usa la externa', () => {
    expect(usarAudiometriaExterna(null, externa('2026-05-10'))).toBe(true);
  });

  it('sin externa se queda la de Ramazzini', () => {
    expect(usarAudiometriaExterna('2026-05-10', null)).toBe(false);
  });

  it('gana la más reciente', () => {
    expect(usarAudiometriaExterna('2026-03-01', externa('2026-08-20'))).toBe(true);
    expect(usarAudiometriaExterna('2026-08-20', externa('2026-03-01'))).toBe(false);
  });

  it('el mismo día gana la de Ramazzini, aunque la hora de la externa sea posterior', () => {
    expect(usarAudiometriaExterna('2026-05-10T00:00:00.000Z', externa('2026-05-10T18:00:00.000Z'))).toBe(false);
  });

  it('una externa no concluyente nunca sustituye ni cuenta', () => {
    const noConcluyente = externa('2026-08-20', 'NO_CONCLUYENTE');
    expect(esAudiometriaExternaUtilizable(noConcluyente)).toBe(false);
    expect(usarAudiometriaExterna('2026-03-01', noConcluyente)).toBe(false);
    expect(usarAudiometriaExterna(null, noConcluyente)).toBe(false);
  });
});

describe('estadísticas de audiometría con resultados externos', () => {
  const nativa = (ppab: number): AudiometriaResumen => ({
    metodoAudiometria: 'AMA',
    perdidaAuditivaBilateralAMA: ppab,
    hipoacusiaBilateralCombinada: null,
    caidaMaxDb: null,
  });
  const ext = (resultadoGlobal: string, gradoHipoacusia: string | null = null): AudiometriaResumen => ({
    metodoAudiometria: null,
    perdidaAuditivaBilateralAMA: null,
    hipoacusiaBilateralCombinada: null,
    caidaMaxDb: null,
    externa: { resultadoGlobal, gradoHipoacusia },
  });

  const datos = [nativa(10), nativa(50), ext('NORMAL'), ext('ANORMAL', 'MODERADA'), ext('ANORMAL', 'MODERADA_SEVERA')];

  it('la proporción cuenta externas y de Ramazzini por igual', () => {
    expect(calcularProporcionAudiometria(datos)).toEqual({ Normal: 2, Anormal: 3 });
  });

  it('la distribución ubica cada externa en la categoría de su grado', () => {
    const conteo = Object.fromEntries(distribuirResultadosAudiometria(datos).map(([etiqueta, n]) => [etiqueta, n]));
    expect(conteo).toEqual({
      Normal: 2,
      'Hipoacusia leve': 0,
      'Hipoacusia moderada': 2,
      'H. moderada-severa': 1,
      'Hipoacusia severa': 0,
      'Hipoacusia profunda': 0,
    });
  });

  it('las dos gráficas suman el mismo total', () => {
    const p = calcularProporcionAudiometria(datos);
    const total = distribuirResultadosAudiometria(datos).reduce((acc, [, n]) => acc + n, 0);
    expect(total).toBe(p.Normal + p.Anormal);
  });
});
