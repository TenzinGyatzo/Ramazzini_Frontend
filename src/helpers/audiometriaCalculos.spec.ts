import { describe, expect, it } from 'vitest';
import { obtenerResultadoBinauralAudiometria, tieneHipoacusiaBilateralCombinada } from './audiometriaCalculos';

describe('audiometriaCalculos', () => {
  it('una HBC de 0 % es un resultado registrado (audición normal), no un dato faltante', () => {
    expect(tieneHipoacusiaBilateralCombinada({ metodoAudiometria: 'LFT', hipoacusiaBilateralCombinada: 0 })).toBe(true);
    expect(tieneHipoacusiaBilateralCombinada({ hipoacusiaBilateralCombinada: 12 })).toBe(true);
  });

  it('sin HBC registrada sí falta el dato', () => {
    expect(tieneHipoacusiaBilateralCombinada({ metodoAudiometria: 'LFT' })).toBe(false);
    expect(tieneHipoacusiaBilateralCombinada({ hipoacusiaBilateralCombinada: null })).toBe(false);
    expect(tieneHipoacusiaBilateralCombinada(null)).toBe(false);
  });

  it('con AMA y audición perfecta la PAB es 0, no nula', () => {
    const umbrales = Object.fromEntries(
      ['Derecho', 'Izquierdo'].flatMap((oido) => [500, 1000, 2000, 3000].map((f) => [`oido${oido}${f}`, 0])),
    );
    expect(obtenerResultadoBinauralAudiometria({ metodoAudiometria: 'AMA', ...umbrales })).toBe(0);
  });
});
