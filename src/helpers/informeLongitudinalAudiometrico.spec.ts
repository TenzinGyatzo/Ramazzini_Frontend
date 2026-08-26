import { describe, expect, it } from 'vitest';
import {
  calcularDeltaDb,
  clasificarMagnitudDeltaIla,
  construirAdvertenciasIla,
  construirBorradorInterpretacionIla,
  construirMatrizDeltasIla,
  construirResumenCronologicoIla,
  derivarCamposInformeLongitudinalAudiometrico,
  etiquetaSeveridadUmbralesIla,
  formatearDeltaConSigno,
  refrescarAudiometriasConcentradasEnInforme,
  snapshotAudiometriaConcentradaIla,
} from './informeLongitudinalAudiometrico';
import type { AudiometriaConcentradaLongitudinal } from '@/interfaces/documentos.inteface';

function estudio(parcial: Partial<AudiometriaConcentradaLongitudinal>): AudiometriaConcentradaLongitudinal {
  return {
    idAudiometriaOriginal: 'a1',
    fechaAudiometria: '2023-03-15',
    metodoAudiometria: 'AMA',
    rolEnInforme: 'basal',
    oidoDerecho500: 10,
    oidoDerecho1000: 10,
    oidoDerecho2000: 15,
    oidoDerecho3000: 15,
    oidoDerecho4000: 20,
    oidoDerecho6000: 15,
    oidoDerecho8000: 10,
    oidoIzquierdo500: 10,
    oidoIzquierdo1000: 10,
    oidoIzquierdo2000: 15,
    oidoIzquierdo3000: 20,
    oidoIzquierdo4000: 25,
    oidoIzquierdo6000: 20,
    oidoIzquierdo8000: 15,
    perdidaMonauralOD_AMA: 0,
    perdidaMonauralOI_AMA: 0,
    ...parcial,
  };
}

describe('calcularDeltaDb', () => {
  it('resta umbral basal del subsecuente', () => {
    expect(calcularDeltaDb(40, 20)).toBe(20);
    expect(calcularDeltaDb(10, 15)).toBe(-5);
    expect(calcularDeltaDb(null, 10)).toBeNull();
  });
});

describe('clasificarMagnitudDeltaIla', () => {
  it('asigna color de magnitud sin criterio normativo', () => {
    expect(clasificarMagnitudDeltaIla(0)).toBe('gris');
    expect(clasificarMagnitudDeltaIla(-5)).toBe('verde');
    expect(clasificarMagnitudDeltaIla(5)).toBe('amarillo');
    expect(clasificarMagnitudDeltaIla(10)).toBe('amarillo');
    expect(clasificarMagnitudDeltaIla(15)).toBe('rojo');
    expect(clasificarMagnitudDeltaIla(null)).toBe('vacio');
  });
});

describe('formatearDeltaConSigno', () => {
  it('muestra signo en empeoramiento', () => {
    expect(formatearDeltaConSigno(20)).toBe('+20');
    expect(formatearDeltaConSigno(-5)).toBe('-5');
    expect(formatearDeltaConSigno(0)).toBe('0');
  });
});

describe('matriz y resumen', () => {
  it('calcula Δ por oído y frecuencia contra la basal', () => {
    const basal = snapshotAudiometriaConcentradaIla(
      {
        _id: 'b',
        fechaAudiometria: '2023-03-15',
        metodoAudiometria: 'AMA',
        oidoDerecho4000: 20,
        oidoIzquierdo4000: 25,
        oidoDerecho500: 10,
        oidoIzquierdo500: 10,
        oidoDerecho1000: 10,
        oidoIzquierdo1000: 10,
        oidoDerecho2000: 10,
        oidoIzquierdo2000: 10,
        oidoDerecho3000: 15,
        oidoIzquierdo3000: 20,
        oidoDerecho6000: 15,
        oidoIzquierdo6000: 20,
        oidoDerecho8000: 10,
        oidoIzquierdo8000: 15,
      },
      'basal',
    );
    const sub = snapshotAudiometriaConcentradaIla(
      {
        _id: 's',
        fechaAudiometria: '2025-03-15',
        metodoAudiometria: 'AMA',
        oidoDerecho4000: 20,
        oidoIzquierdo4000: 45,
        oidoDerecho500: 10,
        oidoIzquierdo500: 10,
        oidoDerecho1000: 10,
        oidoIzquierdo1000: 10,
        oidoDerecho2000: 10,
        oidoIzquierdo2000: 10,
        oidoDerecho3000: 15,
        oidoIzquierdo3000: 35,
        oidoDerecho6000: 15,
        oidoIzquierdo6000: 40,
        oidoDerecho8000: 10,
        oidoIzquierdo8000: 15,
        perdidaMonauralOD_AMA: 0,
        perdidaMonauralOI_AMA: 7.5,
      },
      'subsecuente',
    );
    const matriz = construirMatrizDeltasIla(basal, [sub]);
    const oi = matriz.find((f) => f.oido === 'Izquierdo');
    const d4000 = oi?.deltas.find((d) => d.frecuenciaHz === 4000);
    expect(d4000?.deltaDb).toBe(20);
    const resumen = construirResumenCronologicoIla(basal, [sub], matriz);
    expect(resumen[0].cambioRespectoBasal).toBe('Referencia');
    expect(resumen[1].cambioRespectoBasal).toContain('4000 Hz OI');
  });
});

