import { describe, it, expect } from 'vitest';
import {
  getCamposVisibles,
  isCampoVisible,
  inferTipoPruebaFromDoc,
  normalizeTipoPrueba,
  CAMPOS_POR_TIPO,
  TIPOS_PRUEBA_OPCIONES,
  nombresDelTipo,
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

describe('5 parámetros con BZO (otra marca de prueba)', () => {
  it('mismo set que el de 5 con Benzodiacepinas en lugar de Opiáceos', () => {
    expect(getCamposVisibles('5BZO')).toEqual([
      'marihuana',
      'cocaina',
      'anfetaminas',
      'metanfetaminas',
      'benzodiacepinas',
    ]);
    // El de OPI sigue siendo el predeterminado
    expect(normalizeTipoPrueba(undefined)).toBe('5');
  });

  it('cada opción de la lista dice qué analitos incluye; las dos de 5 quedan juntas', () => {
    const etiquetas = TIPOS_PRUEBA_OPCIONES.map((o) => o.label);
    expect(etiquetas[2]).toBe('5 parámetros · THC, COC, AMP, MET, OPI');
    expect(etiquetas[3]).toBe('5 parámetros · THC, COC, AMP, MET, BZO');
    expect(etiquetas[0]).toBe('2 parámetros · THC, COC');
    expect(nombresDelTipo('5BZO')).toBe('Marihuana, Cocaína, Anfetaminas, Metanfetaminas, Benzodiacepinas');
  });

  it('al reabrir se reconoce por sus analitos (antes se tomaba por el de 6)', () => {
    const conBzo = { marihuana: 'Negativo', cocaina: 'Negativo', anfetaminas: 'Negativo', metanfetaminas: 'Negativo', benzodiacepinas: 'Positivo' };
    expect(inferTipoPruebaFromDoc(conBzo)).toBe('5BZO');
    expect(inferTipoPruebaFromDoc({ ...conBzo, opiaceos: 'Negativo' })).toBe('6');
    const conOpi = { marihuana: 'Negativo', cocaina: 'Negativo', anfetaminas: 'Negativo', metanfetaminas: 'Negativo', opiaceos: 'Negativo' };
    expect(inferTipoPruebaFromDoc(conOpi)).toBe('5');
  });
});
