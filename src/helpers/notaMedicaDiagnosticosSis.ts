/**
 * Validaciones DIAGNOSTICO_SIS para codigoCIEDiagnostico1 (principal) y diag. 2/3 (nota médica).
 * Bloqueo en submit (frontend).
 */

import MedicoFirmanteAPI from '@/api/MedicoFirmanteAPI';
import EnfermeraFirmanteAPI from '@/api/EnfermeraFirmanteAPI';
import { getCexCatalogCodes } from '@/helpers/cexCatalogCodes';
import {
  pasoDiagPrincipal,
  pasoDiag2,
  pasoDiag3,
} from '@/helpers/notaMedicaStepMap';
import {
  getRamazziniLetraBlockMessage,
  resolveRamazziniLetraFueraDeAlcance,
} from '@/helpers/cie10RamazziniScope';
import {
  extractCIE10Code,
  normalizeCIE10Code,
  findCIE10Rule,
  isR69XFamily,
  validateCIE10SexAge,
  type CIE10SexAgeValidationParams,
} from './cie10';

/** Médico firmante; la inferencia de tipo personal replica expedientes/helpers/firmante-helper.ts (CEX). */
export type MedicoFirmanteLike = {
  especialistaSaludTrabajo?: string | boolean;
} | null;

/** Presencia de enfermera firmante (sin médico) → tipo personal enfermera en CEX. */
export type EnfermeraFirmanteLike = Record<string, unknown> | null;

export interface ValidateNotaMedicaDiagnosticosSisParams {
  formData: Record<string, unknown>;
  trabajadorSexo: string;
  trabajadorFechaNacimiento: Date;
  fechaNotaMedica: Date;
  medicoFirmante: MedicoFirmanteLike;
  enfermeraFirmante?: EnfermeraFirmanteLike;
  /** Si true, pasos de diagnóstico según SIRES; si false, flujo corto */
  showSiresUI: boolean;
  /** Si true, incluye step de embarazo (SIRES + mujer) */
  esMujer?: boolean;
}

export interface ValidateNotaMedicaDiagnosticosSisResult {
  ok: boolean;
  messageToast?: string;
  /** Mensaje corto para mostrar inline en el step */
  messageInline?: string;
  paso?: number;
}

function extractCode(value: unknown): string {
  if (value == null || value === undefined) return '';
  return extractCIE10Code(String(value)) || '';
}

/** Código CIE 4 caracteres sin punto, mayúsculas. Vacío si inválido. */
function norm4Chars(value: unknown): string {
  const raw = extractCode(value);
  if (!raw.trim()) return '';
  const n = normalizeCIE10Code(raw) || raw.trim().toUpperCase();
  const w = n.replace(/\./g, '').toUpperCase();
  return /^[A-Z0-9]{4}$/.test(w) ? w : '';
}

/** Índice 1-based en el stepper de nota médica: Step10 (diag. 2). */
function pasoDiag2Local(showSires: boolean, esMujer = false): number {
  return pasoDiag2(showSires, esMujer);
}

/** Índice 1-based: Step11 (diag. 3). */
function pasoDiag3Local(showSires: boolean, esMujer = false): number {
  return pasoDiag3(showSires, esMujer);
}

function pasoDiagPrincipalLocal(showSires: boolean, esMujer = false): number {
  return pasoDiagPrincipal(showSires, esMujer);
}

/**
 * Tipo efectivo DGIS para validación LETRA (MT/CP), alineado con
 * backend expedientes/helpers/firmante-helper.ts → getPrestadorDataFromUser.
 */
export async function resolveEffectiveTipoPersonalDgis(
  medico: MedicoFirmanteLike,
  enfermera: EnfermeraFirmanteLike | undefined,
): Promise<{
  source: 'medico_infer' | 'enfermera_infer' | 'none';
  value: number | null;
}> {
  const codes = await getCexCatalogCodes();
  if (medico) {
    const esp = medico.especialistaSaludTrabajo;
    const value =
      esp === 'Si' || esp === true
        ? codes.tipoPersonal.medicoEspecialista
        : codes.tipoPersonal.medicoGeneral;
    return { source: 'medico_infer', value };
  }
  if (enfermera && typeof enfermera === 'object') {
    return {
      source: 'enfermera_infer',
      value: codes.tipoPersonal.enfermera,
    };
  }
  return { source: 'none', value: null };
}

