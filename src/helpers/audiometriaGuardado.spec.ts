import { describe, expect, it } from 'vitest';
import {
  RECOMENDACIONES_POR_DEFECTO,
  calcularResultadosAudiometria,
  completarRespuestasPorDefecto,
  metodoAudiometriaPorDefecto,
  prepararAudiometriaParaGuardar,
  problemasUmbralesAudiometria,
} from './audiometriaGuardado';
import { calcularPerdidaAuditivaBilateralAMA, calcularPorcentajeMonauralAMA } from './audiometriaCalculos';
import { AU_SECCIONES, PASO_AU, pasoAudiometriaEnAsistente } from './audiometriaSections';
import { MENSAJE_DATOS_INSUFICIENTES, generarInterpretacionAudiometrica } from './audiometriaInterpretacion';

const FRECUENCIAS = [125, 250, 500, 1000, 2000, 3000, 4000, 6000, 8000];
function umbrales(od: number[], oi: number[]) {
  const df: Record<string, any> = {};
  FRECUENCIAS.forEach((f, i) => {
    df[`oidoDerecho${f}`] = od[i];
    df[`oidoIzquierdo${f}`] = oi[i];
  });
  return df;
}
const NORMAL = [10, 10, 10, 10, 10, 15, 15, 15, 15];
const CAIDA_4K = [10, 10, 15, 15, 20, 40, 55, 45, 30];

describe('audiometría: secciones (punto 44)', () => {
  it('6 secciones; los pasos de siempre a su sección', () => {
    expect(AU_SECCIONES.map((s) => s.nombre)).toEqual([
      'Método y fecha',
      'Umbrales',
      'Observaciones',
      'Interpretación',
      'Diagnóstico',
      'Recomendaciones',
    ]);
    expect([1, 2, 3, 4, 5, 6, 7].map((p) => pasoAudiometriaEnAsistente(p, true))).toEqual([1, 2, 2, 3, 4, 5, 6]);
    expect(pasoAudiometriaEnAsistente(6, false)).toBe(6);
  });
});

describe('audiometría: método por país', () => {
  it('LFT en México o sin país; AMA en otro país', () => {
    expect(metodoAudiometriaPorDefecto('MX')).toBe('LFT');
    expect(metodoAudiometriaPorDefecto(undefined)).toBe('LFT');
    expect(metodoAudiometriaPorDefecto('GT')).toBe('AMA');
    expect(metodoAudiometriaPorDefecto('CO')).toBe('AMA');
  });
});

describe('audiometría: resultados de los umbrales', () => {
  it('AMA: igual que los cálculos del visualizador y el PDF', () => {
    const df = calcularResultadosAudiometria(umbrales(CAIDA_4K, NORMAL), 'AMA');
    expect(df.perdidaMonauralOD_AMA).toBe(calcularPorcentajeMonauralAMA(df as any, 'Derecho'));
    expect(df.perdidaMonauralOI_AMA).toBe(calcularPorcentajeMonauralAMA(df as any, 'Izquierdo'));
    expect(df.perdidaAuditivaBilateralAMA).toBe(calcularPerdidaAuditivaBilateralAMA(df as any));
  });

  it('LFT: Fletcher con el rango de mayor pérdida y binaural (7·menor + mayor)/8', () => {
    const df = calcularResultadosAudiometria(umbrales(CAIDA_4K, NORMAL), 'LFT');
    // Rango B (2000–6000) del OD: (20+40+55+45)/4 × 0.8 = 32
    expect(df.porcentajePerdidaOD).toBe(32);
    // OI rango B: (10+15+15+15)/4 × 0.8 = 11
    expect(df.porcentajePerdidaOI).toBe(11);
    // (7·11 + 32)/8 = 13.625 → decimal ≥ 0.6 → 14
    expect(df.hipoacusiaBilateralCombinada).toBe(14);
  });

  it('sin umbrales no hay resultados (no se inventa 0 %)', () => {
    const df = calcularResultadosAudiometria({}, 'LFT');
    expect(df.porcentajePerdidaOD).toBeUndefined();
    expect(df.hipoacusiaBilateralCombinada).toBeUndefined();
  });
});

