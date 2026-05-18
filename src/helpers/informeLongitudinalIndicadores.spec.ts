import { describe, expect, it } from 'vitest';
import type { EventoConcentradoCardiometabolicoEsc } from '@/interfaces/documentos.inteface';
import {
  calcularEstadisticaEje,
  clasificarTendenciaPorUmbral,
  derivarResumenIndicadoresCompleto,
  formatearCambioIndicadorConSigno,
  proyectarResumenIndicadoresParaPersistencia,
  type EjeUmbralTendenciaIlc,
} from './informeLongitudinalIndicadores';

function ev(
  fecha: string,
  lab?: EventoConcentradoCardiometabolicoEsc['laboratorio'],
  signos?: EventoConcentradoCardiometabolicoEsc['signosVitales'],
  somato?: EventoConcentradoCardiometabolicoEsc['somatometria'],
): EventoConcentradoCardiometabolicoEsc {
  return { fechaControl: fecha, laboratorio: lab, signosVitales: signos, somatometria: somato };
}

function tendenciaDosVisitas(eje: EjeUmbralTendenciaIlc, v1: number, v2: number) {
  return calcularEstadisticaEje([{ v: v1 }, { v: v2 }], { eje })?.tendencia;
}

describe('formatearCambioIndicadorConSigno', () => {
  it('usa + y − explícitos con magnitud positiva', () => {
    expect(formatearCambioIndicadorConSigno(2)).toBe(' (+2)');
    expect(formatearCambioIndicadorConSigno(-0.2)).toBe(' (-0.2)');
    expect(formatearCambioIndicadorConSigno(0)).toBe(' (0)');
  });
});

describe('clasificarTendenciaPorUmbral', () => {
  it('peso 108 → 107.8 = Estable; 108 → 106.5 = Mejoría', () => {
    expect(clasificarTendenciaPorUmbral(108, 107.8, 1)).toBe('Estable');
    expect(clasificarTendenciaPorUmbral(108, 106.5, 1)).toBe('Mejoría');
  });

  it('TA sistólica y diastólica', () => {
    expect(clasificarTendenciaPorUmbral(156, 154, 5)).toBe('Estable');
    expect(clasificarTendenciaPorUmbral(156, 148, 5)).toBe('Mejoría');
    expect(clasificarTendenciaPorUmbral(92, 90, 3)).toBe('Estable');
  });

  it('glucosa y HbA1c', () => {
    expect(clasificarTendenciaPorUmbral(242, 235, 10)).toBe('Estable');
    expect(clasificarTendenciaPorUmbral(242, 214, 10)).toBe('Mejoría');
    expect(clasificarTendenciaPorUmbral(9.8, 9.6, 0.3)).toBe('Estable');
    expect(clasificarTendenciaPorUmbral(9.8, 9.2, 0.3)).toBe('Mejoría');
  });

  it('IMC', () => {
    expect(clasificarTendenciaPorUmbral(35.27, 35.1, 0.5)).toBe('Estable');
    expect(clasificarTendenciaPorUmbral(35.27, 34.6, 0.5)).toBe('Mejoría');
  });
});

describe('calcularEstadisticaEje con umbral por eje', () => {
  it('integra umbrales vía opts.eje', () => {
    expect(tendenciaDosVisitas('peso', 108, 107.8)).toBe('Estable');
    expect(tendenciaDosVisitas('tensionArterialSistolica', 156, 154)).toBe('Estable');
    expect(tendenciaDosVisitas('glucosaMgDl', 242, 214)).toBe('Mejoría');
  });

  it('calcula peorValor y Mejoría en serie larga con umbral glucosa', () => {
    const s = calcularEstadisticaEje([{ v: 200 }, { v: 400 }, { v: 110 }], { eje: 'glucosaMgDl' });
    expect(s?.peorValor).toBe(400);
    expect(s?.valorInicial).toBe(200);
    expect(s?.valorFinal).toBe(110);
    expect(s?.tendencia).toBe('Mejoría');
    expect(s?.tieneDatosSuficientes).toBe(true);
  });

  it('una sola medición → tendencia undefined', () => {
    expect(calcularEstadisticaEje([{ v: 100 }], { eje: 'peso' })?.tendencia).toBeUndefined();
  });
});

describe('derivarResumenIndicadoresCompleto', () => {
  it('peor LDL en visita intermedia', () => {
    const enr = derivarResumenIndicadoresCompleto([
      ev('2025-01-01', { ldlMgDl: 100 }),
      ev('2025-03-01', { ldlMgDl: 210 }),
      ev('2025-06-01', { ldlMgDl: 130 }),
    ]);
    expect(enr?.ldlMgDl?.peorValor).toBe(210);
    expect(enr?.ldlMgDl?.numeroMediciones).toBe(3);
  });

  it('micro-cambio peso en derivación completa = Estable', () => {
    const enr = derivarResumenIndicadoresCompleto([
      ev('2025-01-01', undefined, undefined, { peso: 108 }),
      ev('2025-06-01', undefined, undefined, { peso: 107.8 }),
    ]);
    expect(enr?.peso?.tendencia).toBe('Estable');
    const slim = proyectarResumenIndicadoresParaPersistencia(enr);
    expect(slim?.peso?.tendencia).toBe('Estable');
  });

  it('proyección slim no incluye lípidos', () => {
    const enr = derivarResumenIndicadoresCompleto([
      ev('2025-01-01', { glucosaMgDl: 200, ldlMgDl: 180 }),
      ev('2025-06-01', { glucosaMgDl: 140, ldlMgDl: 160 }),
    ]);
    const slim = proyectarResumenIndicadoresParaPersistencia(enr);
    expect(slim?.glucosaMgDl?.valorInicial).toBe(200);
    expect(slim?.ldlMgDl).toBeUndefined();
    expect((slim?.glucosaMgDl as { peorValor?: number })?.peorValor).toBeUndefined();
  });
});
