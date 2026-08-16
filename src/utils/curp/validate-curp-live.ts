/**
 * Motor de validación CURP live (formato por segmento + cruce A1 + checksum warning).
 */
import { isGenericCurp } from '@/helpers/isGenericCurp';
import {
  A1_FIELD_TO_CODE,
  CURP_VALIDATION_CATALOG,
  createCurpIssue,
  type CurpIssue,
  type CurpIssueCode,
  type CurpRelatedField,
} from './curp-validation-catalog';
import {
  parseDateSafe,
  isFechaNacimientoReadyForCurpCrossCheck,
  validateCURPFormat,
  validateCURPChecksum,
  getExpectedCheckDigit,
  normalizeEntidadToCURPCode,
  normalizeSexoToCURPCode,
  type Discrepancy,
} from './curp-validator';
import { derivePartialNamePositionExpectations, getExpectedHomoclavePattern, positionExpectationMatches, formatPositionExpectation } from './curp-name-segments';
import type { PositionExpectation } from './curp-name.types';
import { mapSexoToGiisBiologico } from './sexo-mapper';
import {
  isTrabajadorSexoCurp,
  normalizeSexoCurpToCurpCode,
  type TrabajadorSexoCurp,
} from '@/helpers/trabajadorSexoCurp';
import { buildRelatedFieldErrors, buildRelatedFieldMessages } from './curp-field-messages';
import {
  CURP_FIELD_START_POS,
  SEGMENT_HINTS,
  diffCurpChars,
  formatPositionMismatchMessage,
} from './curp-position-diff';

export interface CurpDemographicInput {
  fechaNacimiento?: Date | string | null;
  sexo?: string | null;
  sexoCURP?: TrabajadorSexoCurp | null;
  /** true en trabajadores SIRES: pos. 11 usa sexoCURP, no sexo biológico */
  useSexoCurpForValidation?: boolean;
  entidadNacimiento?: string | null;
  nombre?: string | null;
  primerApellido?: string | null;
  segundoApellido?: string | null;
}

export interface ValidateCurpLiveOptions {
  /** true = trabajadores; false = firmantes */
  allowGenericCurp: boolean;
  /** Si true, CURP vacía genera error (requerido) */
  required?: boolean;
  /** Si true, solo se acepta CURP genérica (entidad 00/99) */
  requireGenericCurp?: boolean;
}

export interface CurpLiveValidationResult {
  issues: CurpIssue[];
  invalidPositions: number[];
  /** Posiciones con cruce demográfico/nombre o checksum superado (sin error/advertencia). */
  validPositions: number[];
  relatedFieldErrors: Partial<Record<CurpRelatedField, string>>;
  relatedFieldMessages: Partial<Record<CurpRelatedField, string[]>>;
  hasBlockingErrors: boolean;
  normalizedCurp: string;
}

function charsetCharIssues(
  code: CurpIssueCode,
  curp: string,
  badPositions: number[],
  expectedKind: string,
): CurpIssue[] {
  return badPositions.map((pos) => {
    const got = curp[pos - 1] ?? '';
    return createCurpIssue(code, {
      positions: [pos],
      got,
      message: `Pos. ${pos}: se espera ${expectedKind}, la CURP contiene "${got || '∅'}".`,
    });
  });
}

