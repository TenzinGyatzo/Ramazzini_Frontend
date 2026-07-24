import { describe, it, expect } from 'vitest';
import {
  getEfSectionDefs,
  getEfSectionIndex,
  legacyStepToSectionIndex,
} from '@/helpers/exploracionFisicaSections';

describe('exploracionFisicaSections', () => {
  it('tiene 5 secciones fijas', () => {
    expect(getEfSectionDefs()).toHaveLength(5);
  });

  it('mapea legacy a sección', () => {
    expect(legacyStepToSectionIndex(1)).toBe(1);
    expect(legacyStepToSectionIndex(2)).toBe(2);
    expect(legacyStepToSectionIndex(3)).toBe(3);
    expect(legacyStepToSectionIndex(4)).toBe(4);
    expect(legacyStepToSectionIndex(15)).toBe(4);
    expect(legacyStepToSectionIndex(30)).toBe(4);
    expect(legacyStepToSectionIndex(31)).toBe(5);
  });

  it('getEfSectionIndex responde por id', () => {
    expect(getEfSectionIndex('fecha')).toBe(1);
    expect(getEfSectionIndex('exploracion')).toBe(4);
    expect(getEfSectionIndex('resumen')).toBe(5);
  });
});
