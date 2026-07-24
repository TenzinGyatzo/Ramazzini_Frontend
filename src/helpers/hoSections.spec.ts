import { describe, it, expect } from 'vitest';
import {
  getHoSectionDefs,
  getHoSectionIndex,
  legacyStepToSectionIndex,
} from '@/helpers/hoSections';

describe('hoSections', () => {
  it('tiene 6 secciones fijas', () => {
    expect(getHoSectionDefs()).toHaveLength(6);
  });

  it('mapea legacy a sección', () => {
    expect(legacyStepToSectionIndex(1)).toBe(1);
    expect(legacyStepToSectionIndex(2)).toBe(2);
    expect(legacyStepToSectionIndex(7)).toBe(2);
    expect(legacyStepToSectionIndex(8)).toBe(3);
    expect(legacyStepToSectionIndex(15)).toBe(3);
    expect(legacyStepToSectionIndex(16)).toBe(4);
    expect(legacyStepToSectionIndex(21)).toBe(4);
    expect(legacyStepToSectionIndex(22)).toBe(5);
    expect(legacyStepToSectionIndex(24)).toBe(5);
    expect(legacyStepToSectionIndex(25)).toBe(6);
  });

  it('getHoSectionIndex responde por id', () => {
    expect(getHoSectionIndex('fecha')).toBe(1);
    expect(getHoSectionIndex('sintomas')).toBe(2);
    expect(getHoSectionIndex('antecedentes')).toBe(3);
    expect(getHoSectionIndex('exposicion')).toBe(4);
    expect(getHoSectionIndex('otoscopia')).toBe(5);
    expect(getHoSectionIndex('resultado')).toBe(6);
  });
});