function positionsForIncompleteCharset(
  curp: string,
): CurpIssue[] {
  const issues: CurpIssue[] = [];
  const len = curp.length;

  if (len >= 1) {
    const filled = Math.min(4, len);
    const bad = Array.from({ length: filled }, (_, i) => i + 1).filter(
      (p) => !/^[A-Z]$/.test(curp[p - 1] ?? ''),
    );
    if (bad.length) {
      issues.push(...charsetCharIssues('CURP_CHARSET_INICIALES', curp, bad, 'una letra A-Z'));
    }
  }

  if (len >= 5) {
    const filled = Math.min(6, len - 4);
    const bad = Array.from({ length: filled }, (_, i) => i + 5).filter(
      (p) => !/^\d$/.test(curp[p - 1] ?? ''),
    );
    if (bad.length) {
      issues.push(...charsetCharIssues('CURP_CHARSET_FECHA', curp, bad, 'un dígito'));
    }
  }

  if (len >= 11) {
    const sexo = curp.charAt(10);
    if (!/^[HMX]$/.test(sexo)) {
      issues.push(
        ...charsetCharIssues('CURP_CHARSET_SEXO', curp, [11], 'H, M o X'),
      );
    }
  }

  if (len >= 12) {
    const filled = Math.min(2, len - 11);
    const bad = Array.from({ length: filled }, (_, i) => i + 12).filter(
      (p) => !/^[A-Z]$/.test(curp[p - 1] ?? ''),
    );
    if (bad.length) {
      issues.push(...charsetCharIssues('CURP_CHARSET_ENTIDAD', curp, bad, 'una letra A-Z'));
    }
  }

  if (len >= 14) {
    const filled = Math.min(3, len - 13);
    const bad = Array.from({ length: filled }, (_, i) => i + 14).filter(
      (p) => !/^[A-Z]$/.test(curp[p - 1] ?? ''),
    );
    if (bad.length) {
      issues.push(...charsetCharIssues('CURP_CHARSET_CONSONANTES', curp, bad, 'una letra A-Z'));
    }
  }

  // Posición 17: charset laxo solo si no hay fecha para regla de siglo
  // (la regla 0-9 / A-J se aplica en issuesFromHomoclaveCentury).

  if (len >= 18) {
    const check = curp.charAt(17);
    if (!/^\d$/.test(check)) {
      issues.push(
        ...charsetCharIssues('CURP_CHARSET_CHECK', curp, [18], 'un dígito'),
      );
    }
  }

  return issues;
}

/** Código A1 según posición RENAPO (1–16). */
function crossCodeForPosition(position: number): CurpIssueCode {
  if (position <= 4) return 'CURP_CROSS_INICIALES';
  if (position <= 10) return 'CURP_CROSS_FECHA';
  if (position === 11) return 'CURP_CROSS_SEXO';
  if (position <= 13) return 'CURP_CROSS_ENTIDAD';
  return 'CURP_CROSS_CONSONANTES';
}

function segmentHintForPosition(position: number): string {
  if (position <= 4) return SEGMENT_HINTS.iniciales;
  if (position <= 10) return SEGMENT_HINTS.fechaNacimiento;
  if (position === 11) return SEGMENT_HINTS.sexo;
  if (position <= 13) return SEGMENT_HINTS.entidadNacimiento;
  return SEGMENT_HINTS.consonantesInternas;
}

/**
 * Posición 17 (homoclave / siglo):
 * - nacidos hasta 1999 → dígito 0-9
 * - nacidos desde 2000 → letra A-J
 */
function issuesFromHomoclaveCentury(
  curp: string,
  demographics: CurpDemographicInput,
): CurpIssue[] {
  if (!curp || curp.length < 17 || isGenericCurp(curp)) {
    return [];
  }
  if (!isFechaNacimientoReadyForCurpCrossCheck(demographics.fechaNacimiento)) {
    const homo = curp.charAt(16);
    if (!/^[0-9A-Z]$/.test(homo)) {
      return charsetCharIssues(
        'CURP_CHARSET_HOMOCLAVE',
        curp,
        [17],
        'un carácter alfanumérico',
      );
    }
    return [];
  }

  const { year } = parseDateSafe(demographics.fechaNacimiento!);
  const rule = getExpectedHomoclavePattern(year);
  const got = curp.charAt(16);
  if (rule.pattern.test(got)) {
    return [];
  }

  const expectedLabel =
    year < 2000
      ? 'un dígito 0-9 (nacimiento antes del 2000)'
      : 'una letra A-J (nacimiento desde el 2000)';

  return [
    createCurpIssue('CURP_CROSS_HOMOCLAVE', {
      positions: [17],
      expected: rule.label,
      got,
      message: `Pos. 17 (homoclave): se espera ${expectedLabel}, la CURP contiene "${got || '∅'}".`,
    }),
  ];
}

function hasDemographicValue(value: string | null | undefined): boolean {
  return typeof value === 'string' && value.trim() !== '';
}

/**
 * Heurística tardía: confirma sinApellidos en live solo cuando demografía
 * de identificación está lista, apellidos vacíos y CURP ≥ 16.
 */
