/**
 * Catálogo de códigos, severidad y mensajes CURP (contrato FE/BE).
 * Posiciones son 1-based (RENAPO).
 */

export type CurpIssueSeverity = 'error' | 'warning';

export type CurpRelatedField =
  | 'curp'
  | 'fechaNacimiento'
  | 'sexo'
  | 'sexoCURP'
  | 'entidadNacimiento'
  | 'nombre'
  | 'primerApellido'
  | 'segundoApellido';

export type CurpIssueCode =
  | 'CURP_EMPTY'
  | 'CURP_LENGTH'
  | 'CURP_CHARSET_INICIALES'
  | 'CURP_CHARSET_FECHA'
  | 'CURP_CHARSET_SEXO'
  | 'CURP_CHARSET_ENTIDAD'
  | 'CURP_CHARSET_CONSONANTES'
  | 'CURP_CHARSET_HOMOCLAVE'
  | 'CURP_CHARSET_CHECK'
  | 'CURP_GENERIC_NOT_ALLOWED'
  | 'CURP_GENERIC_REQUIRED'
  | 'CURP_FORMAT'
  | 'CURP_CROSS_FECHA'
  | 'CURP_CROSS_SEXO'
  | 'CURP_CROSS_ENTIDAD'
  | 'CURP_CROSS_INICIALES'
  | 'CURP_CROSS_CONSONANTES'
  | 'CURP_CROSS_HOMOCLAVE'
  | 'CURP_CHECKSUM';

export interface CurpCatalogEntry {
  code: CurpIssueCode;
  positions: number[];
  severity: CurpIssueSeverity;
  relatedFields: CurpRelatedField[];
  /** Mensaje estático; usar formatCurpIssueMessage para expected/got */
  message: string;
}

export const CURP_POSITION_RANGES = {
  iniciales: [1, 2, 3, 4] as number[],
  fecha: [5, 6, 7, 8, 9, 10] as number[],
  sexo: [11] as number[],
  entidad: [12, 13] as number[],
  consonantes: [14, 15, 16] as number[],
  homoclave: [17] as number[],
  checkDigit: [18] as number[],
};

