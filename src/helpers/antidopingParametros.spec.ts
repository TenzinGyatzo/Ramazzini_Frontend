import { describe, it, expect } from 'vitest';
import {
  getCamposVisibles,
  isCampoVisible,
  inferTipoPruebaFromDoc,
  normalizeTipoPrueba,
  CAMPOS_POR_TIPO,
} from '@/helpers/antidopingParametros';

describe('antidopingParametros', () => {
  it('devuelve campos por tipo de prueba', () => {
    expect(getCamposVisibles('2')).toEqual(['marihuana', 'cocaina']);
    expect(getCamposVisibles('3')).toHaveLength(3);
    expect(getCamposVisibles('5')).toHaveLength(5);
    expect(getCamposVisibles('6')).toHaveLength(6);
    expect(getCamposVisibles('10')).toHaveLength(10);
    expect(getCamposVisibles('12')).toHaveLength(12);
  });

  it('usa tipo 5 por defecto ante valores inválidos', () => {
    expect(normalizeTipoPrueba(null)).toBe('5');
    expect(normalizeTipoPrueba('99')).toBe('5');
    expect(getCamposVisibles(undefined)).toEqual(CAMPOS_POR_TIPO['5']);
  });

  it('isCampoVisible respeta el tipo', () => {
    expect(isCampoVisible('marihuana', '2')).toBe(true);
    expect(isCampoVisible('anfetaminas', '2')).toBe(false);
    expect(isCampoVisible('ketamina', '12')).toBe(true);
    expect(isCampoVisible('ketamina', '10')).toBe(false);
  });

  it('infiere tipo de prueba desde documento', () => {
    expect(
      inferTipoPruebaFromDoc({ marihuana: 'Negativo', cocaina: 'Negativo' }),
    ).toBe('2');
    expect(
      inferTipoPruebaFromDoc({
        marihuana: 'Negativo',
        cocaina: 'Negativo',
        anfetaminas: 'Negativo',
      }),
    ).toBe('3');
    expect(
      inferTipoPruebaFromDoc({
        marihuana: 'Negativo',
        cocaina: 'Negativo',
        anfetaminas: 'Negativo',
        metanfetaminas: 'Negativo',
        opiaceos: 'Negativo',
        benzodiacepinas: 'Negativo',
      }),
    ).toBe('6');
  });
});