function isSinApellidosLiveConfirmed(
  curp: string,
  demographics: CurpDemographicInput,
): boolean {
  if (curp.length < 16) {
    return false;
  }

  if (
    !hasDemographicValue(demographics.nombre) ||
    hasDemographicValue(demographics.primerApellido) ||
    hasDemographicValue(demographics.segundoApellido)
  ) {
    return false;
  }

  if (!isFechaNacimientoReadyForCurpCrossCheck(demographics.fechaNacimiento)) {
    return false;
  }

  let hasUsableSexo = false;
  if (
    demographics.useSexoCurpForValidation &&
    isTrabajadorSexoCurp(demographics.sexoCURP)
  ) {
    hasUsableSexo = true;
  } else if (hasDemographicValue(demographics.sexo)) {
    if (mapSexoToGiisBiologico(demographics.sexo!) === 3) {
      hasUsableSexo = true;
    } else {
      hasUsableSexo = !!normalizeSexoToCURPCode(demographics.sexo!);
    }
  }
  if (!hasUsableSexo) {
    return false;
  }

  if (!hasDemographicValue(demographics.entidadNacimiento)) {
    return false;
  }
  const entidadCode = normalizeEntidadToCURPCode(
    demographics.entidadNacimiento!,
  );
  if (!entidadCode || entidadCode === '00') {
    return false;
  }

  return true;
}

function namePositionExpectations(
  curp: string,
  demographics: CurpDemographicInput,
) {
  return derivePartialNamePositionExpectations(
    {
      nombre: demographics.nombre ?? undefined,
      primerApellido: demographics.primerApellido ?? undefined,
      segundoApellido: demographics.segundoApellido ?? undefined,
    },
    {
      confirmSinApellidos: isSinApellidosLiveConfirmed(curp, demographics),
    },
  );
}

function pushSegmentMismatches(
  issues: CurpIssue[],
  curp: string,
  startPos: number,
  expected: string,
  compareLen: number,
): void {
  if (compareLen <= 0 || !expected) {
    return;
  }

  const expectedSlice = expected.substring(0, compareLen);
  const gotSlice = curp.substring(startPos - 1, startPos - 1 + compareLen);
  const mismatches = diffCurpChars(expectedSlice, gotSlice, startPos);

  for (const m of mismatches) {
    issues.push(
      createCurpIssue(crossCodeForPosition(m.position), {
        positions: [m.position],
        expected: m.expected,
        got: m.got,
        message: formatPositionMismatchMessage(
          m.position,
          m.expected,
          m.got,
          segmentHintForPosition(m.position),
        ),
      }),
    );
  }
}

function pushPositionMismatch(
  issues: CurpIssue[],
  curp: string,
  position: number,
  expected: PositionExpectation,
): void {
  if (curp.length < position) {
    return;
  }

  const got = curp.charAt(position - 1);
  if (positionExpectationMatches(got, expected)) {
    return;
  }

  const expectedLabel = formatPositionExpectation(expected);

  issues.push(
    createCurpIssue(crossCodeForPosition(position), {
      positions: [position],
      expected: expectedLabel,
      got,
      message: formatPositionMismatchMessage(
        position,
        expectedLabel,
        got || '∅',
        segmentHintForPosition(position),
      ),
    }),
  );
}

function issuesFromPartialNameCrossCheck(
  curp: string,
  demographics: CurpDemographicInput,
): CurpIssue[] {
  const expectations = namePositionExpectations(curp, demographics);

  const issues: CurpIssue[] = [];
  for (const [position, expected] of expectations) {
    pushPositionMismatch(issues, curp, position, expected);
  }
  return issues;
}

/**
 * Cruce por segmento: valida solo cuando hay CURP y el dato demográfico correspondiente.
 */
