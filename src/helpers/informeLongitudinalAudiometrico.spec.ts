import { describe, expect, it } from 'vitest';
import {
  calcularDeltaDb,
  clasificarMagnitudDeltaIla,
  construirBorradorInterpretacionIla,
  construirBorradorInterpretacionOidoIla,
  construirMatrizDeltasIla,
  filasMatrizPorOidoIla,
  audiometriasDesdeDocumentsByYear,
  construirResumenCronologicoIla,
  derivarCamposInformeLongitudinalAudiometrico,
  esAudiometriaAnulada,
  etiquetaResultadoResumenIla,
  formatearDeltaConSigno,
  refrescarAudiometriasConcentradasEnInforme,
  snapshotAudiometriaConcentradaIla,
} from './informeLongitudinalAudiometrico';
import type { AudiometriaConcentradaLongitudinal } from '@/interfaces/documentos.inteface';

function estudio(
  parcial: Partial<Omit<AudiometriaConcentradaLongitudinal, 'fechaAudiometria'>> & {
    fechaAudiometria?: string | Date;
  },
): AudiometriaConcentradaLongitudinal {
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
  } as AudiometriaConcentradaLongitudinal;
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

  it('ordena el resumen de más antigua a más reciente aunque las fechas vengan mezcladas', () => {
    const basal = estudio({
      idAudiometriaOriginal: 'b',
      fechaAudiometria: new Date('2023-06-15T00:00:00.000Z'),
      rolEnInforme: 'basal',
    });
    const s2024 = estudio({
      idAudiometriaOriginal: 's24',
      fechaAudiometria: '2024-06-15',
      rolEnInforme: 'subsecuente',
    });
    const s2025 = estudio({
      idAudiometriaOriginal: 's25',
      fechaAudiometria: '2025-06-24',
      rolEnInforme: 'subsecuente',
    });
    const s2026 = estudio({
      idAudiometriaOriginal: 's26',
      fechaAudiometria: new Date('2026-06-18T00:00:00.000Z'),
      rolEnInforme: 'subsecuente',
    });
    const matriz = construirMatrizDeltasIla(basal, [s2025, s2024, s2026]);
    const resumen = construirResumenCronologicoIla(basal, [s2025, s2024, s2026], matriz);
    expect(resumen.map((r) => r.idAudiometriaOriginal)).toEqual(['b', 's24', 's25', 's26']);
    expect(matriz.map((f) => f.idAudiometriaOriginal)).toEqual([
      's24', 's24', 's25', 's25', 's26', 's26',
    ]);
    expect(filasMatrizPorOidoIla(matriz, 'Derecho').map((f) => f.idAudiometriaOriginal)).toEqual([
      's24', 's25', 's26',
    ]);
    expect(filasMatrizPorOidoIla(matriz, 'Izquierdo').every((f) => f.oido === 'Izquierdo')).toBe(true);
  });
});

describe('resultado del método en el resumen', () => {
  it('reporta AMA/LFT sin etiqueta de severidad casera', () => {
    const basal = estudio({});
    const resumen = construirResumenCronologicoIla(basal, [], []);
    expect(resumen[0].resultadoOD).toBe('PA 0 %');
    expect(resumen[0].resultadoOD).not.toMatch(/Normal|Leve|Moderada|Grave|Profunda/);
  });

  it('muestra HBC para LFT y PA para AMA', () => {
    expect(etiquetaResultadoResumenIla('LFT 44 %', 'LFT')).toBe('HBC 44 %');
    expect(etiquetaResultadoResumenIla('PA 44 %', 'LFT')).toBe('HBC 44 %');
    expect(etiquetaResultadoResumenIla('AMA 0 %', 'AMA')).toBe('PA 0 %');
  });
});

describe('esAudiometriaAnulada', () => {
  it('detecta estado anulado', () => {
    expect(esAudiometriaAnulada({ estado: 'anulado' })).toBe(true);
    expect(esAudiometriaAnulada({ estado: 'finalizado' })).toBe(false);
    expect(esAudiometriaAnulada({ estado: 'borrador' })).toBe(false);
  });
});

describe('audiometriasDesdeDocumentsByYear', () => {
  it('omite audiometrías anuladas y conserva borrador y finalizado', () => {
    const list = audiometriasDesdeDocumentsByYear({
      2024: {
        audiometrias: [
          { _id: 'a', estado: 'borrador', idTrabajador: 't1' },
          { _id: 'b', estado: 'finalizado', idTrabajador: 't1' },
          { _id: 'c', estado: 'anulado', idTrabajador: 't1' },
        ],
      },
    }, 't1');
    expect(list.map((a) => String(a._id))).toEqual(['a', 'b']);
  });
});

describe('borrador de interpretación', () => {
  it('describe incrementos de umbral sin frase de causalidad', () => {
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
    expect(texto).not.toMatch(/atribuye causalidad/i);
  });

  it('genera un borrador independiente por oído', () => {
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
    const derecho = construirBorradorInterpretacionOidoIla(basal, matriz, 'Derecho');
    const izquierdo = construirBorradorInterpretacionOidoIla(basal, matriz, 'Izquierdo');
    expect(derecho).toContain('oído derecho');
    expect(derecho).toContain('no se observan incrementos');
    expect(derecho).not.toContain('4000 Hz');
    expect(izquierdo).toContain('oído izquierdo');
    expect(izquierdo).toContain('4000 Hz');
    expect(izquierdo).not.toContain('oído derecho');
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
    const form: Parameters<typeof refrescarAudiometriasConcentradasEnInforme>[0] = {
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
