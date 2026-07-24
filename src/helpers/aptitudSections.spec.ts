import { describe, it, expect } from 'vitest';
import {
  getAptitudSectionDefs,
  getAptitudSectionIndex,
  legacyStepToSectionIndex,
} from '@/helpers/aptitudSections';

describe('aptitudSections', () => {
  it('tiene 6 secciones fijas', () => {
    expect(getAptitudSectionDefs()).toHaveLength(6);
  });

  it('mapea legacy a sección', () => {
    expect(legacyStepToSectionIndex(1)).toBe(1);
    expect(legacyStepToSectionIndex(2)).toBe(2);
    expect(legacyStepToSectionIndex(5)).toBe(2);
    expect(legacyStepToSectionIndex(7)).toBe(2);
    expect(legacyStepToSectionIndex(8)).toBe(3);
    expect(legacyStepToSectionIndex(9)).toBe(4);
    expect(legacyStepToSectionIndex(10)).toBe(5);
    expect(legacyStepToSectionIndex(11)).toBe(6);
  });

  it('getAptitudSectionIndex responde por id', () => {
    expect(getAptitudSectionIndex('fecha')).toBe(1);
    expect(getAptitudSectionIndex('evaluacionesAdicionales')).toBe(2);
    expect(getAptitudSectionIndex('aptitud')).toBe(3);
    expect(getAptitudSectionIndex('medidas')).toBe(6);
  });
});