function normalizeFirmanteApi(body: unknown): Record<string, unknown> | null {
  if (!body || typeof body !== 'object') return null;
  const b = body as Record<string, unknown>;
  if (b._id) return b;
  if (b.data && typeof b.data === 'object' && (b.data as Record<string, unknown>)._id) {
    return b.data as Record<string, unknown>;
  }
  return null;
}

/** Obtiene firmante médico o enfermera del usuario (para validar tipoPersonal CEX). */
export async function fetchMedicoEnfermeraFirmantes(userId: string | undefined): Promise<{
  medicoFirmante: MedicoFirmanteLike;
  enfermeraFirmante: EnfermeraFirmanteLike;
}> {
  let medicoFirmante: MedicoFirmanteLike = null;
  let enfermeraFirmante: EnfermeraFirmanteLike = null;
  if (!userId) return { medicoFirmante, enfermeraFirmante };

  try {
    const { data: medicoBody } = await MedicoFirmanteAPI.getMedicoFirmanteByUserId(userId);
    medicoFirmante = normalizeFirmanteApi(medicoBody) as MedicoFirmanteLike;
  } catch {
    medicoFirmante = null;
  }
  if (!medicoFirmante) {
    try {
      const { data: enfBody } = await EnfermeraFirmanteAPI.getEnfermeraFirmanteByUserId(userId);
      enfermeraFirmante = normalizeFirmanteApi(enfBody) as EnfermeraFirmanteLike;
    } catch {
      enfermeraFirmante = null;
    }
  }
  return { medicoFirmante, enfermeraFirmante };
}

function fail(
  paso: number,
  messageToast: string,
  messageInline?: string,
): ValidateNotaMedicaDiagnosticosSisResult {
  return {
    ok: false,
    messageToast,
    messageInline: messageInline ?? messageToast,
    paso,
  };
}

function failPrincipal(
  paso: number,
  messageToast: string,
  messageInline?: string,
): ValidateNotaMedicaDiagnosticosSisResult {
  return fail(paso, messageToast, messageInline);
}

/** -1=no aplica, 0/1=activo (solo validación interna). */
function normalizePrimeraVez(value: unknown): -1 | 0 | 1 {
  if (value === 0 || value === 1) return value;
  return -1;
}

/** true solo cuando el usuario registró comorbilidad (primera vez 0 o 1). */
export function isPrimeraVezComorbilidadActiva(value: unknown): value is 0 | 1 {
  return value === 0 || value === 1;
}

export function tieneComorbilidadDiagRegistrada(
  primeraVez: unknown,
  codigo?: unknown,
): boolean {
  if (isPrimeraVezComorbilidadActiva(primeraVez)) return true;
  const code = typeof codigo === 'string' ? codigo.trim() : '';
  return code.length > 0;
}

function limpiarCamposComorbilidadSinRegistrar(
  formData: Record<string, unknown>,
  label: '2' | '3',
): void {
  const pvKey =
    label === '2' ? 'primeraVezDiagnostico2' : 'primeraVezDiagnostico3';
  const codeKey =
    label === '2' ? 'codigoCIEDiagnostico2' : 'codigoCIEDiagnostico3';
  const confKey =
    label === '2' ? 'confirmacionDiagnostica2' : 'confirmacionDiagnostica3';

  delete formData[pvKey];
  formData[codeKey] = '';
  delete formData[confKey];
  if (label === '2') {
    delete formData.diagnosticoTexto;
  }
  if (label === '3') {
    delete formData.diagnosticoTexto3;
  }
}

/**
 * Limpia diag. 2/3 cuando no hay comorbilidad registrada.
 * SIRES: requiere primeraVez 0/1. SIN_REGIMEN: basta código CIE-10.
 */