function issuesFromIncrementalCrossCheck(
  curp: string,
  demographics: CurpDemographicInput,
): CurpIssue[] {
  if (!curp || isGenericCurp(curp)) {
    return [];
  }

  const issues: CurpIssue[] = [];
  const len = curp.length;

  issues.push(...issuesFromPartialNameCrossCheck(curp, demographics));

  if (
    len >= 5 &&
    isFechaNacimientoReadyForCurpCrossCheck(demographics.fechaNacimiento)
  ) {
    const fechaParsed = parseDateSafe(demographics.fechaNacimiento!);
    const expected = `${String(fechaParsed.year).slice(-2)}${String(fechaParsed.month).padStart(2, '0')}${String(fechaParsed.day).padStart(2, '0')}`;
    pushSegmentMismatches(
      issues,
      curp,
      5,
      expected,
      Math.min(6, len - 4),
    );
  }

  if (len >= 11) {
    if (
      demographics.useSexoCurpForValidation &&
      isTrabajadorSexoCurp(demographics.sexoCURP)
    ) {
      const sexoCode = normalizeSexoCurpToCurpCode(demographics.sexoCURP);
      pushSegmentMismatches(issues, curp, 11, sexoCode, 1);
    } else if (hasDemographicValue(demographics.sexo)) {
      const omitirCruceSexo =
        mapSexoToGiisBiologico(demographics.sexo!) === 3;
      if (!omitirCruceSexo) {
        const sexoCode = normalizeSexoToCURPCode(demographics.sexo!);
        if (sexoCode) {
          pushSegmentMismatches(issues, curp, 11, sexoCode, 1);
        }
      }
    }
  }

  if (len >= 12 && hasDemographicValue(demographics.entidadNacimiento)) {
    const entidadCode = normalizeEntidadToCURPCode(
      demographics.entidadNacimiento!,
    );
    if (entidadCode) {
      pushSegmentMismatches(
        issues,
        curp,
        12,
        entidadCode,
        Math.min(2, len - 11),
      );
    }
  }

  return issues;
}

function discrepancyToIssues(d: Discrepancy): CurpIssue[] {
  const code = A1_FIELD_TO_CODE[d.field] ?? 'CURP_FORMAT';
  const startPos = CURP_FIELD_START_POS[d.field] ?? 1;
  const hint = SEGMENT_HINTS[d.field];
  const mismatches = diffCurpChars(d.expected, d.gotFromCurp, startPos);

  if (mismatches.length === 0) {
    return [
      createCurpIssue(code, {
        expected: d.expected,
        got: d.gotFromCurp,
      }),
    ];
  }

  return mismatches.map((m) =>
    createCurpIssue(code, {
      positions: [m.position],
      expected: m.expected,
      got: m.got,
      message: formatPositionMismatchMessage(
        m.position,
        m.expected,
        m.got,
        hint,
      ),
    }),
  );
}

/**
 * Dígito verificador (pos. 18): algoritmo RENAPO, severidad warning (no bloquea).
 */
function issuesFromChecksum(curp: string): CurpIssue[] {
  if (!curp || curp.length !== 18 || isGenericCurp(curp)) {
    return [];
  }

  const got = curp.charAt(17);
  if (!/^\d$/.test(got)) {
    return [];
  }

  if (validateCURPChecksum(curp)) {
    return [];
  }

  const expected = getExpectedCheckDigit(curp);
  return [
    createCurpIssue('CURP_CHECKSUM', {
      positions: [18],
      expected,
      got,
      message: formatPositionMismatchMessage(
        18,
        expected,
        got,
        'dígito verificador',
      ),
    }),
  ];
}

function collectInvalidPositions(issues: CurpIssue[]): number[] {
  const set = new Set<number>();
  for (const issue of issues) {
    for (const p of issue.positions) {
      set.add(p);
    }
  }
  return [...set].sort((a, b) => a - b);
}

/**
 * Posiciones sujetas a cruce demográfico/nombre o checksum (no charset solo).
 * Solo se marcan verdes las que pasaron ese cruce; sin datos demográficos → neutral.
 */
