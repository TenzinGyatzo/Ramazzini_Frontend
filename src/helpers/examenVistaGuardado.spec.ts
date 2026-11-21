import { describe, expect, it } from 'vitest';
import {
  INTERPRETACION_LENTES_CONTACTO,
  completarRespuestasPorDefecto,
  interpretarAgudeza,
  interpretarIshihara,
  prepararExamenVistaParaGuardar,
  requiereLentes,
} from './examenVistaGuardado';
import { getEvSecciones, pasoExamenVistaEnAsistente, PASO_EV } from './examenVistaSections';

describe('examen de la vista: secciones (punto 43)', () => {
  it('general 4 secciones, Guatemala 8', () => {
    expect(getEvSecciones(false).map((s) => s.nombre)).toEqual([
      'Fecha',
      'Agudeza sin corrección',
      'Agudeza con corrección',
      'Ishihara',
    ]);
    expect(getEvSecciones(true)).toHaveLength(8);
  });

  it('paso canónico → lugar en el asistente, con y sin secciones', () => {
    expect(pasoExamenVistaEnAsistente(PASO_EV.evAvCercanaSin, false, true)).toBe(2);
    expect(pasoExamenVistaEnAsistente(PASO_EV.evAvCercanaSin, true, true)).toBe(3);
    expect(pasoExamenVistaEnAsistente(PASO_EV.evIshihara, false, false)).toBe(6);
    expect(pasoExamenVistaEnAsistente(PASO_EV.evIshihara, true, false)).toBe(9);
    // Pasos de Guatemala no existen en general
    expect(pasoExamenVistaEnAsistente(PASO_EV.evReceta, false, true)).toBe(0);
  });
});

describe('examen de la vista: reglas', () => {
  it('interpretación: el peor ojo, un solo ojo o ceguera', () => {
    expect(interpretarAgudeza({ oi: 20, od: 40, ciegaOI: false, ciegaOD: false })).toBe('Visión moderadamente reducida');
    expect(interpretarAgudeza({ oi: null, od: 20, ciegaOI: true, ciegaOD: false })).toBe('OD: Visión normal');
    expect(interpretarAgudeza({ oi: null, od: null, ciegaOI: true, ciegaOD: true })).toBe('Ceguera total');
    expect(interpretarAgudeza({ oi: 20, od: 20, ciegaOI: false, ciegaOD: false }, { noEvaluable: true })).toBe(
      INTERPRETACION_LENTES_CONTACTO,
    );
  });

  it('requiere lentes según el umbral; Ishihara según el porcentaje', () => {
    expect(requiereLentes({ oi: 25, od: 20, ciegaOI: false, ciegaOD: false }, 25)).toBe('No');
    expect(requiereLentes({ oi: 30, od: 20, ciegaOI: false, ciegaOD: false }, 25)).toBe('Si');
    expect(requiereLentes({ oi: 30, od: 20, ciegaOI: true, ciegaOD: false }, 25)).toBe('No');
    expect(interpretarIshihara(14)).toEqual({ porcentaje: 100, interpretacion: 'Normal' });
    expect(interpretarIshihara(10)).toEqual({ porcentaje: 71, interpretacion: 'Daltonismo' });
  });
});

describe('examen de la vista: respuestas por defecto', () => {
  it('todo: 20/20, sus interpretaciones, sin lentes e Ishihara 14', () => {
    const df = completarRespuestasPorDefecto({}, { esGuatemala: false, hoy: '2026-11-21' });
    expect(df).toMatchObject({
      fechaExamenVista: '2026-11-21',
      ojoIzquierdoLejanaSinCorreccion: 20,
      ojoDerechoCercanaSinCorreccion: 20,
      sinCorreccionLejanaInterpretacion: 'Visión normal',
      sinCorreccionCercanaInterpretacion: 'Visión normal',
      requiereLentesUsoGeneral: 'No',
      requiereLentesParaLectura: 'No',
      ojoIzquierdoCegueraTotal: false,
      sinCorreccionNoEvaluablePorLentesContacto: false,
      placasCorrectas: 14,
      porcentajeIshihara: 100,
      interpretacionIshihara: 'Normal',
    });
    // Sin lentes: la agudeza con corrección no se llena
    expect(df.conCorreccionLejanaInterpretacion).toBeUndefined();
    expect(df.utilizaAnteojos).toBeUndefined();
  });

  it('solo lo revisado', () => {
    const df = completarRespuestasPorDefecto({}, { esGuatemala: true, visitado: (p) => p === PASO_EV.evIshihara });
    expect(df.placasCorrectas).toBe(14);
    expect(df.ojoIzquierdoLejanaSinCorreccion).toBeUndefined();
    expect(df.utilizaAnteojos).toBeUndefined();
  });

  it('Guatemala: «utiliza anteojos» Sí preselecciona la agudeza con corrección', () => {
    const df = completarRespuestasPorDefecto({ utilizaAnteojos: 'Si' }, { esGuatemala: true });
    expect(df.conCorreccionLejanaInterpretacion).toBe('Visión normal');
    expect(df.ojoDerechoCercanaConCorreccion).toBe(20);
  });

  it('lentes de contacto: sin corrección no evaluable y con corrección preseleccionada', () => {
    const df = prepararExamenVistaParaGuardar(
      { sinCorreccionNoEvaluablePorLentesContacto: true },
      { esGuatemala: false },
    );
    expect(df.ojoIzquierdoLejanaSinCorreccion).toBeNull();
    expect(df.ojoDerechoCercanaSinCorreccion).toBeNull();
    expect(df.sinCorreccionLejanaInterpretacion).toBe(INTERPRETACION_LENTES_CONTACTO);
    expect(df.sinCorreccionCercanaInterpretacion).toBe(INTERPRETACION_LENTES_CONTACTO);
    expect(df.requiereLentesUsoGeneral).toBe('Si');
    expect(df.requiereLentesParaLectura).toBe('No');
    expect(df.conCorreccionLejanaInterpretacion).toBe('Visión normal');
  });

  it('ojo ciego: sin agudeza en ninguna distancia', () => {
    const df = prepararExamenVistaParaGuardar(
      { ojoIzquierdoCegueraTotal: true, utilizaAnteojos: 'Si' },
      { esGuatemala: true },
    );
    expect(df.ojoIzquierdoLejanaSinCorreccion).toBeNull();
    expect(df.ojoIzquierdoLejanaConCorreccion).toBeUndefined();
    expect(df.ojoDerechoLejanaSinCorreccion).toBe(20);
    expect(df.sinCorreccionLejanaInterpretacion).toBe('OD: Visión normal');
  });

  it('textos de Guatemala vacíos no viajan', () => {
    const df = prepararExamenVistaParaGuardar({ antecedentes: '  ', anamnesis: ' Ardor ocular ' }, { esGuatemala: true });
    expect(df.antecedentes).toBeUndefined();
    expect(df.anamnesis).toBe('Ardor ocular');
  });

  it('no pisa lo capturado (idempotente)', () => {
    const df: Record<string, any> = { ojoIzquierdoLejanaSinCorreccion: 40, sinCorreccionLejanaInterpretacion: 'Visión moderadamente reducida' };
    completarRespuestasPorDefecto(df, { esGuatemala: false });
    const copia = { ...df };
    completarRespuestasPorDefecto(df, { esGuatemala: false });
    expect(df).toEqual(copia);
    expect(df.ojoIzquierdoLejanaSinCorreccion).toBe(40);
  });
});
