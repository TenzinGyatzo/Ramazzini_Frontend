import { describe, expect, it } from 'vitest';
import { alternar, aniosDesde, redactarObservacionesAudiometria, respuestasVacias } from './audiometriaObservaciones';

const r = (cambios: Partial<ReturnType<typeof respuestasVacias>>) => ({ ...respuestasVacias(), ...cambios });

describe('observaciones de la audiometría (punto 44)', () => {
  it('sin respuestas, sin texto', () => {
    expect(redactarObservacionesAudiometria(respuestasVacias())).toBe('');
  });

  it('las plantillas de antes se arman con las respuestas', () => {
    // «Sin exposición; otoscopia normal»
    expect(redactarObservacionesAudiometria(r({ exposicion: 'No', sintomas: ['asintomatico'], otoscopia: ['normal'] }))).toBe(
      'Niega antecedente de exposición a ruido de tipo industrial. Audiológicamente asintomático. Conductos auditivos permeables, membranas timpánicas íntegras.',
    );
    // «Exposición con EPP irregular»
    expect(
      redactarObservacionesAudiometria(
        r({ exposicion: 'Si', anios: 5, proteccion: 'intermitente', sintomas: ['asintomatico'], otoscopia: ['normal'] }),
      ),
    ).toBe(
      'Refiere antecedente de exposición a ruido de tipo industrial durante 5 años, con uso intermitente de EPP. Audiológicamente asintomático. Conductos auditivos permeables, membranas timpánicas íntegras.',
    );
    // «Exposición con cerumen impactado»
    expect(redactarObservacionesAudiometria(r({ exposicion: 'Si', anios: 1, otoscopia: ['cerumen'] }))).toBe(
      'Refiere antecedente de exposición a ruido de tipo industrial durante 1 año. Conductos auditivos con cerumen impactado, membranas timpánicas no visibles.',
    );
  });

  it('antecedentes y varios síntomas', () => {
    expect(
      redactarObservacionesAudiometria(
        r({ antecedentes: ['otitisMedia', 'traumaOD', 'traumaOI'], sintomas: ['hipoacusia', 'acufenos'], otoscopia: ['cicatrices'] }),
      ),
    ).toBe(
      'Refiere antecedente de otitis media previa, trauma acústico en oído derecho y trauma acústico en oído izquierdo. Refiere hipoacusia. Refiere acúfenos/tinnitus. Conductos auditivos permeables, membranas timpánicas con cambios cicatriciales.',
    );
  });

  it('«Asintomático» y «Normal» excluyen a las demás', () => {
    expect(alternar(['hipoacusia', 'otalgia'], 'asintomatico', 'asintomatico')).toEqual(['asintomatico']);
    expect(alternar(['asintomatico'], 'hipoacusia', 'asintomatico')).toEqual(['hipoacusia']);
    expect(alternar(['normal'], 'cerumen', 'normal')).toEqual(['cerumen']);
    expect(alternar(['cerumen'], 'cerumen', 'normal')).toEqual([]);
  });

  it('años de partida: la antigüedad completa', () => {
    expect(aniosDesde('2022-03-01', new Date(2026, 10, 21))).toBe(4);
    expect(aniosDesde('2026-03-01', new Date(2026, 10, 21))).toBeNull();
    expect(aniosDesde(null)).toBeNull();
  });
});