describe('audiometría: respuestas por defecto', () => {
  it('el método va desde el principio (de él dependen los cálculos); la fecha, al revisar', () => {
    const df = completarRespuestasPorDefecto({}, { pais: 'MX', hoy: '2026-11-21', visitado: () => false });
    expect(df.metodoAudiometria).toBe('LFT');
    expect(df.fechaAudiometria).toBeUndefined();
  });

  it('por sección revisada: método y fecha, recomendaciones', () => {
    const df = completarRespuestasPorDefecto({}, { pais: 'GT', hoy: '2026-11-21', visitado: (p) => p === PASO_AU.metodoFecha });
    expect(df).toMatchObject({ metodoAudiometria: 'AMA', fechaAudiometria: '2026-11-21' });
    expect(df.recomendacionesAudiometria).toBeUndefined();
    completarRespuestasPorDefecto(df, { visitado: (p) => p === PASO_AU.recomendaciones });
    expect(df.recomendacionesAudiometria).toEqual(RECOMENDACIONES_POR_DEFECTO);
  });

  it('los umbrales no tienen valor por defecto', () => {
    const df = prepararAudiometriaParaGuardar({}, { pais: 'MX' });
    expect(df.oidoDerecho125).toBeUndefined();
    expect(df.metodoAudiometria).toBe('LFT');
    // Como antes: los campos de LFT en 0 si no aplican
    expect(df).toMatchObject({ porcentajePerdidaOD: 0, porcentajePerdidaOI: 0, hipoacusiaBilateralCombinada: 0 });
  });

  it('recomendaciones vaciadas por el usuario se quedan vacías', () => {
    const df = prepararAudiometriaParaGuardar({ recomendacionesAudiometria: [] });
    expect(df.recomendacionesAudiometria).toEqual([]);
  });

  it('la interpretación se genera de los umbrales y no pisa la editada', () => {
    const df = completarRespuestasPorDefecto(umbrales(CAIDA_4K, NORMAL), { pais: 'MX' });
    const generada = generarInterpretacionAudiometrica(df);
    expect(generada).not.toBe(MENSAJE_DATOS_INSUFICIENTES);
    expect(df.interpretacionAudiometrica).toBe(generada);
    // Si cambian los umbrales y no se editó, se rehace
    df.oidoIzquierdo4000 = 60;
    completarRespuestasPorDefecto(df, { pais: 'MX' });
    expect(df.interpretacionAudiometrica).toBe(generarInterpretacionAudiometrica(df));
    // Editada: se conserva
    df.interpretacionAudiometrica = 'Texto del médico';
    df.oidoIzquierdo4000 = 15;
    completarRespuestasPorDefecto(df, { pais: 'MX' });
    expect(df.interpretacionAudiometrica).toBe('Texto del médico');
  });

  it('un documento guardado conserva su método aunque el país sea otro', () => {
    const df = completarRespuestasPorDefecto({ metodoAudiometria: 'LFT' }, { pais: 'GT' });
    expect(df.metodoAudiometria).toBe('LFT');
  });
});

describe('audiometría: umbrales faltantes', () => {
  it('un aviso por oído con sus frecuencias', () => {
    const df = umbrales(NORMAL, NORMAL);
    df.oidoDerecho3000 = null;
    df.oidoDerecho8000 = '';
    for (const f of FRECUENCIAS) delete df[`oidoIzquierdo${f}`];
    expect(problemasUmbralesAudiometria(df)).toEqual([
      {
        paso: 2,
        campo: 'oidoDerecho3000',
        nombre: 'Umbrales del oído derecho',
        falta: true,
        mensaje: 'Faltan umbrales del oído derecho: 3000, 8000 Hz.',
      },
      {
        paso: 3,
        campo: 'oidoIzquierdo125',
        nombre: 'Umbrales del oído izquierdo',
        falta: true,
        mensaje: 'Faltan los umbrales del oído izquierdo.',
      },
    ]);
    expect(problemasUmbralesAudiometria(umbrales(NORMAL, NORMAL))).toEqual([]);
  });
});
