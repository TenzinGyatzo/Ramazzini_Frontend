import { describe, expect, it } from 'vitest';
import {
  bloquesResumenCondicionesParaVista,
  ETIQUETA_CAMBIO_IMC,
  ETIQUETA_CAMBIO_PESO,
  ETIQUETA_DIAGNOSTICO,
  ETIQUETA_ESTADO,
  ETIQUETA_ESTADO_ACTUAL,
  ETIQUETA_EVOLUCION,
  ETIQUETA_HALLAZGO,
  TEXTO_CONDICION_NO_DOCUMENTADA,
  TEXTO_DIAGNOSTICO_NO_ACTIVO,
} from './informeLongitudinalResumenCondicionesVista';

describe('bloquesResumenCondicionesParaVista', () => {
  it('siempre devuelve las 4 condiciones', () => {
    expect(bloquesResumenCondicionesParaVista(undefined)).toHaveLength(4);
    expect(bloquesResumenCondicionesParaVista({}).map((b) => b.titulo)).toEqual([
      'Hipertensión',
      'DM2',
      'Dislipidemia',
      'Obesidad',
    ]);
  });

  it('HTA sin dx + TA normal: Diagnóstico No activo y hallazgo sin evidencia, sin evolución', () => {
    const bloques = bloquesResumenCondicionesParaVista({
      hipertension: {
        presente: false,
        codigoEstadoVigencia: 'SIN_DIAGNOSTICO_ACTIVO',
      },
    });
    const hta = bloques.find((b) => b.titulo === 'Hipertensión')!;
    expect(hta.lineas).toContainEqual({
      etiqueta: ETIQUETA_DIAGNOSTICO,
      valor: TEXTO_DIAGNOSTICO_NO_ACTIVO,
    });
    expect(hta.lineas).toContainEqual({
      etiqueta: ETIQUETA_HALLAZGO,
      valor: 'Sin evidencia relevante',
    });
    expect(hta.lineas.some((l) => l.etiqueta === ETIQUETA_EVOLUCION)).toBe(false);
    expect(hta.lineas.some((l) => l.valor === 'Sin tendencia')).toBe(false);
  });

  it('HTA sin dx + TA elevada: hallazgo compatible', () => {
    const bloques = bloquesResumenCondicionesParaVista({
      hipertension: {
        presente: false,
        codigoEstadoVigencia: 'HALLAZGO_COMPATIBLE',
      },
    });
    const hta = bloques.find((b) => b.titulo === 'Hipertensión')!;
    expect(hta.lineas).toContainEqual({
      etiqueta: ETIQUETA_HALLAZGO,
      valor: 'Hallazgo compatible',
    });
  });

  it('dislipidemia sin dx: alteración documentada', () => {
    const bloques = bloquesResumenCondicionesParaVista({
      dislipidemia: {
        presente: false,
        codigoEstadoVigencia: 'ALTERACION_DOCUMENTADA',
      },
    });
    const dis = bloques.find((b) => b.titulo === 'Dislipidemia')!;
    expect(dis.lineas).toContainEqual({
      etiqueta: ETIQUETA_HALLAZGO,
      valor: 'Alteración documentada',
    });
  });

  it('DM2 activa controlada con tendencia: estado actual y evolución reciente', () => {
    const bloques = bloquesResumenCondicionesParaVista({
      diabetes: {
        presente: true,
        estadoActual: 'CONTROLADA',
        tendencia: 'Mejoría',
      },
    });
    const dm = bloques.find((b) => b.titulo === 'DM2')!;
    expect(dm.lineas).toContainEqual({ etiqueta: ETIQUETA_ESTADO_ACTUAL, valor: 'Controlada' });
    expect(dm.lineas).toContainEqual({ etiqueta: ETIQUETA_EVOLUCION, valor: 'Mejoría' });
    expect(dm.lineas.some((l) => l.etiqueta === ETIQUETA_DIAGNOSTICO)).toBe(false);
  });

  it('DM2 activa no controlada estable: evolución reciente solo si hay tendencia', () => {
    const bloques = bloquesResumenCondicionesParaVista({
      diabetes: {
        presente: true,
        estadoActual: 'NO_CONTROLADA',
        tendencia: 'Estable',
      },
    });
    const dm = bloques.find((b) => b.titulo === 'DM2')!;
    expect(dm.lineas).toContainEqual({ etiqueta: ETIQUETA_ESTADO_ACTUAL, valor: 'No controlada' });
    expect(dm.lineas).toContainEqual({ etiqueta: ETIQUETA_EVOLUCION, valor: 'Estable' });
  });

  it('dx activo sin tendencia: no muestra evolución ni Sin tendencia', () => {
    const bloques = bloquesResumenCondicionesParaVista({
      hipertension: {
        presente: true,
        estadoActual: 'CONTROLADA',
        codigoEstadoVigencia: 'CONTROLADA',
      },
    });
    const hta = bloques.find((b) => b.titulo === 'Hipertensión')!;
    expect(hta.lineas.some((l) => l.etiqueta === ETIQUETA_EVOLUCION)).toBe(false);
    expect(hta.lineas.some((l) => l.valor === 'Sin tendencia')).toBe(false);
  });

  it('presente explícito false sin vigencia → No documentada', () => {
    const bloques = bloquesResumenCondicionesParaVista({
      diabetes: { presente: false },
    });
    expect(bloques.find((b) => b.titulo === 'DM2')!.lineas[0]).toEqual({
      etiqueta: ETIQUETA_ESTADO,
      valor: TEXTO_CONDICION_NO_DOCUMENTADA,
    });
  });

  it('obesidad activa: estado actual por grado y cambio IMC desde indicadores', () => {
    const bloques = bloquesResumenCondicionesParaVista(
      {
        obesidad: {
          presente: true,
          gradoActual: 'OBESIDAD_I',
          tendencia: 'Mejoría',
        },
      },
      {
        resumenIndicadores: {
          indiceMasaCorporal: { valorInicial: 35.27, valorFinal: 30 },
        },
      },
    );
    const ob = bloques.find((b) => b.titulo === 'Obesidad')!;
    expect(ob.lineas).toContainEqual({
      etiqueta: ETIQUETA_ESTADO_ACTUAL,
      valor: 'Obesidad clase I',
    });
    expect(ob.lineas).toContainEqual({
      etiqueta: ETIQUETA_CAMBIO_IMC,
      valor: '35.27 → 30',
    });
    expect(ob.lineas.some((l) => l.etiqueta === ETIQUETA_EVOLUCION)).toBe(false);
    expect(ob.lineas.some((l) => l.etiqueta === 'Grado')).toBe(false);
  });

  it('obesidad activa empeora: cambio IMC', () => {
    const bloques = bloquesResumenCondicionesParaVista(
      {
        obesidad: {
          presente: true,
          gradoActual: 'OBESIDAD_II',
        },
      },
      {
        resumenIndicadores: {
          indiceMasaCorporal: { valorInicial: 32, valorFinal: 35 },
        },
      },
    );
    const ob = bloques.find((b) => b.titulo === 'Obesidad')!;
    expect(ob.lineas).toContainEqual({
      etiqueta: ETIQUETA_ESTADO_ACTUAL,
      valor: 'Obesidad clase II',
    });
    expect(ob.lineas).toContainEqual({
      etiqueta: ETIQUETA_CAMBIO_IMC,
      valor: '32 → 35',
    });
  });

  it('obesidad sin IMC usa cambio peso', () => {
    const bloques = bloquesResumenCondicionesParaVista(
      {
        obesidad: { presente: true, gradoActual: 'OBESIDAD_I' },
      },
      {
        resumenIndicadores: {
          peso: { valorInicial: 108, valorFinal: 104 },
        },
      },
    );
    const ob = bloques.find((b) => b.titulo === 'Obesidad')!;
    expect(ob.lineas).toContainEqual({
      etiqueta: ETIQUETA_CAMBIO_PESO,
      valor: '108 → 104 kg',
    });
  });
});
