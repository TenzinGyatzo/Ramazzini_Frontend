import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  aplicarBorradorEnInterpretacionSiNoEditada,
  CAMBIO_UMBRAL_ILA,
  calcularDeltaDb,
  clasificarCambioUmbralOidoIla,
  clasificarMagnitudDeltaIla,
  construirBorradorInterpretacionIla,
  construirBorradorInterpretacionOidoIla,
  construirMatrizDeltasIla,
  esFechaMaximaDelRango,
  esPosteriorABasal,
  etiquetaTrayectoriaFrecuenciaIla,
  fechaAudiometriaIla,
  fechaMaximaAudiometriasIla,
  idAudiometriaMasRecientePosteriorABasal,
  filasMatrizPorOidoIla,
  audiometriasDesdeDocumentsByYear,
  construirResumenCronologicoIla,
  derivarCamposInformeLongitudinalAudiometrico,
  esAudiometriaAnulada,
  etiquetaResultadoResumenIla,
  formatearDeltaConSigno,
  interpretarOidoIla,
  MAX_CHARS_INTERPRETACION_OIDO_ILA,
  MAX_CHARS_TEXTAREA_INTERPRETACION_OIDO_ILA,
  otraSubsecuenteComparteFechaIla,
  refrescarAudiometriasConcentradasEnInforme,
  snapshotAudiometriaConcentradaIla,
  TEXTO_BORRADOR_ILA_SIN_BASAL,
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

describe('cronología basal vs subsecuente', () => {
  const rango = [
    { fechaAudiometria: '2022-06-15' },
    { fechaAudiometria: '2024-06-15' },
    { fechaAudiometria: '2026-06-18' },
  ];

  it('normaliza la fecha de audiometría a YYYY-MM-DD', () => {
    expect(fechaAudiometriaIla('2026-06-18')).toBe('2026-06-18');
    expect(fechaAudiometriaIla(new Date('2026-06-18T12:00:00.000Z'))).toBe('2026-06-18');
  });

  it('identifica la fecha máxima del rango', () => {
    expect(fechaMaximaAudiometriasIla(rango)).toBe('2026-06-18');
    expect(esFechaMaximaDelRango('2026-06-18', rango)).toBe(true);
    expect(esFechaMaximaDelRango('2024-06-15', rango)).toBe(false);
  });

  it('exige fecha estrictamente posterior a la basal', () => {
    expect(esPosteriorABasal('2025-06-24', '2024-06-15')).toBe(true);
    expect(esPosteriorABasal('2024-06-15', '2024-06-15')).toBe(false);
    expect(esPosteriorABasal('2023-06-15', '2024-06-15')).toBe(false);
    expect(esPosteriorABasal('2025-06-24', '')).toBe(false);
  });

  it('trata empate en la fecha máxima como no válida para basal', () => {
    const empate = [
      { fechaAudiometria: '2024-06-15' },
      { fechaAudiometria: '2026-06-18' },
      { fechaAudiometria: '2026-06-18' },
    ];
    expect(esFechaMaximaDelRango('2026-06-18', empate)).toBe(true);
    expect(esFechaMaximaDelRango('2024-06-15', empate)).toBe(false);
    expect(esPosteriorABasal('2026-06-18', '2026-06-18')).toBe(false);
  });

  it('elige la más reciente estrictamente posterior a la basal', () => {
    const items = [
      { _id: 'a', fechaAudiometria: '2022-06-15' },
      { _id: 'b', fechaAudiometria: '2024-06-15' },
      { _id: 'c', fechaAudiometria: '2026-06-18' },
    ];
    expect(idAudiometriaMasRecientePosteriorABasal(items, '2024-06-15', 'b')).toBe('c');
    expect(idAudiometriaMasRecientePosteriorABasal(items, '2022-06-15', 'a')).toBe('c');
    expect(idAudiometriaMasRecientePosteriorABasal(items, '2026-06-18', 'c')).toBe('');
  });

  it('en empate de fecha máxima elige un solo estudio', () => {
    const items = [
      { _id: 'x', fechaAudiometria: '2024-06-15' },
      { _id: 'm1', fechaAudiometria: '2026-06-18' },
      { _id: 'm2', fechaAudiometria: '2026-06-18' },
    ];
    expect(idAudiometriaMasRecientePosteriorABasal(items, '2024-06-15', 'x')).toBe('m2');
  });
});

