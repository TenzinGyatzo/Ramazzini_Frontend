/**
 * Sugiere los primeros 16 caracteres de la CURP a partir de demografía/nombre.
 * Pos 17 (homoclave) y 18 (verificador) no se sugieren: dependen de RENAPO / checksum.
 */

import { deriveCurpNameSegments } from './curp-name-segments';
import {
  normalizeEntidadToCURPCode,
  normalizeSexoToCURPCode,
  parseDateSafe,
  isFechaNacimientoReadyForCurpCrossCheck,
} from './curp-validator';
import { mapSexoToGiisBiologico } from './sexo-mapper';
import {
  isTrabajadorSexoCurp,
  normalizeSexoCurpToCurpCode,
} from '@/helpers/trabajadorSexoCurp';
import type { CurpDemographicInput } from './validate-curp-live'; // type-only

export interface CurpPrefixSuggestion {
  /** Prefijo de 16 caracteres (posiciones 1–16) */
  prefix16: string;
  /** true si ya coincide con lo capturado en CURP */
  matchesCurrent: boolean;
}

/**
 * Deriva posiciones 1–16. Retorna null si faltan datos indispensables.
 */
export function suggestCurpPrefix16(
  demographics: CurpDemographicInput,
  currentCurp?: string | null,
): CurpPrefixSuggestion | null {
  const nombre = demographics.nombre?.trim();
  const primerApellido = demographics.primerApellido?.trim() || '';
  const segundoApellido = demographics.segundoApellido?.trim() || '';
  const fecha = demographics.fechaNacimiento;
  const sexo = demographics.sexo?.trim();
  const entidad = demographics.entidadNacimiento?.trim();

  const hasSexoForPrefix =
    (demographics.useSexoCurpForValidation &&
      isTrabajadorSexoCurp(demographics.sexoCURP)) ||
    (!demographics.useSexoCurpForValidation && sexo);

  // Segundo apellido sin primero es inválido; sin ambos apellidos sí se sugiere (sinApellidos).
  if (segundoApellido && !primerApellido) {
    return null;
  }

  if (!nombre || !fecha || !hasSexoForPrefix || !entidad) {
    return null;
  }

  const entidadCode = normalizeEntidadToCURPCode(entidad);
  if (!entidadCode || entidadCode === '00') {
    return null;
  }

  let sexoCode: string | null;
  if (
    demographics.useSexoCurpForValidation &&
    isTrabajadorSexoCurp(demographics.sexoCURP)
  ) {
    sexoCode = normalizeSexoCurpToCurpCode(demographics.sexoCURP);
  } else if (mapSexoToGiisBiologico(sexo!) === 3) {
    sexoCode = 'X';
  } else {
    sexoCode = normalizeSexoToCURPCode(sexo!);
  }
  if (!sexoCode) {
    return null;
  }

  if (!isFechaNacimientoReadyForCurpCrossCheck(fecha)) {
    return null;
  }
  const fechaParsed = parseDateSafe(fecha);

  const aammdd = `${String(fechaParsed.year).slice(-2)}${String(fechaParsed.month).padStart(2, '0')}${String(fechaParsed.day).padStart(2, '0')}`;
  const segments = deriveCurpNameSegments({
    nombre,
    primerApellido: primerApellido || undefined,
    segundoApellido: segundoApellido || undefined,
  });

  const prefix16 = `${segments.iniciales}${aammdd}${sexoCode}${entidadCode}${segments.consonantes}`;
  if (prefix16.length !== 16 || !/^[A-Z]{4}\d{6}[HMX][A-Z]{5}$/.test(prefix16)) {
    return null;
  }

  const normalizedCurrent = (currentCurp ?? '').trim().toUpperCase();
  const matchesCurrent =
    normalizedCurrent.length >= 16 &&
    normalizedCurrent.substring(0, 16) === prefix16;

  return { prefix16, matchesCurrent };
}

/**
 * Aplica el prefijo 1–16 conservando homoclave/verificador si ya existen.
 */
export function applyCurpPrefix16(currentCurp: string, prefix16: string): string {
  const current = (currentCurp || '').trim().toUpperCase();
  const prefix = prefix16.trim().toUpperCase();
  if (prefix.length !== 16) {
    return current;
  }
  const suffix = current.length > 16 ? current.substring(16, 18) : '';
  return `${prefix}${suffix}`;
}