export function normalizeNotaMedicaDiagnosticosPv(
  formData: Record<string, unknown>,
  showSiresUI = true,
): void {
  const diag2Activo = showSiresUI
    ? isPrimeraVezComorbilidadActiva(formData.primeraVezDiagnostico2)
    : tieneComorbilidadDiagRegistrada(
        formData.primeraVezDiagnostico2,
        formData.codigoCIEDiagnostico2,
      );
  const diag3Activo = showSiresUI
    ? isPrimeraVezComorbilidadActiva(formData.primeraVezDiagnostico3)
    : tieneComorbilidadDiagRegistrada(
        formData.primeraVezDiagnostico3,
        formData.codigoCIEDiagnostico3,
      );

  if (!diag2Activo) {
    limpiarCamposComorbilidadSinRegistrar(formData, '2');
  } else if (!showSiresUI) {
    delete formData.primeraVezDiagnostico2;
    delete formData.confirmacionDiagnostica2;
  }

  if (!diag3Activo) {
    limpiarCamposComorbilidadSinRegistrar(formData, '3');
  } else if (!showSiresUI) {
    delete formData.primeraVezDiagnostico3;
    delete formData.confirmacionDiagnostica3;
  }
}

async function validateSexAgeForField(
  params: ValidateNotaMedicaDiagnosticosSisParams,
  field:
    | 'codigoCIE10Principal'
    | 'codigoCIEDiagnostico2'
    | 'codigoCIEDiagnostico3',
  codeValue: string | undefined,
): Promise<ValidateNotaMedicaDiagnosticosSisResult | null> {
  if (!codeValue?.trim()) return null;

  const sexAgeParams: CIE10SexAgeValidationParams = {
    trabajadorSexo: params.trabajadorSexo,
    trabajadorFechaNacimiento: params.trabajadorFechaNacimiento,
    fechaNotaMedica: params.fechaNotaMedica,
  };
  if (field === 'codigoCIE10Principal') {
    sexAgeParams.codigoCIE10Principal = codeValue;
  } else if (field === 'codigoCIEDiagnostico2') {
    sexAgeParams.codigoCIEDiagnostico2 = codeValue;
  } else {
    sexAgeParams.codigoCIEDiagnostico3 = codeValue;
  }

  const issues = await validateCIE10SexAge(sexAgeParams);
  const issue = issues.find((i) => i.field === field);
  if (!issue) return null;

  const paso =
    field === 'codigoCIEDiagnostico3'
      ? pasoDiag3Local(params.showSiresUI, params.esMujer === true)
      : field === 'codigoCIEDiagnostico2'
        ? pasoDiag2Local(params.showSiresUI, params.esMujer === true)
        : pasoDiagPrincipalLocal(params.showSiresUI, params.esMujer === true);

  return fail(paso, issue.messageToast, issue.messageInline);
}

async function catalogEntryExists(code: string): Promise<boolean> {
  const key = norm4Chars(code);
  if (!key) return false;
  const rule = await findCIE10Rule(key);
  return rule !== null;
}

function tipoPersonalLabel(code: number, codes: Awaited<ReturnType<typeof getCexCatalogCodes>>): string {
  if (code === codes.tipoPersonal.medicoGeneral) return 'médica/o general';
  if (code === codes.tipoPersonal.medicoEspecialista) return 'médica/o especialista';
  if (code === codes.tipoPersonal.enfermera) return 'enfermera/o';
  return String(code);
}

function parseTipoPersonalCeList(raw: unknown): number[] {
  if (raw == null) return [];
  if (Array.isArray(raw)) {
    return raw.map((v) => Number(v)).filter((n) => !Number.isNaN(n));
  }
  if (typeof raw !== 'string') return [];
  const trimmed = raw.trim().toUpperCase();
  if (trimmed === '' || trimmed === 'NO') return [];
  return trimmed
    .split(',')
    .map((s) => parseInt(s.trim(), 10))
    .filter((n) => !Number.isNaN(n));
}

export function isTipoPersonalAllowedForDiagnostico1(
  relacionTemporal: unknown,
  tipoPersonal: number | null,
  tipoPersonal1VezCe: number[],
  tipoPersonalSubsecCe: number[],
): {
  allowed: boolean;
  requiresTipoPersonal: boolean;
  emptyAuthorizedList: boolean;
} {
  const rt = typeof relacionTemporal === 'number' ? relacionTemporal : null;
  if (rt !== 0 && rt !== 1) {
    return {
      allowed: true,
      requiresTipoPersonal: false,
      emptyAuthorizedList: false,
    };
  }
  const list = rt === 0 ? tipoPersonal1VezCe : tipoPersonalSubsecCe;
  if (list.length === 0) {
    return {
      allowed: false,
      requiresTipoPersonal: true,
      emptyAuthorizedList: true,
    };
  }
  if (tipoPersonal == null) {
    return {
      allowed: false,
      requiresTipoPersonal: true,
      emptyAuthorizedList: false,
    };
  }
  return {
    allowed: list.includes(tipoPersonal),
    requiresTipoPersonal: true,
    emptyAuthorizedList: false,
  };
}