describe('clasificarCambioUmbralOidoIla', () => {
  it('clasifica empeoramiento, estable y mejoría aparente por oído', () => {
    const basal = estudio({});
    const sub = estudio({
      idAudiometriaOriginal: 's',
      fechaAudiometria: '2025-03-15',
      rolEnInforme: 'subsecuente',
      oidoDerecho4000: 35,
      oidoIzquierdo4000: 15,
    });
    const matriz = construirMatrizDeltasIla(basal, [sub]);
    expect(clasificarCambioUmbralOidoIla(matriz, 'Derecho')).toBe(CAMBIO_UMBRAL_ILA.EMPEORAMIENTO);
    expect(clasificarCambioUmbralOidoIla(matriz, 'Izquierdo')).toBe(CAMBIO_UMBRAL_ILA.MEJORIA_APARENTE);
    expect(clasificarCambioUmbralOidoIla([], 'Derecho')).toBe('');
  });

  it('trata incrementos menores a 5 dB como estables', () => {
    const basal = estudio({});
    const sub = estudio({
      idAudiometriaOriginal: 's',
      fechaAudiometria: '2025-03-15',
      rolEnInforme: 'subsecuente',
      oidoDerecho4000: 23,
    });
    const matriz = construirMatrizDeltasIla(basal, [sub]);
    expect(clasificarCambioUmbralOidoIla(matriz, 'Derecho')).toBe(CAMBIO_UMBRAL_ILA.ESTABLE);
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
    expect(texto).toMatch(/4000/);
    expect(texto).toContain('cambios de umbral tonal');
    expect(texto).not.toMatch(/Δ/);
    expect(texto).not.toMatch(/umbral subsecuente/);
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
    expect(derecho).toContain('no se observan cambios de umbral');
    expect(derecho).not.toContain('4000 Hz');
    expect(izquierdo).toContain('oído izquierdo');
    expect(izquierdo).toMatch(/4000/);
    expect(izquierdo).not.toContain('oído derecho');
  });
});

describe('aplicarBorradorEnInterpretacionSiNoEditada', () => {
  it('precarga el textarea cuando está vacío', () => {
    expect(aplicarBorradorEnInterpretacionSiNoEditada('', undefined, 'Borrador A')).toBe('Borrador A');
  });

  it('actualiza el texto si seguía siendo el borrador anterior', () => {
    expect(aplicarBorradorEnInterpretacionSiNoEditada('Borrador A', 'Borrador A', 'Borrador B')).toBe(
      'Borrador B',
    );
  });

  it('conserva la edición del médico', () => {
    expect(
      aplicarBorradorEnInterpretacionSiNoEditada('Texto revisado', 'Borrador A', 'Borrador B'),
    ).toBe('Texto revisado');
  });

  it('no escribe el placeholder de ausencia de basal', () => {
    expect(aplicarBorradorEnInterpretacionSiNoEditada('', undefined, TEXTO_BORRADOR_ILA_SIN_BASAL)).toBe(
      '',
    );
  });

  it('conserva el textarea vacío si el médico borró un borrador aplicable', () => {
    expect(aplicarBorradorEnInterpretacionSiNoEditada('', 'Borrador A', 'Borrador B')).toBe('');
  });

  it('precarga solo cuando el vacío no es intencional', () => {
    expect(aplicarBorradorEnInterpretacionSiNoEditada('', undefined, 'Borrador A')).toBe('Borrador A');
    expect(aplicarBorradorEnInterpretacionSiNoEditada('', '', 'Borrador A')).toBe('Borrador A');
  });

  it('vacía el campo si se quita la basal y el texto no se había editado', () => {
    expect(
      aplicarBorradorEnInterpretacionSiNoEditada('Borrador A', 'Borrador A', TEXTO_BORRADOR_ILA_SIN_BASAL),
    ).toBe('');
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
    expect(out.versionCriterio).toBe('v1.1-reciente-trayectoria');
    expect(out.numeroAudiometriasIncluidas).toBe(2);
    expect(out.audiometriaBasalConcentrada?.rolEnInforme).toBe('basal');
    expect(out.cambioUmbralOidoDerecho).toBe(CAMBIO_UMBRAL_ILA.EMPEORAMIENTO);
    expect(out.cambioUmbralOidoIzquierdo).toBe(CAMBIO_UMBRAL_ILA.ESTABLE);
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
    expect(form.cambioUmbralOidoDerecho).toBe(CAMBIO_UMBRAL_ILA.EMPEORAMIENTO);
    expect(form.cambioUmbralOidoIzquierdo).toBe(CAMBIO_UMBRAL_ILA.ESTABLE);
  });
});

