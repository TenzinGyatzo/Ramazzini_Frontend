import { describe, it, expect } from 'vitest';
import {
  getAntidopingSectionDefs,
  getAntidopingSectionIndex,
  legacyStepToSectionIndex,
} from '@/helpers/antidopingSections';

describe('antidopingSections', () => {
  it('tiene 1 sección fija', () => {
    expect(getAntidopingSectionDefs()).toHaveLength(1);
  });

  it('mapea legacy 1 y 2 a la misma sección', () => {
    expect(legacyStepToSectionIndex(1)).toBe(1);
    expect(legacyStepToSectionIndex(2)).toBe(1);
  });

  it('getAntidopingSectionIndex responde por id', () => {
    expect(getAntidopingSectionIndex('antidoping')).toBe(1);
  });
});
