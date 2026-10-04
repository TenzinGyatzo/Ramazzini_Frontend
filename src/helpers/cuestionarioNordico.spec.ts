import { describe, expect, it } from 'vitest';
import {
  REGIONES_NORDICO,
  PASOS_NORDICO,
  asegurarRegionesNordico,
  bandaIntensidadNordico,
  calcularResultadoCuestionarioNordico,
  detalleRegionNordicoCompleto,
  limpiarDetalleRegionNordico,
  nivelesRegionNordico,
  regionesNordicoDelPaso,
  textoAntiguedadActividadNordico,
  textoRelacionTrabajoNordico,
  textoResumenCuestionarioNordico,
} from './cuestionarioNordico';
import { validarCamposRequeridos } from './validacionCampos';

// Los casos del resultado son los mismos que en `cuestionario-nordico-resultado.util.spec.ts` (backend).
describe('calcularResultadoCuestionarioNordico', () => {
  it('sin regiones o todo negado da semáforo verde y puntuación 0', () => {
    for (const regiones of [undefined, null, {}, { cuello: { molestia12Meses: 'No' }, espaldaBaja: null }]) {
      const resultado = calcularResultadoCuestionarioNordico(regiones);
      expect(resultado.semaforo).toBe('verde');
      expect(resultado.regionesMolestia12Meses).toEqual([]);
      expect(resultado.puntuacionTotal).toBe(0);
    }
  });

  it('molestia leve en 12 meses, sin 7 días ni impedimento, da amarillo', () => {
    const resultado = calcularResultadoCuestionarioNordico({
      cuello: { molestia12Meses: 'Sí', molestia7Dias: 'No', intensidad: 3, diasImpedimento: '0 días' },
    });
    expect(resultado.semaforo).toBe('amarillo');
    expect(resultado.regionesPrioritarias).toEqual([]);
    expect(resultado.puntuacionTotal).toBe(1);
  });

  it.each([
    ['molestia en 7 días', { molestia7Dias: 'Sí', intensidad: 2 }],
    ['impedimento para trabajar', { diasImpedimento: '1-7 días' }],
    ['intensidad de 7 o más', { intensidad: 7 }],
  ])('%s da rojo', (_caso, detalle) => {
    const resultado = calcularResultadoCuestionarioNordico({
      espaldaBaja: { molestia12Meses: 'Sí', ...detalle },
    });
    expect(resultado.semaforo).toBe('rojo');
    expect(resultado.regionesPrioritarias).toEqual(['espaldaBaja']);
  });

  it('la relación laboral no cambia el semáforo; se reporta aparte', () => {
    const resultado = calcularResultadoCuestionarioNordico({
      hombroDerecho: {
        molestia12Meses: 'Sí',
        molestia7Dias: 'No',
        intensidad: 2,
        diasImpedimento: '0 días',
        relacionTrabajo: 'Principalmente',
      },
    });
    expect(resultado.semaforo).toBe('amarillo');
    expect(resultado.regionesRelacionLaboral).toEqual(['hombroDerecho']);
  });

  it('ignora el detalle de una región contestada «No»', () => {
    const resultado = calcularResultadoCuestionarioNordico({
      cuello: { molestia12Meses: 'No', molestia7Dias: 'Sí', intensidad: 10, diasImpedimento: 'Más de 30 días' },
    });
    expect(resultado.semaforo).toBe('verde');
    expect(resultado.intensidadMaxima).toBe(0);
  });

  it('puntúa 0–4 por región original y toma el lado más afectado', () => {
    const resultado = calcularResultadoCuestionarioNordico({
      hombroIzquierdo: { molestia12Meses: 'Sí' },
      hombroDerecho: { molestia12Meses: 'Sí', molestia7Dias: 'Sí', diasImpedimento: '8-30 días' },
      cadera: { molestia12Meses: 'Sí', diasImpedimento: '1-7 días' },
      musloIzquierdo: { molestia12Meses: 'Sí', molestia7Dias: 'Sí' },
      cuello: { molestia12Meses: 'Sí', molestia7Dias: 'Sí' },
    });
    expect(resultado.puntuacionTotal).toBe(4 + 3 + 2);
  });

  it('las 16 regiones al máximo suman 36', () => {
    const maximo = { molestia12Meses: 'Sí', molestia7Dias: 'Sí', diasImpedimento: 'Más de 30 días', intensidad: 10 };
    const regiones = Object.fromEntries(REGIONES_NORDICO.map(({ clave }) => [clave, maximo]));
    const resultado = calcularResultadoCuestionarioNordico(regiones);
    expect(resultado.puntuacionTotal).toBe(36);
    expect(resultado.regionesMolestia12Meses).toHaveLength(16);
  });
});

