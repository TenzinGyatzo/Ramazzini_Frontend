/**
 * Helper para validación de códigos CIE-10
 * Extrae, normaliza y valida duplicidades de códigos CIE-10
 * Valida restricciones de sexo y edad basadas en el catálogo
 */

import CatalogsAPI from '@/api/CatalogsAPI';

/**
 * Extrae el código CIE-10 de un string que puede venir como:
 * - "A30"
 * - "A30 - LEPRA [ENFERMEDAD DE HANSEN]"
 * @param value - Valor que puede contener código CIE-10 con o sin descripción
 * @returns Código CIE-10 extraído o null si está vacío
 */
export function extractCIE10Code(value: string | null | undefined): string | null {
  if (!value) return null;
  
  const trimmed = value.trim();
  if (!trimmed) return null;
  
  // Si ya es solo código (no tiene " - "), retornar tal cual
  if (!trimmed.includes(' - ')) {
    // Extraer solo la parte antes del primer espacio si existe
    return trimmed.split(/\s+/)[0];
  }
  
  // Extraer código antes de " - "
  const code = trimmed.split(' - ')[0].trim();
  // Asegurarse de que solo tomamos la parte del código antes de espacios
  return code.split(/\s+/)[0];
}

/**
 * Normaliza el código CIE-10 (trim + uppercase)
 * @param value - Valor a normalizar
 * @returns Código normalizado o null si está vacío
 */
export function normalizeCIE10Code(value: string | null | undefined): string | null {
  if (!value) return null;
  
  const code = extractCIE10Code(value);
  if (!code) return null;
  
  return code.trim().toUpperCase();
}

/**
 * Tipo para los issues de validación
 */
export interface CIE10ValidationIssue {
  type: 'principal_in_complementaries' | 'complementaries_duplicate' | 'diagnostico2_equals_principal' | 'diagnostico2_equals_complementary' | 'diagnostico2_sin_principal' | 'diagnostico3_equals_principal' | 'diagnostico3_equals_complementary' | 'diagnostico3_equals_diagnostico2' | 'diagnostico3_sin_diagnostico2';
  code: string;
  message: string;
}

/**
 * Resultado de la validación de duplicidades CIE-10
 */
export interface CIE10ValidationResult {
  ok: boolean;
  issues: CIE10ValidationIssue[];
}

/**
 * Payload para la validación de duplicidades
 */
export interface CIE10ValidationPayload {
  codigoCIE10Principal?: string | null;
  codigosCIE10Complementarios?: (string | null)[] | null;
  codigoCIEDiagnostico2?: string | null;
  codigoCIEDiagnostico3?: string | null;
  primeraVezDiagnostico2?: number | null;
  primeraVezDiagnostico3?: number | null;
}

/**
 * Valida duplicidades de códigos CIE-10 según las reglas:
 * 1. El código principal no puede estar repetido en complementarios
 * 2. Los complementarios no pueden repetirse entre sí
 * 3. El diagnóstico 2 no puede ser igual al principal
 * 4. El diagnóstico 2 no puede ser igual a ningún complementario
 * 5. El diagnóstico 3 no puede ser igual al principal
 * 6. El diagnóstico 3 no puede ser igual a ningún complementario
 * 7. El diagnóstico 3 no puede ser igual al diagnóstico 2
 *
 * @param payload - Objeto con los códigos CIE-10 a validar
 * @returns Resultado de la validación con issues encontrados
 */
/** Familia R69 (no especificado): permite repetir diag2/diag3 respecto al reference. */
function principalIsR69Family(code: string | null | undefined): boolean {
  if (!code) return false;
  const n = normalizeCIE10Code(code);
  if (!n) return false;
  const w = n.replace(/\./g, '').toUpperCase();
  return w.startsWith('R69');
}

export function isR69XFamily(code: string | null | undefined): boolean {
  return principalIsR69Family(code);
}