function failRamazziniLetraScope(
  paso: number,
  letra: 'MT' | 'CP',
  catalogKey: string,
  contextLabel: string,
): ValidateNotaMedicaDiagnosticosSisResult {
  const message = getRamazziniLetraBlockMessage(letra, catalogKey, contextLabel);
  return fail(paso, message, message);
}

function checkRamazziniLetraScope(
  paso: number,
  catalogKey: string,
  letra: string | null | undefined,
  contextLabel: string,
): ValidateNotaMedicaDiagnosticosSisResult | null {
  const blocked = resolveRamazziniLetraFueraDeAlcance(catalogKey, letra);
  if (!blocked) return null;
  return failRamazziniLetraScope(paso, blocked, catalogKey, contextLabel);
}

async function validateDiagnostico23Core(
  params: ValidateNotaMedicaDiagnosticosSisParams,
  label: '2' | '3',
  cexCodes: Awaited<ReturnType<typeof getCexCatalogCodes>>,
  tipoRes: Awaited<ReturnType<typeof resolveEffectiveTipoPersonalDgis>>,
): Promise<ValidateNotaMedicaDiagnosticosSisResult | null> {
  const p = params.formData;
  const paso =
    label === '2'
      ? pasoDiag2Local(params.showSiresUI, params.esMujer === true)
      : pasoDiag3Local(params.showSiresUI, params.esMujer === true);
  const pvKey = label === '2' ? 'primeraVezDiagnostico2' : 'primeraVezDiagnostico3';
  const codeKey = label === '2' ? 'codigoCIEDiagnostico2' : 'codigoCIEDiagnostico3';
  const pv = normalizePrimeraVez(p[pvKey]);
  const codeRaw = extractCode(p[codeKey]);

  if (!params.showSiresUI) {
    if (!codeRaw.trim()) {
      return null;
    }

    if (
      label === '2' &&
      !extractCode(p.codigoCIE10Principal)
    ) {
      return fail(
        paso,
        'No puede registrar el diagnóstico 2 sin haber registrado antes el diagnóstico principal.',
        'Debe registrar primero el diagnóstico principal antes del diagnóstico 2.',
      );
    }

    if (
      label === '3' &&
      !tieneComorbilidadDiagRegistrada(
        p.primeraVezDiagnostico2,
        p.codigoCIEDiagnostico2,
      )
    ) {
      return fail(
        paso,
        'No puede registrar el diagnóstico 3 sin haber registrado antes el diagnóstico 2 (comorbilidad).',
        'Debe registrar primero el diagnóstico 2 antes del diagnóstico 3.',
      );
    }
  } else if (pv === -1) {
    if (codeRaw.trim()) {
      return fail(
        paso,
        `Si el diagnóstico ${label} no aplica (primera vez = No aplica), el código CIE-10 debe estar vacío.`,
      );
    }
    return null;
  }

  if (
    params.showSiresUI &&
    label === '2' &&
    !extractCode(p.codigoCIE10Principal)
  ) {
    return fail(
      paso,
      'No puede registrar el diagnóstico 2 sin haber registrado antes el diagnóstico principal.',
      'Debe registrar primero el diagnóstico principal antes del diagnóstico 2.',
    );
  }

  if (
    params.showSiresUI &&
    label === '3' &&
    !isPrimeraVezComorbilidadActiva(p.primeraVezDiagnostico2)
  ) {
    return fail(
      paso,
      'No puede registrar el diagnóstico 3 sin haber registrado antes el diagnóstico 2 (comorbilidad).',
      'Debe registrar primero el diagnóstico 2 antes del diagnóstico 3.',
    );
  }

  if (!codeRaw.trim()) {
    const msg = params.showSiresUI
      ? `El código CIE-10 diagnóstico ${label} es obligatorio cuando se registra comorbilidad (primera vez 0 o 1).`
      : `Debe registrar un código CIE-10 para el diagnóstico ${label}.`;
    return fail(paso, msg, msg);
  }

  const norm = norm4Chars(codeRaw);
  if (!norm) {
    return fail(
      paso,
      `Diagnóstico ${label}: el código CIE-10 debe tener exactamente 4 caracteres.`,
      'El código CIE-10 debe tener exactamente 4 caracteres.',
    );
  }

  const exists = await catalogEntryExists(codeRaw);
  if (!exists) {
    return fail(
      paso,
      `Diagnóstico ${label}: el código ${norm} no está en el catálogo DIAGNOSTICO_SIS.`,
      `El código ${norm} no está en el catálogo DIAGNOSTICO_SIS.`,
    );
  }

  const diag1Norm = norm4Chars(p.codigoCIE10Principal);
  if (diag1Norm && norm === diag1Norm && !isR69XFamily(p.codigoCIE10Principal as string)) {
    return fail(
      paso,
      `El diagnóstico ${label} debe ser diferente al diagnóstico principal.`,
      `El diagnóstico ${label} debe ser diferente al diagnóstico principal.`,
    );
  }

  if (label === '3') {
    const diag2Norm = norm4Chars(p.codigoCIEDiagnostico2);
    if (diag2Norm && norm === diag2Norm && !isR69XFamily(p.codigoCIEDiagnostico2 as string)) {
      return fail(
        paso,
        'El diagnóstico 3 debe ser diferente al diagnóstico 2.',
        'El diagnóstico 3 debe ser diferente al diagnóstico 2.',
      );
    }
  }

  const rule = await findCIE10Rule(norm);
  const scopeBlock = checkRamazziniLetraScope(
    paso,
    norm,
    rule?.letra,
    `Diagnóstico ${label}`,
  );
  if (scopeBlock) return scopeBlock;

  const sexAge = await validateSexAgeForField(
    params,
    codeKey,
    (p[codeKey] as string) || undefined,
  );
  if (sexAge) return sexAge;

  return null;
}