describe('regiones y pasos', () => {
  it('son 16 regiones numeradas del 1 al 16 y todas caen en un paso de regiones', () => {
    expect(REGIONES_NORDICO.map((region) => region.numero)).toEqual(
      Array.from({ length: 16 }, (_, i) => i + 1),
    );
    const enPasos = PASOS_NORDICO.flatMap(({ paso }) => regionesNordicoDelPaso(paso));
    expect(enPasos).toHaveLength(16);
    expect(regionesNordicoDelPaso(1)).toEqual([]);
    expect(regionesNordicoDelPaso(6)).toEqual([]);
  });

  it('colorea cada región según el resultado', () => {
    const niveles = nivelesRegionNordico({
      regionesMolestia12Meses: ['cuello', 'espaldaBaja'],
      regionesPrioritarias: ['espaldaBaja'],
    });
    expect(niveles).toEqual({ cuello: 'molestia', espaldaBaja: 'prioritaria' });
  });
});

describe('captura', () => {
  it('asegura las 16 regiones sin perder lo ya capturado', () => {
    const datos: { regiones?: Record<string, unknown> } = { regiones: { cuello: { molestia12Meses: 'Sí' } } };
    const regiones = asegurarRegionesNordico(datos);
    expect(Object.keys(regiones)).toHaveLength(16);
    expect(regiones.cuello.molestia12Meses).toBe('Sí');
    expect(regiones.tobilloDerecho).toEqual({});
  });

  it('al limpiar el detalle conserva solo la respuesta de 12 meses', () => {
    const region = {
      molestia12Meses: 'No',
      tiempoMolestia12Meses: '1-7 días',
      molestia7Dias: 'Sí',
      intensidad: 4,
      diasImpedimento: '0 días',
      atencionProfesional: 'No',
      relacionTrabajo: 'Parcialmente',
      actividades: ['Otro'],
      actividadOtra: 'x',
    };
    limpiarDetalleRegionNordico(region);
    expect(region).toEqual({ molestia12Meses: 'No' });
  });

  it('el detalle está completo solo con las seis respuestas', () => {
    expect(detalleRegionNordicoCompleto({ molestia12Meses: 'No' })).toBe(true);
    expect(detalleRegionNordicoCompleto({ molestia12Meses: 'Sí' })).toBe(false);
    expect(
      detalleRegionNordicoCompleto({
        molestia12Meses: 'Sí',
        tiempoMolestia12Meses: '1-7 días',
        molestia7Dias: 'No',
        intensidad: 0,
        diasImpedimento: '0 días',
        atencionProfesional: 'No',
        relacionTrabajo: 'No relacionada',
      }),
    ).toBe(true);
  });
});

