import { describe, expect, it } from 'vitest';
import { diffCurpChars, formatPositionMismatchMessage } from './curp-position-diff';

describe('diffCurpChars', () => {
  it('solo marca la posición distinta en iniciales', () => {
    const diffs = diffCurpChars('CXGE', 'COGE', 1);
    expect(diffs).toEqual([{ position: 2, expected: 'X', got: 'O' }]);
  });

  it('marca la posición distinta de fecha (año)', () => {
    // AAMMDD: índice 1 → posición RENAPO 6
    const diffs = diffCurpChars('900515', '910515', 5);
    expect(diffs).toEqual([{ position: 6, expected: '0', got: '1' }]);
  });

  it('trata patrón de homoclave como una sola posición', () => {
    const diffs = diffCurpChars('0-9', 'A', 17);
    expect(diffs).toEqual([{ position: 17, expected: '0-9', got: 'A' }]);
  });
});

describe('formatPositionMismatchMessage', () => {
  it('incluye posición y hint', () => {
    expect(formatPositionMismatchMessage(2, 'X', 'O', 'inicial')).toBe(
      'Pos. 2 (inicial): se espera "X", la CURP contiene "O".',
    );
  });
});