export const CURP_VALIDATION_CATALOG: Record<CurpIssueCode, CurpCatalogEntry> = {
  CURP_EMPTY: {
    code: 'CURP_EMPTY',
    positions: [],
    severity: 'error',
    relatedFields: ['curp'],
    message: 'La CURP no puede estar vacía.',
  },
  CURP_LENGTH: {
    code: 'CURP_LENGTH',
    positions: CURP_POSITION_RANGES.iniciales.concat(
      CURP_POSITION_RANGES.fecha,
      CURP_POSITION_RANGES.sexo,
      CURP_POSITION_RANGES.entidad,
      CURP_POSITION_RANGES.consonantes,
      CURP_POSITION_RANGES.homoclave,
      CURP_POSITION_RANGES.checkDigit,
    ),
    severity: 'error',
    relatedFields: ['curp'],
    message: 'La CURP debe tener exactamente 18 caracteres.',
  },
  CURP_CHARSET_INICIALES: {
    code: 'CURP_CHARSET_INICIALES',
    positions: CURP_POSITION_RANGES.iniciales,
    severity: 'error',
    relatedFields: ['curp'],
    message: 'Las posiciones 1 a 4 deben ser letras (A-Z).',
  },
  CURP_CHARSET_FECHA: {
    code: 'CURP_CHARSET_FECHA',
    positions: CURP_POSITION_RANGES.fecha,
    severity: 'error',
    relatedFields: ['curp'],
    message: 'Las posiciones 5 a 10 deben ser dígitos (fecha AAMMDD).',
  },
  CURP_CHARSET_SEXO: {
    code: 'CURP_CHARSET_SEXO',
    positions: CURP_POSITION_RANGES.sexo,
    severity: 'error',
    relatedFields: ['curp'],
    message: 'La posición 11 debe ser H, M o X (sexo).',
  },
  CURP_CHARSET_ENTIDAD: {
    code: 'CURP_CHARSET_ENTIDAD',
    positions: CURP_POSITION_RANGES.entidad,
    severity: 'error',
    relatedFields: ['curp'],
    message: 'Las posiciones 12 y 13 deben ser letras (entidad de nacimiento).',
  },
  CURP_CHARSET_CONSONANTES: {
    code: 'CURP_CHARSET_CONSONANTES',
    positions: CURP_POSITION_RANGES.consonantes,
    severity: 'error',
    relatedFields: ['curp'],
    message: 'Las posiciones 14 a 16 deben ser letras (consonantes internas).',
  },
  CURP_CHARSET_HOMOCLAVE: {
    code: 'CURP_CHARSET_HOMOCLAVE',
    positions: CURP_POSITION_RANGES.homoclave,
    severity: 'error',
    relatedFields: ['curp'],
    message: 'La posición 17 debe ser alfanumérica (diferenciador de homonimia).',
  },
  CURP_CHARSET_CHECK: {
    code: 'CURP_CHARSET_CHECK',
    positions: CURP_POSITION_RANGES.checkDigit,
    severity: 'error',
    relatedFields: ['curp'],
    message: 'La posición 18 debe ser un dígito (dígito verificador).',
  },
  CURP_GENERIC_NOT_ALLOWED: {
    code: 'CURP_GENERIC_NOT_ALLOWED',
    positions: CURP_POSITION_RANGES.iniciales.concat(
      CURP_POSITION_RANGES.fecha,
      CURP_POSITION_RANGES.sexo,
      CURP_POSITION_RANGES.entidad,
      CURP_POSITION_RANGES.consonantes,
      CURP_POSITION_RANGES.homoclave,
      CURP_POSITION_RANGES.checkDigit,
    ),
    severity: 'error',
    relatedFields: ['curp'],
    message: 'La CURP genérica no está permitida para este registro.',
  },
  CURP_GENERIC_REQUIRED: {
    code: 'CURP_GENERIC_REQUIRED',
    positions: CURP_POSITION_RANGES.iniciales.concat(
      CURP_POSITION_RANGES.fecha,
      CURP_POSITION_RANGES.sexo,
      CURP_POSITION_RANGES.entidad,
      CURP_POSITION_RANGES.consonantes,
      CURP_POSITION_RANGES.homoclave,
      CURP_POSITION_RANGES.checkDigit,
    ),
    severity: 'error',
    relatedFields: ['curp', 'entidadNacimiento'],
    message:
      'Con entidad de nacimiento NO ESPECIFICADO o SE IGNORA la CURP debe ser XXXX999999XXXXXX99.',
  },
  CURP_FORMAT: {
    code: 'CURP_FORMAT',
    positions: CURP_POSITION_RANGES.iniciales.concat(
      CURP_POSITION_RANGES.fecha,
      CURP_POSITION_RANGES.sexo,
      CURP_POSITION_RANGES.entidad,
      CURP_POSITION_RANGES.consonantes,
      CURP_POSITION_RANGES.homoclave,
      CURP_POSITION_RANGES.checkDigit,
    ),
    severity: 'error',
    relatedFields: ['curp'],
    message:
      'La CURP no cumple el formato RENAPO (4 letras, 6 dígitos, H/M/X, 5 letras, 1 alfanumérico, 1 dígito).',
  },
  CURP_CROSS_FECHA: {
    code: 'CURP_CROSS_FECHA',
    positions: CURP_POSITION_RANGES.fecha,
    severity: 'error',
    relatedFields: ['curp', 'fechaNacimiento'],
    message:
      'La CURP no coincide con la fecha de nacimiento (posiciones 5 a 10).',
  },
  CURP_CROSS_SEXO: {
    code: 'CURP_CROSS_SEXO',
    positions: CURP_POSITION_RANGES.sexo,
    severity: 'error',
    relatedFields: ['curp', 'sexo', 'sexoCURP'],
    message: 'La CURP no coincide con el sexo (posición 11).',
  },
  CURP_CROSS_ENTIDAD: {
    code: 'CURP_CROSS_ENTIDAD',
    positions: CURP_POSITION_RANGES.entidad,
    severity: 'error',
    relatedFields: ['curp', 'entidadNacimiento'],
    message:
      'La CURP no coincide con la entidad de nacimiento (posiciones 12 y 13).',
  },
  CURP_CROSS_INICIALES: {
    code: 'CURP_CROSS_INICIALES',
    positions: CURP_POSITION_RANGES.iniciales,
    severity: 'error',
    relatedFields: ['curp', 'nombre', 'primerApellido', 'segundoApellido'],
    message:
      'La CURP no coincide con las iniciales del nombre y apellidos (posiciones 1 a 4).',
  },
  CURP_CROSS_CONSONANTES: {
    code: 'CURP_CROSS_CONSONANTES',
    positions: CURP_POSITION_RANGES.consonantes,
    severity: 'error',
    relatedFields: ['curp', 'nombre', 'primerApellido', 'segundoApellido'],
    message:
      'La CURP no coincide con las consonantes internas del nombre y apellidos (posiciones 14 a 16).',
  },
  CURP_CROSS_HOMOCLAVE: {
    code: 'CURP_CROSS_HOMOCLAVE',
    positions: CURP_POSITION_RANGES.homoclave,
    severity: 'error',
    relatedFields: ['curp', 'fechaNacimiento'],
    message:
      'La CURP no coincide con el diferenciador de homonimia según el año de nacimiento (posición 17).',
  },
  CURP_CHECKSUM: {
    code: 'CURP_CHECKSUM',
    positions: CURP_POSITION_RANGES.checkDigit,
    severity: 'warning',
    relatedFields: ['curp'],
    message:
      'El dígito verificador (posición 18) no coincide con el algoritmo RENAPO. Puede continuar, pero revise la CURP.',
  },
};

