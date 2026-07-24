import { describe, it, expect } from 'vitest';
import {
  getCertificadoSectionDefs,
  getCertificadoSectionIndex,
  legacyStepToSectionIndex,
} from '@/helpers/certificadoSections';

describe('certificadoSections', () => {
  it('tiene 1 sección fija', () => {
    expect(getCertificadoSectionDefs()).toHaveLength(1);
  });

  it('mapea legacy 1 y 2 a la misma sección', () => {
    expect(legacyStepToSectionIndex(1)).toBe(1);
    expect(legacyStepToSectionIndex(2)).toBe(1);
  });

  it('getCertificadoSectionIndex responde por id', () => {
    expect(getCertificadoSectionIndex('certificado')).toBe(1);
  });
});