export async function validateDiagnostico2Sis(
  params: ValidateNotaMedicaDiagnosticosSisParams,
): Promise<ValidateNotaMedicaDiagnosticosSisResult> {
  const cexCodes = await getCexCatalogCodes();
  const tipoRes = await resolveEffectiveTipoPersonalDgis(
    params.medicoFirmante,
    params.enfermeraFirmante,
  );
  const result = await validateDiagnostico23Core(params, '2', cexCodes, tipoRes);
  return result ?? { ok: true };
}

export async function validateDiagnostico3Sis(
  params: ValidateNotaMedicaDiagnosticosSisParams,
): Promise<ValidateNotaMedicaDiagnosticosSisResult> {
  const cexCodes = await getCexCatalogCodes();
  const tipoRes = await resolveEffectiveTipoPersonalDgis(
    params.medicoFirmante,
    params.enfermeraFirmante,
  );
  const result = await validateDiagnostico23Core(params, '3', cexCodes, tipoRes);
  return result ?? { ok: true };
}

async function validateDiagnosticoPrincipal(
  params: ValidateNotaMedicaDiagnosticosSisParams,
  cexCodes: Awaited<ReturnType<typeof getCexCatalogCodes>>,
  tipoRes: Awaited<ReturnType<typeof resolveEffectiveTipoPersonalDgis>>,
): Promise<ValidateNotaMedicaDiagnosticosSisResult | null> {
  const p = params.formData;
  const pasoPrinc = pasoDiagPrincipalLocal(params.showSiresUI, params.esMujer === true);
  const codeRaw = extractCode(p.codigoCIE10Principal);
  if (!codeRaw.trim()) return null;

  if (params.showSiresUI) {
    const rt = p.relacionTemporal;
    if (rt !== 0 && rt !== 1) {
      return failPrincipal(
        pasoPrinc,
        'Debe seleccionar la relación temporal (Primera vez o Subsecuente) para el diagnóstico principal.',
      );
    }
  }

  const norm = norm4Chars(codeRaw);
  if (!norm) {
    return failPrincipal(
      pasoPrinc,
      'Diagnóstico principal: el código CIE-10 debe tener exactamente 4 caracteres.',
      'El código CIE-10 debe tener exactamente 4 caracteres.',
    );
  }

  const exists = await catalogEntryExists(codeRaw);
  if (!exists) {
    return failPrincipal(
      pasoPrinc,
      `Diagnóstico principal: el código ${norm} no está en el catálogo DIAGNOSTICO_SIS.`,
      `El código ${norm} no está en el catálogo DIAGNOSTICO_SIS.`,
    );
  }

  const rule = await findCIE10Rule(norm);
  const scopeBlock = checkRamazziniLetraScope(
    pasoPrinc,
    norm,
    rule?.letra,
    'Diagnóstico principal',
  );
  if (scopeBlock) return scopeBlock;

  if (rule && params.showSiresUI) {
    const list1 = rule.tipoPersonal1VezCe ?? parseTipoPersonalCeList(rule.tipoPersonal1VezCe);
    const list2 = rule.tipoPersonalSubsecCe ?? parseTipoPersonalCeList(rule.tipoPersonalSubsecCe);
    const tpCheck = isTipoPersonalAllowedForDiagnostico1(
      p.relacionTemporal,
      tipoRes.value,
      list1,
      list2,
    );
    if (!tpCheck.allowed) {
      const temporalLabel = p.relacionTemporal === 1 ? 'subsecuente' : 'primera vez';
      if (tpCheck.emptyAuthorizedList) {
        return failPrincipal(
          pasoPrinc,
          `El diagnóstico principal (${norm}) no autoriza ningún tipo de personal en relación temporal ${temporalLabel}.`,
          `Este diagnóstico no autoriza ningún tipo de personal (${temporalLabel}).`,
        );
      }
      if (tpCheck.requiresTipoPersonal && tipoRes.value == null) {
        return failPrincipal(
          pasoPrinc,
          `El diagnóstico principal (${norm}) requiere un firmante médico o de enfermería registrado para validar el tipo de personal (${temporalLabel}).`,
          'El tipo de personal del firmante no puede validarse. Registre un médico o enfermera firmante.',
        );
      }
      return failPrincipal(
        pasoPrinc,
        `El tipo de personal (${tipoPersonalLabel(tipoRes.value!, cexCodes)}) no está autorizado para el diagnóstico ${norm} en relación temporal ${temporalLabel}.`,
        `El tipo de personal (${tipoPersonalLabel(tipoRes.value!, cexCodes)}) no está autorizado para este diagnóstico (${temporalLabel}).`,
      );
    }
  }

  return null;
}