function collectCrossCheckValidatedPositions(
  curp: string,
  demographics: CurpDemographicInput,
): number[] {
  if (!curp || isGenericCurp(curp)) {
    return [];
  }

  const validated = new Set<number>();
  const len = curp.length;

  for (const position of namePositionExpectations(curp, demographics).keys()) {
    if (len >= position) {
      validated.add(position);
    }
  }

  if (
    len >= 5 &&
    isFechaNacimientoReadyForCurpCrossCheck(demographics.fechaNacimiento)
  ) {
    for (let p = 5; p <= Math.min(10, len); p++) {
      validated.add(p);
    }
  }

  if (len >= 11) {
    if (
      demographics.useSexoCurpForValidation &&
      isTrabajadorSexoCurp(demographics.sexoCURP)
    ) {
      validated.add(11);
    } else if (hasDemographicValue(demographics.sexo)) {
      const omitirCruceSexo =
        mapSexoToGiisBiologico(demographics.sexo!) === 3;
      if (!omitirCruceSexo) {
        const sexoCode = normalizeSexoToCURPCode(demographics.sexo!);
        if (sexoCode) {
          validated.add(11);
        }
      }
    }
  }

  if (len >= 12 && hasDemographicValue(demographics.entidadNacimiento)) {
    const entidadCode = normalizeEntidadToCURPCode(
      demographics.entidadNacimiento!,
    );
    if (entidadCode) {
      for (let p = 12; p <= Math.min(13, len); p++) {
        validated.add(p);
      }
    }
  }

  if (
    len >= 17 &&
    isFechaNacimientoReadyForCurpCrossCheck(demographics.fechaNacimiento)
  ) {
    validated.add(17);
  }

  if (len === 18 && /^\d$/.test(curp.charAt(17))) {
    validated.add(18);
  }

  return [...validated].sort((a, b) => a - b);
}

function collectValidPositions(
  validatedPositions: number[],
  invalidPositions: number[],
): number[] {
  const invalid = new Set(invalidPositions);
  return validatedPositions.filter((pos) => !invalid.has(pos));
}

/**
 * Validación live de CURP. Cruce demográfico/nombre solo con longitud 18.
 */
export function validateCurpLive(
  curp: string | null | undefined,
  demographics: CurpDemographicInput,
  options: ValidateCurpLiveOptions,
): CurpLiveValidationResult {
  const issues: CurpIssue[] = [];
  const raw = (curp ?? '').trim().toUpperCase();
  const fieldMessageOptions = {
    useSexoCurpForValidation: demographics.useSexoCurpForValidation === true,
  };

  if (!raw) {
    if (options.required) {
      issues.push(createCurpIssue('CURP_EMPTY'));
    }
    return {
      issues,
      invalidPositions: [],
      validPositions: [],
      relatedFieldErrors: {},
      relatedFieldMessages: {},
      hasBlockingErrors: issues.some((i) => i.severity === 'error'),
      normalizedCurp: raw,
    };
  }

  // Charset / segmentos parciales
  issues.push(...positionsForIncompleteCharset(raw));

  if (raw.length > 18) {
    issues.push(createCurpIssue('CURP_LENGTH'));
  }

  if (raw.length === 18) {
    if (isGenericCurp(raw)) {
      if (!options.allowGenericCurp) {
        issues.push(createCurpIssue('CURP_GENERIC_NOT_ALLOWED'));
      }
      // Genérica válida: no charset extra, no cruce, no checksum
      const unique = dedupeIssues(issues);
      const invalidPositions = collectInvalidPositions(unique);
      const validatedPositions = collectCrossCheckValidatedPositions(raw, demographics);
      return {
        issues: unique,
        invalidPositions,
        validPositions: collectValidPositions(validatedPositions, invalidPositions),
        relatedFieldErrors: buildRelatedFieldErrors(unique, fieldMessageOptions),
        relatedFieldMessages: buildRelatedFieldMessages(unique, fieldMessageOptions),
        hasBlockingErrors: unique.some((i) => i.severity === 'error'),
        normalizedCurp: raw,
      };
    }

    if (options.requireGenericCurp) {
      issues.push(createCurpIssue('CURP_GENERIC_REQUIRED'));
      const unique = sortIssuesByPosition(dedupeIssues(issues));
      const invalidPositions = collectInvalidPositions(unique);
      return {
        issues: unique,
        invalidPositions,
        validPositions: [],
        relatedFieldErrors: buildRelatedFieldErrors(unique, fieldMessageOptions),
        relatedFieldMessages: buildRelatedFieldMessages(unique, fieldMessageOptions),
        hasBlockingErrors: true,
        normalizedCurp: raw,
      };
    }

    if (!validateCURPFormat(raw)) {
      // Si no hay issues de charset específicos, añadir formato genérico
      if (!issues.some((i) => i.code.startsWith('CURP_CHARSET'))) {
        issues.push(createCurpIssue('CURP_FORMAT'));
      }
    }

    issues.push(...issuesFromIncrementalCrossCheck(raw, demographics));
  } else if (raw.length < 18 && !isGenericCurp(raw)) {
    if (options.requireGenericCurp) {
      issues.push(createCurpIssue('CURP_GENERIC_REQUIRED'));
    } else {
      issues.push(...issuesFromIncrementalCrossCheck(raw, demographics));
    }
  }

  // Homoclave/siglo (pos 17) siempre que haya al menos 17 caracteres
  if (raw.length >= 17 && !isGenericCurp(raw)) {
    issues.push(...issuesFromHomoclaveCentury(raw, demographics));
  }

  // Checksum (pos 18): warning, no bloqueante
  if (raw.length === 18 && !isGenericCurp(raw)) {
    issues.push(...issuesFromChecksum(raw));
  }

  const unique = sortIssuesByPosition(dedupeIssues(issues));
  const invalidPositions = collectInvalidPositions(unique);
  const validatedPositions = collectCrossCheckValidatedPositions(raw, demographics);
  return {
    issues: unique,
    invalidPositions,
    validPositions: collectValidPositions(validatedPositions, invalidPositions),
    relatedFieldErrors: buildRelatedFieldErrors(unique, fieldMessageOptions),
    relatedFieldMessages: buildRelatedFieldMessages(unique, fieldMessageOptions),
    hasBlockingErrors: unique.some((i) => i.severity === 'error'),
    normalizedCurp: raw,
  };
}

