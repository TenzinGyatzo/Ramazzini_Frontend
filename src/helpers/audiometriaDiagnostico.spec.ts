import { describe, expect, it } from 'vitest';
import { redactarDiagnosticoAudiometria, respuestasDiagnosticoVacias } from './audiometriaDiagnostico';

const r = (cambios: Partial<ReturnType<typeof respuestasDiagnosticoVacias>>) => ({
  ...respuestasDiagnosticoVacias(),
  ...cambios,
});

describe('diagnóstico de la audiometría (punto 44)', () => {
  it('sin resultado, sin texto; Normal', () => {
    expect(redactarDiagnosticoAudiometria(respuestasDiagnosticoVacias())).toBe('');
    expect(redactarDiagnosticoAudiometria(r({ resultado: 'Normal', tipo: 'mixta' }))).toBe('Audición normal bilateral.');
  });

  it('se arma conforme se contesta, como el constructor de antes', () => {
    expect(redactarDiagnosticoAudiometria(r({ resultado: 'Hipoacusia' }))).toBe('Hipoacusia crónica.');
    expect(redactarDiagnosticoAudiometria(r({ resultado: 'Hipoacusia', tipo: 'neurosensorial', lateralidad: 'bilateral', severidad: 'leve' }))).toBe(
      'Hipoacusia neurosensorial bilateral crónica leve.',
    );
    expect(redactarDiagnosticoAudiometria(r({ resultado: 'Hipoacusia', tipo: 'conductiva', lateralidad: 'derecha', severidad: 'moderada' }))).toBe(
      'Hipoacusia conductiva unilateral derecha crónica moderada.',
    );
  });

  it('«Compatible con» al final, una o varias causas', () => {
    expect(
      redactarDiagnosticoAudiometria(
        r({
          resultado: 'Hipoacusia',
          tipo: 'neurosensorial',
          lateralidad: 'bilateral',
          severidad: 'leve',
          compatibles: ['Cortipatía bilateral crónica por exposición a ruido.', 'Presbiacusia (envejecimiento).'],
        }),
      ),
    ).toBe(
      'Hipoacusia neurosensorial bilateral crónica leve. Compatible con cortipatía bilateral crónica por exposición a ruido y presbiacusia (envejecimiento).',
    );
  });
});