describe('etiquetaSeveridadUmbralesIla', () => {
  it('clasifica Normal cuando el promedio es ≤20', () => {
    expect(etiquetaSeveridadUmbralesIla(estudio({}), 'Derecho')).toBe('Normal');
  });
});

describe('borrador e advertencias', () => {
  it('describe incrementos sin atribuir causalidad laboral', () => {
    const basal = estudio({});
    const sub = estudio({
      idAudiometriaOriginal: 's',
      fechaAudiometria: '2025-03-15',
      rolEnInforme: 'subsecuente',
      oidoIzquierdo3000: 35,
      oidoIzquierdo4000: 45,
      oidoIzquierdo6000: 40,
    });
    const matriz = construirMatrizDeltasIla(basal, [sub]);
    const texto = construirBorradorInterpretacionIla(basal, matriz);
    expect(texto).toContain('15/03/2023');
    expect(texto).toContain('4000 Hz');
    expect(texto).not.toMatch(/deterioro por ruido/i);
    expect(texto).toContain('no atribuye causalidad');
  });

  it('advierte mezcla AMA/LFT y estudio anterior a la basal', () => {
    const ads = construirAdvertenciasIla({
      basal: estudio({ metodoAudiometria: 'AMA', fechaAudiometria: '2024-01-01' }),
      subsecuentes: [
        estudio({
          idAudiometriaOriginal: 's',
          metodoAudiometria: 'LFT',
          fechaAudiometria: '2023-01-01',
          rolEnInforme: 'subsecuente',
        }),
      ],
    });
    expect(ads.some((a) => a.includes('AMA y LFT'))).toBe(true);
    expect(ads.some((a) => a.includes('anterior a la basal'))).toBe(true);
    expect(ads.some((a) => a.includes('calibración'))).toBe(true);
  });
});

describe('derivarCamposInformeLongitudinalAudiometrico', () => {
  it('congela basal, subsecuentes y criterio v1', () => {
    const out = derivarCamposInformeLongitudinalAudiometrico({
      basalFuente: {
        _id: 'b',
        fechaAudiometria: '2023-03-15',
        metodoAudiometria: 'AMA',
        oidoDerecho500: 10,
        oidoIzquierdo500: 10,
      },
      subsecuentesFuente: [
        {
          _id: 's',
          fechaAudiometria: '2024-03-15',
          metodoAudiometria: 'AMA',
          oidoDerecho500: 15,
          oidoIzquierdo500: 10,
        },
      ],
    });
    expect(out.criterioComparacion).toBe('solo_diferencias');
    expect(out.versionCriterio).toBe('v1.0-deltas');
    expect(out.numeroAudiometriasIncluidas).toBe(2);
    expect(out.audiometriaBasalConcentrada?.rolEnInforme).toBe('basal');
  });
});

describe('refrescarAudiometriasConcentradasEnInforme', () => {
  it('recalcula Δ desde audiometrías vivas del expediente', () => {
    const form = {
      idAudiometriaBasal: 'b',
      audiometriasSubsecuentesIncluidas: ['s'],
      antecedenteExposicionRuido: { textoLibre: 'nota' },
    };
    const ok = refrescarAudiometriasConcentradasEnInforme(
      form,
      [
        {
          _id: 'b',
          fechaAudiometria: '2023-03-15',
          metodoAudiometria: 'AMA',
          oidoDerecho4000: 20,
          oidoIzquierdo4000: 20,
          oidoDerecho500: 10,
          oidoIzquierdo500: 10,
          oidoDerecho1000: 10,
          oidoIzquierdo1000: 10,
          oidoDerecho2000: 10,
          oidoIzquierdo2000: 10,
          oidoDerecho3000: 10,
          oidoIzquierdo3000: 10,
          oidoDerecho6000: 10,
          oidoIzquierdo6000: 10,
          oidoDerecho8000: 10,
          oidoIzquierdo8000: 10,
        },
        {
          _id: 's',
          fechaAudiometria: '2024-03-15',
          metodoAudiometria: 'AMA',
          oidoDerecho4000: 35,
          oidoIzquierdo4000: 20,
          oidoDerecho500: 10,
          oidoIzquierdo500: 10,
          oidoDerecho1000: 10,
          oidoIzquierdo1000: 10,
          oidoDerecho2000: 10,
          oidoIzquierdo2000: 10,
          oidoDerecho3000: 10,
          oidoIzquierdo3000: 10,
          oidoDerecho6000: 10,
          oidoIzquierdo6000: 10,
          oidoDerecho8000: 10,
          oidoIzquierdo8000: 10,
        },
      ],
    );
    expect(ok).toBe(true);
    const filaOd = form.matrizDeltas?.find((f) => f.oido === 'Derecho');
    expect(filaOd?.deltas.find((d) => d.frecuenciaHz === 4000)?.deltaDb).toBe(15);
    expect(form.antecedenteExposicionRuido?.textoLibre).toBe('nota');
  });
});
