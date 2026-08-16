export interface CurpNameData {
  nombre?: string;
  primerApellido?: string;
  segundoApellido?: string;
}

export interface CurpNameSegments {
  /** Bloque pos. 1-4 con filtro RENAPO (sustituto X en pos. 2 si aplica). */
  iniciales: string;
  /** Bloque pos. 1-4 sin filtro de palabras inconvenientes. */
  inicialesRaw: string;
  consonantes: string;
}

/** Expectativa de un carácter en una posición de la CURP. */
export type PositionExpectation = string | { alternatives: string[] };

export function positionExpectationMatches(
  got: string,
  expected: PositionExpectation,
): boolean {
  if (typeof expected === 'string') {
    return got === expected;
  }
  return expected.alternatives.includes(got);
}

export function formatPositionExpectation(expected: PositionExpectation): string {
  if (typeof expected === 'string') {
    return expected;
  }
  return [...new Set(expected.alternatives)].join(' o ');
}
