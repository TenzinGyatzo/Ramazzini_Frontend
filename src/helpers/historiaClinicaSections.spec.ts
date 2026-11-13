import { describe, it, expect } from 'vitest';
import {
  getHcSectionDefsForSexo,
  getHcSectionIndex,
  legacyStepToSectionIndex,
  pasoHistoriaClinicaEnAsistente,
} from '@/helpers/historiaClinicaSections';

describe('historiaClinicaSections', () => {
  it('hombre tiene 6 secciones, mujer 7', () => {
    expect(getHcSectionDefsForSexo('Masculino')).toHaveLength(6);
    expect(getHcSectionDefsForSexo('Femenino')).toHaveLength(7);
  });

  it('mapea legacy a sección (mujer)', () => {
    expect(legacyStepToSectionIndex(1, 'Femenino')).toBe(1);
    expect(legacyStepToSectionIndex(5, 'Femenino')).toBe(2);
    expect(legacyStepToSectionIndex(15, 'Femenino')).toBe(3);
    expect(legacyStepToSectionIndex(25, 'Femenino')).toBe(4);
    expect(legacyStepToSectionIndex(30, 'Femenino')).toBe(5);
    expect(legacyStepToSectionIndex(43, 'Femenino')).toBe(6);
    expect(legacyStepToSectionIndex(46, 'Femenino')).toBe(7);
  });

  it('mapea legacy a sección (hombre) sin GO', () => {
    expect(legacyStepToSectionIndex(12, 'Masculino')).toBe(3);
    expect(legacyStepToSectionIndex(42, 'Masculino')).toBe(5);
    expect(legacyStepToSectionIndex(46, 'Masculino')).toBe(6);
    expect(legacyStepToSectionIndex(28, 'Masculino')).toBe(5);
    expect(legacyStepToSectionIndex(32, 'Masculino')).toBe(6);
  });

  it('getHcSectionIndex respeta sexo para GO', () => {
    expect(getHcSectionIndex('laborales', 'Femenino')).toBe(6);
    expect(getHcSectionIndex('laborales', 'Masculino')).toBe(5);
  });
});

describe('pasoHistoriaClinicaEnAsistente', () => {
  it('con secciones: el resumen es la última sección (hombre y mujer)', () => {
    expect(pasoHistoriaClinicaEnAsistente(46, 'Femenino', true)).toBe(7);
    expect(pasoHistoriaClinicaEnAsistente(46, 'Masculino', true)).toBe(6);
    expect(pasoHistoriaClinicaEnAsistente(1, 'Masculino', true)).toBe(1);
  });

  it('asistente clásico: en hombres el resumen es el paso 32; en mujeres, el 46', () => {
    expect(pasoHistoriaClinicaEnAsistente(46, 'Masculino', false)).toBe(32);
    expect(pasoHistoriaClinicaEnAsistente(46, 'Femenino', false)).toBe(46);
    expect(pasoHistoriaClinicaEnAsistente(1, 'Masculino', false)).toBe(1);
  });
});