const FRECS_ILA = [500, 1000, 2000, 3000, 4000, 6000, 8000] as const;

function contarPalabrasIla(cadena: string): number {
  return cadena.trim().split(/\s+/).filter(Boolean).length;
}

type CasoDoradoIla = {
  id: string;
  estadoEsperado: string;
  trayectoriaEsperada: string;
  frecuenciasEstado: number[];
  frecuenciasTrayectoria: number[];
  charsEsperados: number;
  palabrasEsperadas: number;
  textoEsperado: string;
  estudios: Array<{
    id: string;
    rol: 'basal' | 'subsecuente';
    fechaAudiometria: string;
    umbrales: Record<string, number | null>;
  }>;
};

const casosIla = JSON.parse(
  readFileSync(
    path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../shared/ila-interpretacion.casos.json'),
    'utf8',
  ),
) as { oido: 'Izquierdo'; maxChars: number; casos: CasoDoradoIla[] };

function concentradoDesdeCaso(
  est: CasoDoradoIla['estudios'][number],
): AudiometriaConcentradaLongitudinal {
  const fuente: Record<string, unknown> = {
    _id: est.id,
    fechaAudiometria: est.fechaAudiometria,
    metodoAudiometria: 'AMA',
  };
  for (const freq of FRECS_ILA) {
    fuente[`oidoIzquierdo${freq}`] = est.umbrales[String(freq)];
    fuente[`oidoDerecho${freq}`] = 10;
  }
  return snapshotAudiometriaConcentradaIla(fuente, est.rol);
}

describe('casos dorados de interpretación ILA', () => {
  it.each(casosIla.casos.map((c) => [c.id, c]))('%s coincide con el texto medido', (_id, caso) => {
    const estudios = caso.estudios.map(concentradoDesdeCaso);
    const basal = estudios.find((e) => e.rolEnInforme === 'basal');
    const subs = estudios.filter((e) => e.rolEnInforme === 'subsecuente');
    const matriz = construirMatrizDeltasIla(basal, subs);
    const det = interpretarOidoIla(basal, matriz, 'Izquierdo');
    expect(det.texto).toBe(caso.textoEsperado);
    expect(det.texto.length).toBe(caso.charsEsperados);
    expect(contarPalabrasIla(det.texto)).toBe(caso.palabrasEsperadas);
    expect(det.texto.length).toBeLessThanOrEqual(MAX_CHARS_INTERPRETACION_OIDO_ILA);
    expect(det.estado).toBe(caso.estadoEsperado);
    expect(det.trayectoria).toBe(caso.trayectoriaEsperada);
    expect(det.frecuenciasEstado).toEqual(caso.frecuenciasEstado);
    expect(det.frecuenciasTrayectoria).toEqual(caso.frecuenciasTrayectoria);
  });

  it('conserva la incompletitud aunque la trayectoria no quepa', () => {
    const caso = casosIla.casos.find((c) => c.id === '12b-mixto-incompleto-omite-trayectoria');
    expect(caso?.textoEsperado).toContain('No fue posible comparar las frecuencias de 6000 y 8000 Hz.');
    expect(caso?.textoEsperado).not.toMatch(/progresión|fluctuación|se mantiene|disminuye/);
  });
});