export function validateCIE10Duplicates(payload: CIE10ValidationPayload): CIE10ValidationResult {
  const issues: CIE10ValidationIssue[] = [];
  
  // Normalizar códigos
  const codigoPrincipal = normalizeCIE10Code(payload.codigoCIE10Principal);
  const codigoDiagnostico2 = normalizeCIE10Code(payload.codigoCIEDiagnostico2);
  const codigoDiagnostico3 = normalizeCIE10Code(payload.codigoCIEDiagnostico3);
  
  // Normalizar array de complementarios, filtrando valores vacíos
  const codigosComplementarios = (payload.codigosCIE10Complementarios || [])
    .map(code => normalizeCIE10Code(code))
    .filter((code): code is string => code !== null);

  const pv2Activo =
    payload.primeraVezDiagnostico2 === 0 || payload.primeraVezDiagnostico2 === 1;
  const pv3Activo =
    payload.primeraVezDiagnostico3 === 0 || payload.primeraVezDiagnostico3 === 1;
  const diag2Registrado = pv2Activo || !!codigoDiagnostico2;

  // Regla 0a: Diagnóstico 2 requiere diagnóstico principal
  if (diag2Registrado && !codigoPrincipal) {
    issues.push({
      type: 'diagnostico2_sin_principal',
      code: codigoDiagnostico2 || '',
      message:
        'No puede registrar el diagnóstico 2 sin haber registrado antes el diagnóstico principal.',
    });
  }

  // Regla 0b: Diagnóstico 3 requiere diagnóstico 2 registrado
  if (pv3Activo && !pv2Activo) {
    issues.push({
      type: 'diagnostico3_sin_diagnostico2',
      code: codigoDiagnostico3 || '',
      message:
        'No puede registrar el diagnóstico 3 sin haber registrado antes el diagnóstico 2 (comorbilidad).',
    });
  }
  
  // Regla 1: Verificar si código principal está repetido en complementarios
  if (codigoPrincipal) {
    const principalEnComplementarios = codigosComplementarios.some(
      comp => comp === codigoPrincipal
    );
    
    if (principalEnComplementarios) {
      issues.push({
        type: 'principal_in_complementaries',
        code: codigoPrincipal,
        message: 'Los diagnósticos complementarios no deben ser iguales al diagnóstico principal.'
      });
    }
  }
  
  // Regla 2: Verificar si hay complementarios repetidos entre sí
  const complementariosUnicos = new Set<string>();
  const complementariosDuplicados = new Set<string>();
  
  for (const comp of codigosComplementarios) {
    if (complementariosUnicos.has(comp)) {
      complementariosDuplicados.add(comp);
    } else {
      complementariosUnicos.add(comp);
    }
  }
  
  if (complementariosDuplicados.size > 0) {
    // Agregar issue para cada código duplicado encontrado
    complementariosDuplicados.forEach(code => {
      issues.push({
        type: 'complementaries_duplicate',
        code: code,
        message: 'Los diagnósticos complementarios no pueden repetirse.'
      });
    });
  }
  
  // Regla 3: Verificar si diagnóstico 2 es igual al principal (excepción: principal familia R69)
  if (codigoDiagnostico2 && codigoPrincipal) {
    if (
      codigoDiagnostico2 === codigoPrincipal &&
      !principalIsR69Family(payload.codigoCIE10Principal)
    ) {
      issues.push({
        type: 'diagnostico2_equals_principal',
        code: codigoDiagnostico2,
        message: 'El diagnóstico 2 debe ser diferente al diagnóstico principal.'
      });
    }
  }
  
  // Regla 4: Verificar si diagnóstico 2 es igual a algún complementario
  if (codigoDiagnostico2) {
    const diagnostico2EnComplementarios = codigosComplementarios.some(
      comp => comp === codigoDiagnostico2
    );
    
    if (diagnostico2EnComplementarios) {
      issues.push({
        type: 'diagnostico2_equals_complementary',
        code: codigoDiagnostico2,
        message: 'El diagnóstico 2 debe ser diferente a los diagnósticos complementarios.'
      });
    }
  }
  
  // Regla 5: Verificar si diagnóstico 3 es igual al principal (excepción: principal familia R69)
  if (codigoDiagnostico3 && codigoPrincipal) {
    if (
      codigoDiagnostico3 === codigoPrincipal &&
      !principalIsR69Family(payload.codigoCIE10Principal)
    ) {
      issues.push({
        type: 'diagnostico3_equals_principal',
        code: codigoDiagnostico3,
        message: 'El diagnóstico 3 debe ser diferente al diagnóstico principal.'
      });
    }
  }
  
  // Regla 6: Verificar si diagnóstico 3 es igual a algún complementario
  if (codigoDiagnostico3) {
    const diagnostico3EnComplementarios = codigosComplementarios.some(
      comp => comp === codigoDiagnostico3
    );
    
    if (diagnostico3EnComplementarios) {
      issues.push({
        type: 'diagnostico3_equals_complementary',
        code: codigoDiagnostico3,
        message: 'El diagnóstico 3 debe ser diferente a los diagnósticos complementarios.'
      });
    }
  }
  
  // Regla 7: Verificar si diagnóstico 3 es igual al diagnóstico 2 (excepción: diag2 familia R69)
  if (codigoDiagnostico3 && codigoDiagnostico2) {
    if (
      codigoDiagnostico3 === codigoDiagnostico2 &&
      !isR69XFamily(payload.codigoCIEDiagnostico2)
    ) {
      issues.push({
        type: 'diagnostico3_equals_diagnostico2',
        code: codigoDiagnostico3,
        message: 'El diagnóstico 3 debe ser diferente al diagnóstico 2.'
      });
    }
  }
  
  return {
    ok: issues.length === 0,
    issues: issues
  };
}

