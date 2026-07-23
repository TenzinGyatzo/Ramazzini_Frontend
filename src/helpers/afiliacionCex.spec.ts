import { describe, it, expect } from 'vitest';
import {
  AFILIACION_MAX,
  normalizarEtiquetaAfiliacion,
  esExclusivoPorEtiqueta,
  aplicarCambioDerechohabiencia,
  formatDerechohabienciaLabels,
} from './afiliacionCex';

describe('normalizarEtiquetaAfiliacion', () => {
  it('normaliza mayúsculas, acentos y espacios', () => {
    expect(normalizarEtiquetaAfiliacion('  No   especificado ')).toBe(
      'NO ESPECIFICADO',
    );
    expect(normalizarEtiquetaAfiliacion('Ninguna')).toBe('NINGUNA');
    expect(normalizarEtiquetaAfiliacion('SE IGNORA')).toBe('SE IGNORA');
  });
});

describe('esExclusivoPorEtiqueta', () => {
  it('reconoce etiquetas exclusivas CEX independientemente del código', () => {
    expect(esExclusivoPorEtiqueta('NINGUNA')).toBe(true);
    expect(esExclusivoPorEtiqueta('No especificado')).toBe(true);
    expect(esExclusivoPorEtiqueta('Se ignora')).toBe(true);
    expect(esExclusivoPorEtiqueta('IMSS')).toBe(false);
  });
});

describe('aplicarCambioDerechohabiencia', () => {
  const optionsByCode = new Map([
    ['1', { label: 'NINGUNA', exclusive: true }],
    ['2', { label: 'IMSS', exclusive: false }],
    ['3', { label: 'ISSSTE', exclusive: false }],
    ['4', { label: 'NINGUNA', exclusive: true }], // remapeo: Ninguna en código 4
  ]);

  it('al marcar exclusiva deja solo ese código', () => {
    const next = aplicarCambioDerechohabiencia({
      selected: ['2', '3', '1'],
      clickedCode: '1',
      optionsByCode,
    });
    expect(next).toEqual(['1']);
  });

  it('al marcar no exclusiva quita exclusivas', () => {
    const next = aplicarCambioDerechohabiencia({
      selected: ['1', '2'],
      clickedCode: '2',
      optionsByCode,
    });
    expect(next).toEqual(['2']);
  });

  it('exclusividad sigue la etiqueta tras remapeo de código', () => {
    const next = aplicarCambioDerechohabiencia({
      selected: ['2', '4'],
      clickedCode: '4',
      optionsByCode,
    });
    expect(next).toEqual(['4']);
  });

  it(`limita a ${AFILIACION_MAX} no exclusivas`, () => {
    const many = Array.from({ length: 10 }, (_, i) => String(100 + i));
    const map = new Map(
      many.map((c) => [c, { label: `OPT-${c}`, exclusive: false }]),
    );
    const next = aplicarCambioDerechohabiencia({
      selected: many,
      clickedCode: many[9],
      optionsByCode: map,
    });
    expect(next).toHaveLength(AFILIACION_MAX);
  });
});

describe('formatDerechohabienciaLabels', () => {
  it('resuelve labels y hace fallback al código', () => {
    expect(
      formatDerechohabienciaLabels('2&3&99', {
        '2': 'IMSS',
        '3': 'ISSSTE',
      }),
    ).toBe('IMSS, ISSSTE, 99');
  });
});