describe('precedencia de trayectoria por frecuencia', () => {
  it('clasifica la serie local con la precedencia acordada', () => {
    expect(etiquetaTrayectoriaFrecuenciaIla([20, 5])).toBe('disminucion_del_cambio');
    expect(etiquetaTrayectoriaFrecuenciaIla([20, 0])).toBe('disminucion_del_cambio');
    expect(etiquetaTrayectoriaFrecuenciaIla([-20, -5])).toBe('disminucion_del_cambio');
    expect(etiquetaTrayectoriaFrecuenciaIla([-20, 0])).toBe('disminucion_del_cambio');
    expect(etiquetaTrayectoriaFrecuenciaIla([15, 15])).toBe('estable_vs_anterior');
    expect(etiquetaTrayectoriaFrecuenciaIla([10, 20])).toBe('progresion');
    expect(etiquetaTrayectoriaFrecuenciaIla([20, 5, 15])).toBe('fluctuacion');
    expect(etiquetaTrayectoriaFrecuenciaIla([20, -10])).toBe('fluctuacion');
  });
});

describe('fechas iguales en subsecuentes', () => {
  it('bloquea seleccionar otra audiometría con la misma fecha', () => {
    const seleccionadas = [{ _id: 'a', fechaAudiometria: '2024-06-15' }];
    expect(otraSubsecuenteComparteFechaIla('2024-06-15', 'b', seleccionadas)).toBe(true);
    expect(otraSubsecuenteComparteFechaIla('2024-06-16', 'b', seleccionadas)).toBe(false);
    expect(otraSubsecuenteComparteFechaIla('2024-06-15', 'a', seleccionadas)).toBe(false);
  });

  it('no inventa la más reciente si la fecha máxima está empatada y los umbrales discrepan', () => {
    const basal = concentradoDesdeCaso({
      id: 'basal',
      rol: 'basal',
      fechaAudiometria: '2022-06-15',
      umbrales: { '500': 10, '1000': 10, '2000': 10, '3000': 10, '4000': 10, '6000': 10, '8000': 10 },
    });
    const a = concentradoDesdeCaso({
      id: 'a',
      rol: 'subsecuente',
      fechaAudiometria: '2024-06-15',
      umbrales: { '500': 10, '1000': 10, '2000': 10, '3000': 10, '4000': 30, '6000': 10, '8000': 10 },
    });
    const b = concentradoDesdeCaso({
      id: 'b',
      rol: 'subsecuente',
      fechaAudiometria: '2024-06-15',
      umbrales: { '500': 10, '1000': 10, '2000': 10, '3000': 10, '4000': 15, '6000': 10, '8000': 10 },
    });
    const det = interpretarOidoIla(basal, construirMatrizDeltasIla(basal, [a, b]), 'Izquierdo');
    expect(det.texto).toContain('Hay más de una audiometría con la misma fecha');
    expect(det.estado).toBe('');
    expect(det.trayectoria).toBe('omitir');
  });
});

describe('botón usar interpretación automática', () => {
  it('el borrador vigente queda disponible para copiar si el textarea está vacío a propósito', () => {
    const actual = aplicarBorradorEnInterpretacionSiNoEditada('', 'Borrador anterior', 'Borrador vigente');
    expect(actual).toBe('');
    expect(aplicarBorradorEnInterpretacionSiNoEditada('Borrador vigente', '', 'Borrador vigente')).toBe(
      'Borrador vigente',
    );
  });
});

describe('tope del textarea de interpretación', () => {
  it('fija 585 caracteres como máximo absoluto de captura', () => {
    const referencia =
      'En comparación con la audiometría basal del 15/06/2022, se describen los cambios de umbral tonal del oído derecho. Se observa incremento de umbral en las siete frecuencias comparables; el mayor cambio es de 60 dB en 4000 Hz. La serie muestra progresión del cambio. Lorem Ipsum dolor sit amet. Lorem Ipsum dolor sit amet. Lorem Ipsum dolor sit amet. Lorem Ipsum dolor sit amet. Lorem Ipsum dolor sit amet. Lorem Ipsum dolor sit amet. Lorem Ipsum dolor sit amet. Lorem Ipsum dolor sit amet. Lorem Ipsum dolor sit amet. Lorem Ipsum dolor sit amet. Lorem Ipsum dolor sit amet. Lorem Ipsum.';
    expect(referencia.length).toBe(585);
    expect(MAX_CHARS_TEXTAREA_INTERPRETACION_OIDO_ILA).toBe(585);
    expect(MAX_CHARS_TEXTAREA_INTERPRETACION_OIDO_ILA).toBeGreaterThan(MAX_CHARS_INTERPRETACION_OIDO_ILA);
  });
});