export interface CurpIssue {
  code: CurpIssueCode;
  positions: number[];
  severity: CurpIssueSeverity;
  message: string;
  relatedFields: CurpRelatedField[];
  expected?: string;
  got?: string;
}

export function formatCurpIssueMessage(
  code: CurpIssueCode,
  expected?: string,
  got?: string,
): string {
  const base = CURP_VALIDATION_CATALOG[code].message;
  if (expected !== undefined && got !== undefined && expected !== '' && got !== '') {
    return `${base} Esperado: ${expected}; en CURP: ${got}.`;
  }
  return base;
}

export function createCurpIssue(
  code: CurpIssueCode,
  overrides?: Partial<Pick<CurpIssue, 'expected' | 'got' | 'positions' | 'message'>>,
): CurpIssue {
  const entry = CURP_VALIDATION_CATALOG[code];
  return {
    code,
    positions: overrides?.positions ?? entry.positions,
    severity: entry.severity,
    relatedFields: entry.relatedFields,
    expected: overrides?.expected,
    got: overrides?.got,
    message:
      overrides?.message ??
      formatCurpIssueMessage(code, overrides?.expected, overrides?.got),
  };
}

/** Mapeo field A1 del backend → código de catálogo */
export const A1_FIELD_TO_CODE: Record<string, CurpIssueCode> = {
  fechaNacimiento: 'CURP_CROSS_FECHA',
  sexo: 'CURP_CROSS_SEXO',
  entidadNacimiento: 'CURP_CROSS_ENTIDAD',
  iniciales: 'CURP_CROSS_INICIALES',
  consonantesInternas: 'CURP_CROSS_CONSONANTES',
  homoclave: 'CURP_CROSS_HOMOCLAVE',
};
