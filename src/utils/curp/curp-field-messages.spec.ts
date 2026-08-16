import { describe, expect, it } from 'vitest';
import { createCurpIssue } from './curp-validation-catalog';
import {
  buildRelatedFieldMessages,
  relatedFieldForPosition,
} from './curp-field-messages';

describe('relatedFieldForPosition', () => {
  it('mapea primer apellido a posiciones 1, 2 y 14', () => {
    expect(relatedFieldForPosition(1)).toBe('primerApellido');
    expect(relatedFieldForPosition(2)).toBe('primerApellido');
    expect(relatedFieldForPosition(14)).toBe('primerApellido');
  });

  it('mapea segundo apellido a posiciones 3 y 15', () => {
    expect(relatedFieldForPosition(3)).toBe('segundoApellido');
    expect(relatedFieldForPosition(15)).toBe('segundoApellido');
  });

  it('mapea posición 11 a sexoCURP en SIRES', () => {
    expect(relatedFieldForPosition(11, { useSexoCurpForValidation: true })).toBe(
      'sexoCURP',
    );
    expect(relatedFieldForPosition(11)).toBe('sexo');
  });
});

describe('buildRelatedFieldMessages', () => {
  it('agrupa mensajes por campo según posición', () => {
    const issues = [
      createCurpIssue('CURP_CROSS_INICIALES', {
        positions: [1],
        message: 'Pos. 1 (inicial): se espera "C", la CURP contiene "O".',
      }),
      createCurpIssue('CURP_CROSS_INICIALES', {
        positions: [2],
        message: 'Pos. 2 (inicial): se espera "O", la CURP contiene "T".',
      }),
      createCurpIssue('CURP_CROSS_CONSONANTES', {
        positions: [14],
        message:
          'Pos. 14 (consonante interna): se espera "R", la CURP contiene "O".',
      }),
      createCurpIssue('CURP_CROSS_INICIALES', {
        positions: [3],
        message: 'Pos. 3 (inicial): se espera "G", la CURP contiene "O".',
      }),
    ];

    const messages = buildRelatedFieldMessages(issues);

    expect(messages.primerApellido).toEqual([
      'Pos. 1 (inicial): se espera "C", la CURP contiene "O".',
      'Pos. 2 (inicial): se espera "O", la CURP contiene "T".',
      'Pos. 14 (consonante interna): se espera "R", la CURP contiene "O".',
    ]);
    expect(messages.segundoApellido).toEqual([
      'Pos. 3 (inicial): se espera "G", la CURP contiene "O".',
    ]);
    expect(messages.nombre).toBeUndefined();
  });
});