/**
 * Valida solo el diagnóstico principal (codigoCIEDiagnostico1 / codigoCIE10Principal).
 * Útil para validación inline en Step9 y bloqueo en submit.
 */
export async function validateDiagnosticoPrincipalSis(
  params: ValidateNotaMedicaDiagnosticosSisParams,
): Promise<ValidateNotaMedicaDiagnosticosSisResult> {
  const cexCodes = await getCexCatalogCodes();
  const tipoRes = await resolveEffectiveTipoPersonalDgis(
    params.medicoFirmante,
    params.enfermeraFirmante,
  );
  const principal = await validateDiagnosticoPrincipal(params, cexCodes, tipoRes);
  if (principal) return principal;

  const p = params.formData;
  const codeRaw = extractCode(p.codigoCIE10Principal);
  if (!codeRaw.trim()) return { ok: true };

  const sexAge = await validateSexAgeForField(
    params,
    'codigoCIE10Principal',
    (p.codigoCIE10Principal as string) || undefined,
  );
  if (sexAge) return sexAge;

  return { ok: true };
}

/**
 * Valida reglas DIAGNOSTICO_SIS para diagnóstico principal, 2 y 3.
 */
export async function validateNotaMedicaDiagnosticos2Y3(
  params: ValidateNotaMedicaDiagnosticosSisParams,
): Promise<ValidateNotaMedicaDiagnosticosSisResult> {
  const principalResult = await validateDiagnosticoPrincipalSis(params);
  if (!principalResult.ok) return principalResult;

  const diag2Result = await validateDiagnostico2Sis(params);
  if (!diag2Result.ok) return diag2Result;

  const diag3Result = await validateDiagnostico3Sis(params);
  if (!diag3Result.ok) return diag3Result;

  return { ok: true };
}