/**
 * Genera un mensaje de toast bloqueante basado en el primer issue encontrado
 * @param issue - Issue de validación
 * @returns Mensaje formateado para el toast
 */
export function generateBlockingToastMessage(issue: CIE10ValidationIssue): string {
  const { type, code } = issue;
  
  switch (type) {
    case 'principal_in_complementaries':
      return `No puedes continuar: el código ${code} está repetido entre el diagnóstico principal y los complementarios.`;
    case 'complementaries_duplicate':
      return `No puedes continuar: el código ${code} está repetido en diagnósticos complementarios.`;
    case 'diagnostico2_equals_principal':
      return `No puedes continuar: el código ${code} del diagnóstico 2 es igual al diagnóstico principal.`;
    case 'diagnostico2_equals_complementary':
      return `No puedes continuar: el código ${code} del diagnóstico 2 es igual a un diagnóstico complementario.`;
    case 'diagnostico3_equals_principal':
      return `No puedes continuar: el código ${code} del diagnóstico 3 es igual al diagnóstico principal.`;
    case 'diagnostico3_equals_complementary':
      return `No puedes continuar: el código ${code} del diagnóstico 3 es igual a un diagnóstico complementario.`;
    case 'diagnostico3_equals_diagnostico2':
      return `No puedes continuar: el código ${code} del diagnóstico 3 es igual al diagnóstico 2.`;
    case 'diagnostico2_sin_principal':
      return 'No puedes continuar: debe registrar primero el diagnóstico principal antes del diagnóstico 2.';
    case 'diagnostico3_sin_diagnostico2':
      return 'No puedes continuar: debe registrar primero el diagnóstico 2 (comorbilidad) antes del diagnóstico 3.';
    default:
      return `No puedes continuar: hay un problema con el código CIE-10 ${code}.`;
  }
}

// ============================================================================
// VALIDACIÓN POR SEXO Y EDAD (BASADA EN CATÁLOGO)
// ============================================================================

/**
 * Tipo para issues de validación de sexo/edad
 */
export interface CIE10SexAgeIssue {
  type: 'CIE10_SEX' | 'CIE10_AGE';
  field: 'codigoCIE10Principal' | 'codigosCIE10Complementarios' | 'codigoCIEDiagnostico2' | 'codigoCIEDiagnostico3';
  code: string;
  catalogKeyUsed: string;
  messageInline: string;
  messageToast: string;
}

/**
 * Regla del catálogo CIE-10 (DIAGNOSTICO_SIS)
 */
export interface CIE10Rule {
  key: string;
  lsex: string;
  linf: string | null;
  lsup: string | null;
  /** MT / CP — tipo de personal requerido (cat DGIS) */
  letra?: string | null;
  tipoPersonal1VezCe?: number[];
  tipoPersonalSubsecCe?: number[];
  diaCronicos?: boolean;
  diaCaInfantil?: boolean;
}

export type CatalogAgeUnit = 'D' | 'M' | 'A';

export interface CatalogAgeLimit {
  value: number;
  unit: CatalogAgeUnit;
}

