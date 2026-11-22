import { describe, expect, it } from 'vitest';
import {
  PREGUNTAS_HALLAZGOS,
  SIN_HALLAZGOS,
  completarRespuestasPorDefecto,
  prepararExploracionFisicaParaGuardar,
  problemasHallazgosExploracionFisica,
  problemasResumenExploracionFisica,
  resumenAutomaticoExploracionFisica,
} from './exploracionFisicaGuardado';

describe('exploración física: respuestas por defecto (punto 41)', () => {
  it('llena fecha, las 27 preguntas con «No» / «Sin hallazgos» y el resumen', () => {
    const df = completarRespuestasPorDefecto({}, { esMujer: true, hoy: '2026-11-21' });
    expect(df.fechaExploracionFisica).toBe('2026-11-21');
    expect(PREGUNTAS_HALLAZGOS).toHaveLength(27);
    for (const p of PREGUNTAS_HALLAZGOS) {
      expect(df[p.pregunta]).toBe('No');
      expect(df[p.campo]).toBe(SIN_HALLAZGOS);
    }
    // Punto 55: el resumen no se preselecciona
    expect(df.resumenExploracionFisicaPregunta).toBeUndefined();
    expect(df.resumenExploracionFisica).toBeUndefined();
  });

  it('solo lo revisado, y no pisa lo capturado (idempotente)', () => {
    const df: Record<string, any> = { ojosPregunta: 'Si', ojos: 'Pterigión' };
    completarRespuestasPorDefecto(df, { esMujer: false, visitado: (p) => p <= 5 });
    expect(df.craneoCara).toBe(SIN_HALLAZGOS);
    expect(df.ojos).toBe('Pterigión');
    expect(df.oidos).toBeUndefined();
    expect(df.resumenExploracionFisica).toBeUndefined();
    const copia = { ...df };
    completarRespuestasPorDefecto(df, { esMujer: false, visitado: (p) => p <= 5 });
    expect(df).toEqual(copia);
  });

  it('documento antiguo con descripción y sin pregunta: la pregunta sale de la descripción', () => {
    const df = completarRespuestasPorDefecto({ torax: 'Estertores' }, { esMujer: false });
    expect(df.toraxPregunta).toBe('Si');
    expect(df.abdomenPregunta).toBe('No');
  });

  it('el borrador del resumen junta los hallazgos; punto 55: completar no contesta la pregunta', () => {
    const df = { craneoCara: 'Cicatriz frontal', ojos: SIN_HALLAZGOS, rodillas: 'Crepitación' };
    expect(resumenAutomaticoExploracionFisica(df)).toBe('Cicatriz frontal. Crepitación.');
    const completo = completarRespuestasPorDefecto({ ...df, craneoCaraPregunta: 'Si', rodillasPregunta: 'Si' }, { esMujer: false });
    expect(completo.resumenExploracionFisicaPregunta).toBeUndefined();
    expect(completo.resumenExploracionFisica).toBeUndefined();
  });
});

describe('exploración física: lo que se guarda', () => {
  it('con «No» el resumen es el texto por defecto; mediciones con la forma de siempre', () => {
    const df = prepararExploracionFisicaParaGuardar(
      { resumenExploracionFisicaPregunta: 'No', resumenExploracionFisica: 'algo', peso: 70 },
      { esMujer: false },
    );
    expect(df.resumenExploracionFisica).toBe('Se encuentra clínicamente sano');
    expect(df.peso).toBe(70);
    expect(df.altura).toBeNull();
    expect(df.categoriaIMC).toBe('');
    expect(df.circunferenciaCinturaSeDesconoce).toBe(false);
  });

  it('punto 55: con «Sí» y resumen vacío no se genera nada; el aviso lo pide', () => {
    const df = prepararExploracionFisicaParaGuardar(
      { resumenExploracionFisicaPregunta: 'Si', resumenExploracionFisica: '', nevosPregunta: 'Si', nevos: 'Nevo dorsal' },
      { esMujer: true },
    );
    expect(df.resumenExploracionFisica).toBe('');
    expect(problemasResumenExploracionFisica(df, true)).toHaveLength(1);
  });

  it('punto 55: sin contestar se pide; con «No» o con texto, no', () => {
    expect(problemasResumenExploracionFisica({}, false)[0]).toMatchObject({
      paso: 31,
      campo: 'resumenExploracionFisica',
      mensaje: 'Indica si hay hallazgos por resumir y, si los hay, escríbelos.',
    });
    expect(problemasResumenExploracionFisica({ resumenExploracionFisicaPregunta: 'No' }, false)).toEqual([]);
    // Documento guardado (sin la pregunta): el texto basta
    expect(problemasResumenExploracionFisica({ resumenExploracionFisica: 'Nevo dorsal.' }, false)).toEqual([]);
  });
});

describe('exploración física: descripción obligatoria con «Sí»', () => {
  it('pide describir los «Sí» vacíos o con «Sin hallazgos»', () => {
    const problemas = problemasHallazgosExploracionFisica({
      ojosPregunta: 'Si',
      ojos: '',
      manosPregunta: 'Si',
      manos: SIN_HALLAZGOS,
      toraxPregunta: 'Si',
      torax: 'Estertores',
      abdomenPregunta: 'No',
      abdomen: SIN_HALLAZGOS,
    });
    expect(problemas.map((p) => [p.campo, p.paso, p.mensaje])).toEqual([
      ['ojos', 5, 'Falta describir los hallazgos de ojos.'],
      ['manos', 12, 'Falta describir los hallazgos de manos.'],
    ]);
  });

  it('todo por defecto: nada pendiente', () => {
    const df = completarRespuestasPorDefecto({}, { esMujer: false });
    expect(problemasHallazgosExploracionFisica(df)).toEqual([]);
  });
});
