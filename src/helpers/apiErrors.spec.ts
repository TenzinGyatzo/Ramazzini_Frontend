import { describe, it, expect } from 'vitest';
import { extractApiErrorMessage, extractCurpA1Issues, isCurpA1ApiError } from './apiErrors';

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

  it('no trata VALIDATION_ERROR A2 como error CURP', () => {
    const error = {
      response: {
        data: {
          code: 'VALIDATION_ERROR',
          ruleId: 'A2',
          message:
            'La edad debe estar entre 18 y 100 años, incluyendo meses y días. La edad calculada es de 100 años, 0 meses y 0 días.',
        },
      },
    };

    expect(isCurpA1ApiError(error)).toBe(false);
    expect(extractApiErrorMessage(error)).toContain('La edad calculada es de');
  });

  it('extrae CurpIssue[] desde details A1', () => {
    const error = {
      response: {
        data: {
          message: {
            code: 'VALIDATION_ERROR',
            ruleId: 'A1',
            message: 'La CURP no coincide con el sexo (posición 11).',
            details: [
              { field: 'sexo', expected: 'H', gotFromCurp: 'M' },
            ],
          },
        },
      },
    };

    expect(isCurpA1ApiError(error)).toBe(true);
    const issues = extractCurpA1Issues(error);
    expect(issues).toHaveLength(1);
    expect(issues[0].code).toBe('CURP_CROSS_SEXO');
    expect(issues[0].positions).toEqual([11]);
    expect(issues[0].message).toContain('Pos. 11');
  });
});

describe('eliminar un trabajador: el usuario ve la causa real', () => {
  it('bloqueo por documentos finalizados o anulados (SIRES)', () => {
    const error = {
      response: {
        status: 403,
        data: {
          errorCode: 'ORG_DELETE_BLOCKED_RESGUARDED_DOCS',
          details: { trabajadorId: 'w1', resguardedDocCount: 2 },
        },
      },
    };
    expect(extractApiErrorMessage(error, 'genérico')).toBe(
      'No se puede eliminar este trabajador porque tiene documentos finalizados o anulados.',
    );
  });

  it('mensaje del servidor (no existe, fallo interno) en lugar del genérico', () => {
    expect(
      extractApiErrorMessage(
        { response: { status: 404, data: { message: 'El trabajador con ID w1 no existe o ya ha sido eliminado.' } } },
        'genérico',
      ),
    ).toBe('El trabajador con ID w1 no existe o ya ha sido eliminado.');
    // Sin mensaje del servidor: el texto de respaldo
    expect(extractApiErrorMessage({ response: { status: 500, data: {} } }, 'No se pudo eliminar el trabajador. Intenta de nuevo.')).toBe(
      'No se pudo eliminar el trabajador. Intenta de nuevo.',
    );
  });
});
