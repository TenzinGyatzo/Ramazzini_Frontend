import { describe, expect, it } from 'vitest';
import {
  avisosDeCaptura,
  caracteresDisponibles,
  fechaCorta,
  fechaTermino,
  mensajeDeError,
  soloFecha,
  sumarDias,
} from './incapacidades';

describe('incapacidades: fechas', () => {
  it('trata las fechas como texto de solo día, sin zona horaria', () => {
    expect(soloFecha('2026-05-04T00:00:00.000Z')).toBe('2026-05-04');
    expect(fechaCorta('2026-05-04T00:00:00.000Z')).toBe('04-05-2026');
    expect(fechaCorta(undefined)).toBe('');
  });

  it('la fecha de término es inicio + días − 1 y cruza de mes', () => {
    expect(fechaTermino('2026-01-28', 1)).toBe('2026-01-28');
    expect(fechaTermino('2026-01-28', 10)).toBe('2026-02-06');
    expect(fechaTermino('2026-01-28', 0)).toBe('');
    expect(sumarDias('2026-02-28', 1)).toBe('2026-03-01');
  });
});

describe('incapacidades: carácter según el ramo', () => {
  const valores = (ramo: any, nuevo: boolean) =>
    caracteresDisponibles(ramo, nuevo).map((c) => c.valor);

  it('un caso nuevo abre con inicial; el riesgo de trabajo también admite recaída', () => {
    expect(valores('enfermedadGeneral', true)).toEqual(['inicial']);
    expect(valores('riesgoTrabajo', true)).toEqual(['inicial', 'recaida']);
  });

  it('lo que se agrega a un caso es subsecuente', () => {
    expect(valores('enfermedadGeneral', false)).toEqual(['subsecuente']);
    expect(valores('riesgoTrabajo', false)).toEqual(['subsecuente']);
  });

  it('maternidad usa sus propios caracteres en cualquier momento', () => {
    expect(valores('maternidad', true)).toEqual(['prenatal', 'posparto', 'enlace']);
    expect(valores('maternidad', false)).toEqual(['prenatal', 'posparto', 'enlace']);
  });
});

describe('incapacidades: avisos de captura', () => {
  const base = { origen: 'imss' as const, caracter: 'inicial' as const, fechaInicio: '2026-05-04' };

  it('avisa si un certificado del IMSS pasa de 28 días, pero no en un descanso de la empresa', () => {
    expect(avisosDeCaptura({ ...base, dias: 28 })).toEqual([]);
    expect(avisosDeCaptura({ ...base, dias: 29 })).toHaveLength(1);
    expect(avisosDeCaptura({ ...base, origen: 'empresa', dias: 40 })).toEqual([]);
  });

  it('maternidad: posparto de 42; prenatal de 42 u 84', () => {
    expect(avisosDeCaptura({ ...base, caracter: 'posparto', dias: 42 })).toEqual([]);
    expect(avisosDeCaptura({ ...base, caracter: 'posparto', dias: 30 })).toHaveLength(1);
    expect(avisosDeCaptura({ ...base, caracter: 'prenatal', dias: 84 })).toEqual([]);
    expect(avisosDeCaptura({ ...base, caracter: 'prenatal', dias: 50 })).toHaveLength(1);
  });

  it('avisa del hueco con la incapacidad anterior, no de la continuidad', () => {
    const subsecuente = { ...base, caracter: 'subsecuente' as const, dias: 7 };
    expect(
      avisosDeCaptura({ ...subsecuente, fechaInicio: '2026-05-11', terminoAnterior: '2026-05-10T00:00:00.000Z' }),
    ).toEqual([]);
    expect(
      avisosDeCaptura({ ...subsecuente, fechaInicio: '2026-05-13', terminoAnterior: '2026-05-10T00:00:00.000Z' }),
    ).toHaveLength(1);
  });
});

describe('incapacidades: mensajes de error', () => {
  it('usa el mensaje del servidor, sea texto o lista de validaciones', () => {
    expect(mensajeDeError({ response: { data: { message: 'Se traslapa' } } }, 'x')).toBe('Se traslapa');
    expect(mensajeDeError({ response: { data: { message: ['a', 'b'] } } }, 'x')).toBe('a. b');
    expect(mensajeDeError(new Error('red'), 'No se pudo guardar')).toBe('No se pudo guardar');
  });
});
