import { describe, expect, it } from 'vitest';
import { etiquetaCedulaPiePagina } from './textoCedulaPiePagina';

describe('etiqueta de la cédula en el pie de página', () => {
  it('México: solo el médico dice «Médico Cirujano»', () => {
    expect(etiquetaCedulaPiePagina('MX', 'medico')).toBe('Cédula Profesional Médico Cirujano No.');
    expect(etiquetaCedulaPiePagina('MX', 'enfermera')).toBe('Cédula Profesional No.');
    expect(etiquetaCedulaPiePagina('MX', 'tecnico')).toBe('Cédula Profesional No.');
  });

  it('Guatemala usa «Colegiado Activo» para todos', () => {
    expect(etiquetaCedulaPiePagina('GT', 'medico')).toBe('Colegiado Activo No.');
    expect(etiquetaCedulaPiePagina('GT', 'enfermera')).toBe('Colegiado Activo No.');
  });

  it('otros países o sin país: «Registro Profesional»', () => {
    expect(etiquetaCedulaPiePagina('CO', 'enfermera')).toBe('Registro Profesional No.');
    expect(etiquetaCedulaPiePagina(undefined, 'medico')).toBe('Registro Profesional No.');
  });
});
