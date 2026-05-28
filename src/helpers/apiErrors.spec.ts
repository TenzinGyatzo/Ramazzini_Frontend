import { describe, it, expect } from 'vitest';
import { extractApiErrorMessage } from './apiErrors';

describe('extractApiErrorMessage', () => {
  it('extrae message string directo de NestJS', () => {
    const error = {
      response: { data: { message: 'El país de nacimiento es obligatorio' } },
    };
    expect(extractApiErrorMessage(error)).toBe(
      'El país de nacimiento es obligatorio',
    );
  });

  it('extrae message A1 enriquecido anidado en objeto VALIDATION_ERROR', () => {
    const error = {
      response: {
        data: {
          statusCode: 400,
          message: {
            code: 'VALIDATION_ERROR',
            ruleId: 'A1',
            summary:
              'La CURP no coincide con las iniciales del nombre y apellidos (posiciones 1 a 4).',
            userMessages: [
              'La CURP no coincide con las iniciales del nombre y apellidos (posiciones 1 a 4).',
            ],
            message:
              'La CURP no coincide con las iniciales del nombre y apellidos (posiciones 1 a 4).',
            details: [],
          },
        },
      },
    };
    expect(extractApiErrorMessage(error)).toBe(
      'La CURP no coincide con las iniciales del nombre y apellidos (posiciones 1 a 4).',
    );
  });

  it('extrae message A1 de fecha única sin texto redundante', () => {
    const error = {
      response: {
        data: {
          code: 'VALIDATION_ERROR',
          ruleId: 'A1',
          summary:
            'La CURP no coincide con la fecha de nacimiento. (posiciones 5 a 10).',
          userMessages: [
            'La CURP no coincide con la fecha de nacimiento. (posiciones 5 a 10).',
          ],
          message:
            'La CURP no coincide con la fecha de nacimiento. (posiciones 5 a 10).',
        },
      },
    };

    expect(extractApiErrorMessage(error)).toBe(
      'La CURP no coincide con la fecha de nacimiento. (posiciones 5 a 10).',
    );
    expect(extractApiErrorMessage(error)).not.toContain('fechaNacimiento');
  });

  it('extrae message A1 combinado para datos demográficos', () => {
    const error = {
      response: {
        data: {
          message: {
            ruleId: 'A1',
            summary:
              'La CURP no coincide en datos demográficos: fecha de nacimiento, sexo.',
            message:
              'La CURP no coincide en datos demográficos: fecha de nacimiento, sexo.',
          },
        },
      },
    };

    expect(extractApiErrorMessage(error)).toBe(
      'La CURP no coincide en datos demográficos: fecha de nacimiento, sexo.',
    );
  });

  it('usa fallback cuando no hay respuesta del backend', () => {
    expect(extractApiErrorMessage(new Error('Network Error'), 'Fallback')).toBe(
      'Network Error',
    );
    expect(extractApiErrorMessage({}, 'Fallback')).toBe('Fallback');
  });
});
