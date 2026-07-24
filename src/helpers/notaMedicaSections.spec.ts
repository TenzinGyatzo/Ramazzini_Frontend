import { describe, it, expect } from 'vitest';
import {
  getNmSectionDefs,
  getNmSectionIndex,
  legacyStepToSectionIndex,
} from '@/helpers/notaMedicaSections';
import { getNotaMedicaStepMap } from '@/helpers/notaMedicaStepMap';

describe('notaMedicaSections', () => {
  it('conteo por régimen: 5 / 8 / 9', () => {
    expect(getNmSectionDefs(false, false)).toHaveLength(5);
    expect(getNmSectionDefs(false, true)).toHaveLength(5);
    expect(getNmSectionDefs(true, false)).toHaveLength(8);
    expect(getNmSectionDefs(true, true)).toHaveLength(9);
  });

  it('mapea legacy SIN_REGIMEN a sección', () => {
    const showSires = false;
    const esMujer = false;
    const map = getNotaMedicaStepMap(showSires, esMujer);

    expect(legacyStepToSectionIndex(1, showSires, esMujer)).toBe(1);
    expect(legacyStepToSectionIndex(2, showSires, esMujer)).toBe(1);
    expect(legacyStepToSectionIndex(map.antecedentes, showSires, esMujer)).toBe(2);
    expect(legacyStepToSectionIndex(map.exploracion, showSires, esMujer)).toBe(2);
    expect(legacyStepToSectionIndex(map.signos, showSires, esMujer)).toBe(3);
    expect(legacyStepToSectionIndex(map.diagnostico, showSires, esMujer)).toBe(4);
    expect(legacyStepToSectionIndex(map.comorbilidad2, showSires, esMujer)).toBe(4);
    expect(legacyStepToSectionIndex(map.comorbilidad3, showSires, esMujer)).toBe(4);
    expect(legacyStepToSectionIndex(map.tratamiento, showSires, esMujer)).toBe(5);
    expect(legacyStepToSectionIndex(map.recomendaciones, showSires, esMujer)).toBe(5);
    expect(legacyStepToSectionIndex(map.observaciones, showSires, esMujer)).toBe(5);
  });

  it('mapea legacy SIRES hombre a sección', () => {
    const showSires = true;
    const esMujer = false;
    const map = getNotaMedicaStepMap(showSires, esMujer);

    expect(legacyStepToSectionIndex(1, showSires, esMujer)).toBe(1);
    expect(legacyStepToSectionIndex(map.genero!, showSires, esMujer)).toBe(2);
    expect(legacyStepToSectionIndex(map.antecedentes, showSires, esMujer)).toBe(3);
    expect(legacyStepToSectionIndex(map.signos, showSires, esMujer)).toBe(4);
    expect(legacyStepToSectionIndex(map.somatometria!, showSires, esMujer)).toBe(5);
    expect(legacyStepToSectionIndex(map.glucemia!, showSires, esMujer)).toBe(6);
    expect(legacyStepToSectionIndex(map.diagnostico, showSires, esMujer)).toBe(7);
    expect(legacyStepToSectionIndex(map.tratamiento, showSires, esMujer)).toBe(8);
  });

  it('mapea legacy SIRES mujer a sección', () => {
    const showSires = true;
    const esMujer = true;
    const map = getNotaMedicaStepMap(showSires, esMujer);

    expect(legacyStepToSectionIndex(1, showSires, esMujer)).toBe(1);
    expect(legacyStepToSectionIndex(map.genero!, showSires, esMujer)).toBe(2);
    expect(legacyStepToSectionIndex(map.signos, showSires, esMujer)).toBe(4);
    expect(legacyStepToSectionIndex(map.somatometria!, showSires, esMujer)).toBe(5);
    expect(legacyStepToSectionIndex(map.glucemia!, showSires, esMujer)).toBe(6);
    expect(legacyStepToSectionIndex(map.embarazo!, showSires, esMujer)).toBe(7);
    expect(legacyStepToSectionIndex(map.diagnostico, showSires, esMujer)).toBe(8);
    expect(legacyStepToSectionIndex(map.comorbilidad3, showSires, esMujer)).toBe(8);
    expect(legacyStepToSectionIndex(map.observaciones, showSires, esMujer)).toBe(9);
  });

  it('getNmSectionIndex respeta régimen', () => {
    expect(getNmSectionIndex('plan', false, false)).toBe(5);
    expect(getNmSectionIndex('plan', true, false)).toBe(8);
    expect(getNmSectionIndex('plan', true, true)).toBe(9);
    expect(getNmSectionIndex('diagnosticos', true, true)).toBe(8);
    expect(getNmSectionIndex('embarazo', true, true)).toBe(7);
  });
});