describe('textos', () => {
  it.each([
    [0, 'Sin molestia'],
    [3, 'Leve'],
    [4, 'Moderada'],
    [6, 'Moderada'],
    [7, 'Intensa'],
    [10, 'Intensa'],
  ])('intensidad %i → %s', (intensidad, banda) => {
    expect(bandaIntensidadNordico(intensidad)).toBe(banda);
  });

  it('describe la antigüedad en la actividad', () => {
    expect(textoAntiguedadActividadNordico(undefined, undefined)).toBe('No registrada');
    expect(textoAntiguedadActividadNordico(4, 6)).toBe('4 años 6 meses');
    expect(textoAntiguedadActividadNordico(1, 1)).toBe('1 año 1 mes');
    expect(textoAntiguedadActividadNordico(0, 0)).toBe('Menos de 1 mes');
  });

  it('describe la relación con el trabajo y sus actividades', () => {
    expect(textoRelacionTrabajoNordico({ relacionTrabajo: 'No relacionada', actividades: ['Otro'] })).toBe(
      'No relacionada',
    );
    expect(
      textoRelacionTrabajoNordico({
        relacionTrabajo: 'Parcialmente',
        actividades: ['Posturas forzadas', 'Otro'],
        actividadOtra: 'Conducir',
      }),
    ).toBe('Parcialmente: Posturas forzadas, Otro (Conducir)');
  });
});

describe('validación antes de guardar', () => {
  const todoNegado = Object.fromEntries(
    REGIONES_NORDICO.map(({ clave }) => [clave, { molestia12Meses: 'No' }]),
  );

  it('acepta un cuestionario con fecha y las 16 regiones contestadas', () => {
    const validacion = validarCamposRequeridos('cuestionarioNordico', {
      fechaCuestionarioNordico: '2026-10-03',
      regiones: todoNegado,
    });
    expect(validacion.esValido).toBe(true);
  });

  it('señala la región sin contestar y la que tiene el detalle incompleto, con su paso', () => {
    const regiones: Record<string, unknown> = {
      ...todoNegado,
      espaldaBaja: { molestia12Meses: 'Sí', molestia7Dias: 'Sí' },
    };
    delete regiones.rodillaDerecha;

    const validacion = validarCamposRequeridos('cuestionarioNordico', {
      fechaCuestionarioNordico: '2026-10-03',
      regiones,
    });

    expect(validacion.esValido).toBe(false);
    expect(validacion.camposFaltantes).toEqual([
      expect.objectContaining({ nombre: 'Espalda baja (lumbar): detalle de la molestia', paso: 4 }),
      expect.objectContaining({ nombre: 'Rodilla derecha: molestia en los últimos 12 meses', paso: 5 }),
    ]);
  });
});

// Mismos textos que `resumenTablaCuestionarioNordico` (backend): la aptitud en pantalla y en PDF deben coincidir.
describe('resumen para la aptitud al puesto', () => {
  it('sin resultado guardado no genera texto', () => {
    expect(textoResumenCuestionarioNordico(null)).toBe('');
    expect(textoResumenCuestionarioNordico({})).toBe('');
  });

  it('todo negado', () => {
    expect(textoResumenCuestionarioNordico({ resultado: calcularResultadoCuestionarioNordico({}) })).toBe(
      'Sin molestias musculoesqueléticas en los últimos 12 meses',
    );
  });

  it('lista regiones, intensidad máxima e impedimento', () => {
    const resultado = calcularResultadoCuestionarioNordico({
      cuello: { molestia12Meses: 'Sí', molestia7Dias: 'No', intensidad: 3 },
      espaldaBaja: { molestia12Meses: 'Sí', molestia7Dias: 'Sí', intensidad: 9, diasImpedimento: '1-7 días' },
    });
    expect(textoResumenCuestionarioNordico({ resultado })).toBe(
      'Molestias en 12 meses: Cuello / nuca, Espalda baja (lumbar); en los últimos 7 días: Espalda baja (lumbar); intensidad máxima 9/10; impedimento para trabajar: Espalda baja (lumbar)',
    );
  });

  it('sin molestia en 7 días ni impedimento', () => {
    const resultado = calcularResultadoCuestionarioNordico({
      rodillaDerecha: { molestia12Meses: 'Sí', molestia7Dias: 'No', intensidad: 2 },
    });
    expect(textoResumenCuestionarioNordico({ resultado })).toBe(
      'Molestias en 12 meses: Rodilla derecha; en los últimos 7 días: ninguna; intensidad máxima 2/10',
    );
  });
});
