import { describe, it, expect } from 'vitest';
import {
  getPeSectionDefs,
  getPeSectionIndex,
  legacyStepToSectionIndex,
} from '@/helpers/peSections';

describe('peSections', () => {
  it('tiene 7 secciones fijas', () => {
    expect(getPeSectionDefs()).toHaveLength(7);
  });

  it('mapea legacy a sección', () => {
    expect(legacyStepToSectionIndex(1)).toBe(1);
    expect(legacyStepToSectionIndex(2)).toBe(2);
    expect(legacyStepToSectionIndex(6)).toBe(2);
    expect(legacyStepToSectionIndex(7)).toBe(3);
    expect(legacyStepToSectionIndex(12)).toBe(3);
    expect(legacyStepToSectionIndex(13)).toBe(4);
    expect(legacyStepToSectionIndex(17)).toBe(4);
    expect(legacyStepToSectionIndex(18)).toBe(5);
    expect(legacyStepToSectionIndex(22)).toBe(5);
    expect(legacyStepToSectionIndex(23)).toBe(6);
    expect(legacyStepToSectionIndex(27)).toBe(6);
    expect(legacyStepToSectionIndex(28)).toBe(7);
  });

  it('getPeSectionIndex responde por id', () => {
    expect(getPeSectionIndex('fecha')).toBe(1);
    expect(getPeSectionIndex('factoresRiesgo')).toBe(2);
    expect(getPeSectionIndex('sintomas')).toBe(3);
    expect(getPeSectionIndex('antecedentes')).toBe(4);
    expect(getPeSectionIndex('contraindRelativas')).toBe(5);
    expect(getPeSectionIndex('contraindAbsolutas')).toBe(6);
    expect(getPeSectionIndex('resultado')).toBe(7);
  });
});