function issueSortKey(issue: CurpIssue): number {
  if (issue.positions.length > 0) {
    return Math.min(...issue.positions);
  }
  return 999;
}

function sortIssuesByPosition(issues: CurpIssue[]): CurpIssue[] {
  return [...issues].sort((a, b) => {
    const posDiff = issueSortKey(a) - issueSortKey(b);
    if (posDiff !== 0) return posDiff;
    return a.code.localeCompare(b.code);
  });
}

function dedupeIssues(issues: CurpIssue[]): CurpIssue[] {
  // Una entrada por posición (prioriza cruce semántico sobre charset)
  const byPosition = new Map<number, CurpIssue>();
  const withoutPosition: CurpIssue[] = [];

  const rank = (code: string) => (code.startsWith('CURP_CROSS_') ? 2 : 1);

  for (const issue of issues) {
    if (issue.positions.length === 0) {
      withoutPosition.push(issue);
      continue;
    }
    for (const pos of issue.positions) {
      const existing = byPosition.get(pos);
      if (!existing || rank(issue.code) >= rank(existing.code)) {
        // Conservar issue de una sola posición para granularidad
        byPosition.set(pos, {
          ...issue,
          positions: [pos],
        });
      }
    }
  }

  return [...withoutPosition, ...byPosition.values()];
}

/** Convierte discrepancies A1 del API a CurpIssue[] (expande a granularidad por posición). */
export function issuesFromA1Details(
  details: Array<{
    field?: string;
    expected?: string;
    gotFromCurp?: string;
    code?: string;
    positions?: number[];
    severity?: string;
    message?: string;
  }>,
): CurpIssue[] {
  const result: CurpIssue[] = [];

  for (const d of details) {
    // Si el BE ya mandó una sola posición + mensaje, respetarlo
    if (
      Array.isArray(d.positions) &&
      d.positions.length === 1 &&
      typeof d.message === 'string' &&
      d.message.trim() !== ''
    ) {
      const code =
        (d.code && d.code in CURP_VALIDATION_CATALOG
          ? (d.code as CurpIssueCode)
          : A1_FIELD_TO_CODE[d.field ?? '']) ?? 'CURP_FORMAT';
      result.push(
        createCurpIssue(code, {
          positions: d.positions,
          expected: d.expected,
          got: d.gotFromCurp,
          message: d.message,
        }),
      );
      continue;
    }

    const field = d.field ?? '';
    if (field && d.expected != null && d.gotFromCurp != null) {
      result.push(
        ...discrepancyToIssues({
          field: field as Discrepancy['field'],
          expected: d.expected,
          gotFromCurp: d.gotFromCurp,
        }),
      );
      continue;
    }

    if (d.code && d.code in CURP_VALIDATION_CATALOG) {
      result.push(
        createCurpIssue(d.code as CurpIssueCode, {
          expected: d.expected,
          got: d.gotFromCurp,
          positions: d.positions,
          message: d.message,
        }),
      );
    }
  }

  return result;
}