/** Parsea LINF/LSUP a unidades nativas del catálogo. NO/vacío/inválido → null. */
export function parseCatalogAgeLimit(
  value: string | null | undefined,
): CatalogAgeLimit | null {
  if (!value || typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim().toUpperCase();
  if (trimmed === 'NO' || trimmed === '') {
    return null;
  }

  const match = trimmed.match(/^(\d{3})([ADMY])$/);
  if (!match) {
    return null;
  }

  const numericValue = parseInt(match[1], 10);
  if (isNaN(numericValue) || numericValue < 0) {
    return null;
  }

  const rawUnit = match[2];
  const unit: CatalogAgeUnit = rawUnit === 'Y' ? 'A' : (rawUnit as CatalogAgeUnit);
  return { value: numericValue, unit };
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function addCatalogAgeLimit(birthDate: Date, limit: CatalogAgeLimit): Date {
  const result = startOfDay(birthDate);
  if (limit.unit === 'D') {
    result.setDate(result.getDate() + limit.value);
    return result;
  }
  if (limit.unit === 'M') {
    result.setMonth(result.getMonth() + limit.value);
    return result;
  }
  result.setFullYear(result.getFullYear() + limit.value);
  return result;
}

/**
 * Parsea un límite de edad del catálogo CIE-10 a años (legado).
 * Preferir parseCatalogAgeLimit + isAgeAllowedForLinfLsup.
 */
export function parseAgeLimit(value: string | null | undefined): number | null {
  const parsed = parseCatalogAgeLimit(value);
  if (!parsed) {
    if (!value || typeof value !== 'string') {
      return null;
    }
    const trimmed = value.trim().toUpperCase();
    if (trimmed === 'NO' || trimmed === '') {
      return null;
    }
    const numValue = parseInt(trimmed, 10);
    if (!isNaN(numValue) && numValue >= 0 && /^\d+$/.test(trimmed)) {
      return numValue;
    }
    return null;
  }

  switch (parsed.unit) {
    case 'A':
      return parsed.value;
    case 'D':
      return parsed.value / 365.25;
    case 'M':
      return parsed.value / 12;
    default:
      return parsed.value;
  }
}

export type SexoBiologicoGiis = 1 | 2 | 3;

/** LSEX DIAGNOSTICO_SIS: HOMBRE | MUJER | NO. Intersexual no restringe. */
export function isSexAllowedForLsex(
  lsex: string | null | undefined,
  sexoBiologico: SexoBiologicoGiis | null,
): boolean {
  if (sexoBiologico === 3) return true;
  if (!lsex || lsex.trim().toUpperCase() === 'NO') return true;
  if (sexoBiologico === null) return true;

  const lsexUpper = lsex.trim().toUpperCase();
  const sexoLabel =
    sexoBiologico === 1 ? 'HOMBRE' : sexoBiologico === 2 ? 'MUJER' : null;
  if (!sexoLabel) return true;
  if (lsexUpper === 'HOMBRE' || lsexUpper === 'MUJER') {
    return lsexUpper === sexoLabel;
  }
  return true;
}

/**
 * Valida LINF/LSUP por fechas de calendario (unidad D/M/A).
 * Intervalo cerrado: el día exacto del límite es válido.
 */
export function isAgeAllowedForLinfLsup(
  linf: string | null | undefined,
  lsup: string | null | undefined,
  fechaNacimiento: Date | null | undefined,
  fechaNotaMedica: Date | null | undefined,
): boolean {
  if (!fechaNacimiento || !fechaNotaMedica) return true;
  if (isNaN(fechaNacimiento.getTime()) || isNaN(fechaNotaMedica.getTime())) {
    return true;
  }

  const birth = startOfDay(fechaNacimiento);
  const ref = startOfDay(fechaNotaMedica);
  const linfParsed = parseCatalogAgeLimit(linf);
  const lsupParsed = parseCatalogAgeLimit(lsup);

  if (linfParsed) {
    const minDate = addCatalogAgeLimit(birth, linfParsed);
    if (ref.getTime() < minDate.getTime()) return false;
  }
  if (lsupParsed) {
    const maxDate = addCatalogAgeLimit(birth, lsupParsed);
    if (ref.getTime() > maxDate.getTime()) return false;
  }
  return true;
}

/**
 * Calcula la edad en años entre dos fechas
 * 
 * @param fechaNacimiento - Fecha de nacimiento
 * @param fechaReferencia - Fecha de referencia (ej: fecha de la nota médica)
 * @returns Edad en años (float)
 */
export function calculateAge(fechaNacimiento: Date, fechaReferencia: Date): number {
  if (isNaN(fechaNacimiento.getTime()) || isNaN(fechaReferencia.getTime())) {
    return 0;
  }

  let edad = fechaReferencia.getFullYear() - fechaNacimiento.getFullYear();
  const monthDiff = fechaReferencia.getMonth() - fechaNacimiento.getMonth();
  const dayDiff = fechaReferencia.getDate() - fechaNacimiento.getDate();

  // Ajustar si aún no ha cumplido años
  if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
    edad--;
  }

  // Calcular fracción del año para mayor precisión
  // Diferencia en milisegundos
  const diffMs = fechaReferencia.getTime() - fechaNacimiento.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  const edadExacta = diffDays / 365.25;

  return Math.max(0, edadExacta);
}

/**
 * Normaliza el sexo a formato HOMBRE/MUJER
 * 
 * @param sexo - Sexo del trabajador (puede venir en varios formatos)
 * @returns Sexo normalizado o null si es inválido
 */
export function normalizeSexo(sexo: string | null | undefined): 'HOMBRE' | 'MUJER' | 'INTERSEXUAL' | null {
  if (!sexo) {
    return null;
  }

  const normalized = sexo.trim().toLowerCase();

  if (
    normalized === 'masculino' ||
    normalized === 'hombre' ||
    normalized === 'm' ||
    normalized === 'h' ||
    normalized === 'hombres'
  ) {
    return 'HOMBRE';
  }

  if (
    normalized === 'femenino' ||
    normalized === 'mujer' ||
    normalized === 'f' ||
    normalized === 'mujeres'
  ) {
    return 'MUJER';
  }

  if (
    normalized === 'intersexual' ||
    normalized === 'otro' ||
    normalized === 'other' ||
    normalized === '3'
  ) {
    return 'INTERSEXUAL';
  }

  if (normalized === 'HOMBRE' || normalized === 'HOMBRES') {
    return 'HOMBRE';
  }

  if (normalized === 'MUJER' || normalized === 'MUJERES') {
    return 'MUJER';
  }

  return null;
}

const cie10RuleCache = new Map<string, CIE10Rule | null>();

/** Limpia cache de reglas CIE-10 (útil en tests). */
export function clearCIE10RuleCache(): void {
  cie10RuleCache.clear();
}

function mapCatalogEntryToRule(
  entry: {
    code?: string;
    lsex?: string;
    linfRaw?: string | null;
    lsupRaw?: string | null;
    letra?: string | null;
    tipoPersonal1VezCe?: number[];
    tipoPersonalSubsecCe?: number[];
    diaCronicos?: boolean;
    diaCaInfantil?: boolean;
  },
  key: string,
): CIE10Rule {
  return {
    key: entry.code || key,
    lsex: entry.lsex || 'NO',
    linf: entry.linfRaw || null,
    lsup: entry.lsupRaw || null,
    letra: entry.letra ?? null,
    tipoPersonal1VezCe: entry.tipoPersonal1VezCe,
    tipoPersonalSubsecCe: entry.tipoPersonalSubsecCe,
    diaCronicos: entry.diaCronicos ?? false,
    diaCaInfantil: entry.diaCaInfantil ?? false,
  };
}

async function fetchCIE10RuleUncached(normalizedCode: string): Promise<CIE10Rule | null> {
  try {
    try {
      const response = await CatalogsAPI.getCIE10ByCode(normalizedCode);
      if (response.data) {
        return mapCatalogEntryToRule(response.data, normalizedCode);
      }
    } catch {
      // No encontrado con match exacto, continuar con prefijo
    }

    if (normalizedCode.length >= 3) {
      const prefix = normalizedCode.substring(0, 3);
      try {
        const response = await CatalogsAPI.getCIE10ByCode(prefix);
        if (response.data) {
          return mapCatalogEntryToRule(response.data, prefix);
        }
      } catch {
        // No encontrado, retornar null
      }
    }

    return null;
  } catch (error) {
    console.error('Error buscando regla CIE-10:', error);
    return null;
  }
}

/**
 * Busca una regla CIE-10 en el catálogo
 * Primero intenta match exacto por código, luego fallback a prefijo de 3 caracteres
 *
 * @param code - Código CIE-10 a buscar (ej: "C530" o "C53")
 * @returns Regla encontrada o null si no existe
 */
export async function findCIE10Rule(code: string): Promise<CIE10Rule | null> {
  if (!code) {
    return null;
  }

  const normalizedCode = code.trim().toUpperCase();
  if (cie10RuleCache.has(normalizedCode)) {
    return cie10RuleCache.get(normalizedCode) ?? null;
  }

  const result = await fetchCIE10RuleUncached(normalizedCode);
  cie10RuleCache.set(normalizedCode, result);
  return result;
}

/**
 * Parámetros para validación de sexo/edad
 */
export interface CIE10SexAgeValidationParams {
  codigoCIE10Principal?: string | null;
  codigosCIE10Complementarios?: (string | null)[] | null;
  codigoCIEDiagnostico2?: string | null;
  codigoCIEDiagnostico3?: string | null;
  trabajadorSexo: string;
  trabajadorFechaNacimiento: Date;
  fechaNotaMedica: Date;
}

/**
 * Valida códigos CIE-10 contra restricciones de sexo (LSEX) y edad (LINF/LSUP)
 * 
 * @param params - Parámetros de validación
 * @returns Array de issues encontrados
 */
export async function validateCIE10SexAge(
  params: CIE10SexAgeValidationParams
): Promise<CIE10SexAgeIssue[]> {
  const issues: CIE10SexAgeIssue[] = [];

  // Normalizar datos del trabajador
  const sexoTrabajador = normalizeSexo(params.trabajadorSexo);
  if (!sexoTrabajador) {
    // Si no se puede normalizar el sexo, no validar (UX neutra)
    return [];
  }

  const edadTrabajador = calculateAge(params.trabajadorFechaNacimiento, params.fechaNotaMedica);

  // Función helper para validar un código
  const validateCode = async (
    code: string | null | undefined,
    field: 'codigoCIE10Principal' | 'codigosCIE10Complementarios' | 'codigoCIEDiagnostico2' | 'codigoCIEDiagnostico3'
  ): Promise<void> => {
    if (!code) return;

    const extractedCode = extractCIE10Code(code);
    if (!extractedCode) return;

    const rule = await findCIE10Rule(extractedCode);
    if (!rule) {
      // Si no hay regla, no bloquear (UX neutra)
      return;
    }

    const sexoBiologico: SexoBiologicoGiis | null =
      sexoTrabajador === 'HOMBRE' ? 1 : sexoTrabajador === 'MUJER' ? 2 : 3;
    const sexoViolation =
      sexoTrabajador !== 'INTERSEXUAL' &&
      !isSexAllowedForLsex(rule.lsex, sexoBiologico);

    const edadViolation = !isAgeAllowedForLinfLsup(
      rule.linf,
      rule.lsup,
      params.trabajadorFechaNacimiento,
      params.fechaNotaMedica,
    );

    // Crear issues si hay violaciones
    if (sexoViolation || edadViolation) {
      let messageInline = '';
      let messageToast = '';

      if (sexoViolation && edadViolation) {
        messageInline = 'Este diagnóstico no aplica para el sexo o la edad del trabajador.';
        messageToast = `No puedes continuar: el diagnóstico ${extractedCode} no aplica para ${sexoTrabajador} de ${Math.floor(edadTrabajador)} años (restricción por sexo y edad fuera de rango).`;
      } else if (sexoViolation) {
        messageInline = 'Este diagnóstico no aplica para el sexo del trabajador.';
        messageToast = `No puedes continuar: el diagnóstico ${extractedCode} no aplica para ${sexoTrabajador} (restricción por sexo).`;
      } else {
        messageInline = 'Este diagnóstico no aplica para la edad del trabajador.';
        const edadFormatted = Math.floor(edadTrabajador);
        messageToast = `No puedes continuar: el diagnóstico ${extractedCode} no aplica para ${sexoTrabajador} de ${edadFormatted} años (edad fuera de rango).`;
      }

      issues.push({
        type: sexoViolation ? 'CIE10_SEX' : 'CIE10_AGE',
        field,
        code: extractedCode,
        catalogKeyUsed: rule.key,
        messageInline,
        messageToast,
      });
    }
  };

  // Validar diagnóstico principal
  await validateCode(params.codigoCIE10Principal, 'codigoCIE10Principal');

  // Validar diagnósticos complementarios
  if (params.codigosCIE10Complementarios && Array.isArray(params.codigosCIE10Complementarios)) {
    for (const compCode of params.codigosCIE10Complementarios) {
      await validateCode(compCode, 'codigosCIE10Complementarios');
    }
  }

  // Validar diagnóstico 2
  await validateCode(params.codigoCIEDiagnostico2, 'codigoCIEDiagnostico2');

  // Validar diagnóstico 3
  await validateCode(params.codigoCIEDiagnostico3, 'codigoCIEDiagnostico3');

  return issues;
}

