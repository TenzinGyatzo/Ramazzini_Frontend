/**
 * Reglas CEX confirmacionDiagnostica1/2/3 (Fe de Erratas GIIS-B015).
 */

import { findCIE10Rule, extractCIE10Code } from './cie10';
import {
  resolveEffectiveTipoPersonalDgis,
  type MedicoFirmanteLike,
  type EnfermeraFirmanteLike,
} from './notaMedicaDiagnosticosSis';
import {
  pasoDiagPrincipal,
  pasoDiag2,
  pasoDiag3,
} from './notaMedicaStepMap';

export const TIPO_PERSONAL_MEDICO_CONFIRMACION = [1, 2, 3, 4, 19, 24] as const;

export interface DiagCatalogFlags {
  diaCronicos: boolean;
  diaCaInfantil: boolean;
}

export function parseCatalogSiFlag(raw: unknown): boolean {
  if (typeof raw === 'boolean') return raw;
  if (raw == null) return false;
  return String(raw).trim().toUpperCase() === 'SI';
}

export function isTipoPersonalMedicoConfirmacion(
  tipoPersonal: number | null | undefined,
): boolean {
  if (tipoPersonal == null) return false;
  return (TIPO_PERSONAL_MEDICO_CONFIRMACION as readonly number[]).includes(
    tipoPersonal,
  );
}

export function calcularEdadAnios(
  fechaNacimiento?: Date | null,
  fechaReferencia?: Date | null,
): number | null {
  if (!fechaNacimiento || !fechaReferencia) return null;
  const fn = new Date(fechaNacimiento);
  const fr = new Date(fechaReferencia);
  if (isNaN(fn.getTime()) || isNaN(fr.getTime())) return null;
  let edad = fr.getFullYear() - fn.getFullYear();
  const m = fr.getMonth() - fn.getMonth();
  if (m < 0 || (m === 0 && fr.getDate() < fn.getDate())) edad--;
  return edad;
}

export async function resolveDiagCatalogFlags(
  code: string | null | undefined,
): Promise<DiagCatalogFlags | null> {
  const normalized = extractCIE10Code(code ?? '');
  if (!normalized) return null;
  const rule = await findCIE10Rule(normalized);
  if (!rule) return null;
  return {
    diaCronicos: rule.diaCronicos ?? false,
    diaCaInfantil: rule.diaCaInfantil ?? false,
  };
}

export function aplicaConfirmacionDiagnostico1(params: {
  tipoPersonal: number | null | undefined;
  edad: number | null;
  flags: DiagCatalogFlags | null | undefined;
  relacionTemporal: number | null | undefined;
}): boolean {
  if (!isTipoPersonalMedicoConfirmacion(params.tipoPersonal)) return false;
  if (params.edad == null || !params.flags) return false;
  if (params.edad < 18) return params.flags.diaCaInfantil;
  if (params.edad >= 20) {
    return params.relacionTemporal === 0 && params.flags.diaCronicos;
  }
  return false;
}

export function aplicaConfirmacionDiagnostico23(params: {
  tipoPersonal: number | null | undefined;
  edad: number | null;
  flags: DiagCatalogFlags | null | undefined;
  primeraVezDiagnostico: number | null | undefined;
}): boolean {
  if (!isTipoPersonalMedicoConfirmacion(params.tipoPersonal)) return false;
  if (params.edad == null || !params.flags) return false;
  if (params.edad < 18) return params.flags.diaCaInfantil;
  if (params.edad >= 20) {
    return params.primeraVezDiagnostico === 1 && params.flags.diaCronicos;
  }
  return false;
}

export interface ValidateConfirmacionParams {
  formData: Record<string, unknown>;
  trabajadorFechaNacimiento: Date;
  fechaNotaMedica: Date;
  medicoFirmante: MedicoFirmanteLike;
  enfermeraFirmante?: EnfermeraFirmanteLike;
  showSiresUI: boolean;
  esMujer?: boolean;
}

export interface ValidateConfirmacionResult {
  ok: boolean;
  messageToast?: string;
  paso?: number;
}

function confirmacionFieldKey(slot: 1 | 2 | 3): string {
  if (slot === 1) return 'confirmacionDiagnostica';
  if (slot === 2) return 'confirmacionDiagnostica2';
  return 'confirmacionDiagnostica3';
}

function pasoForSlot(
  slot: 1 | 2 | 3,
  showSires: boolean,
  esMujer: boolean,
): number {
  if (slot === 1) return pasoDiagPrincipal(showSires, esMujer);
  if (slot === 2) return pasoDiag2(showSires, esMujer);
  return pasoDiag3(showSires, esMujer);
}

async function validateSlot(
  slot: 1 | 2 | 3,
  params: ValidateConfirmacionParams,
  tipoPersonal: number | null,
  edad: number | null,
): Promise<ValidateConfirmacionResult | null> {
  const p = params.formData;
  const esMujer = params.esMujer === true;
  const paso = pasoForSlot(slot, params.showSiresUI, esMujer);
  const field = confirmacionFieldKey(slot);
  const valor = p[field];

  let codigo = '';
  let aplica = false;

  if (slot === 1) {
    codigo = extractCIE10Code(String(p.codigoCIE10Principal ?? ''));
    const flags = codigo ? await resolveDiagCatalogFlags(codigo) : null;
    aplica = aplicaConfirmacionDiagnostico1({
      tipoPersonal,
      edad,
      flags,
      relacionTemporal:
        typeof p.relacionTemporal === 'number' ? p.relacionTemporal : null,
    });
  } else if (slot === 2) {
    codigo = extractCIE10Code(String(p.codigoCIEDiagnostico2 ?? ''));
    const flags = codigo ? await resolveDiagCatalogFlags(codigo) : null;
    aplica = aplicaConfirmacionDiagnostico23({
      tipoPersonal,
      edad,
      flags,
      primeraVezDiagnostico:
        typeof p.primeraVezDiagnostico2 === 'number'
          ? p.primeraVezDiagnostico2
          : null,
    });
  } else {
    codigo = extractCIE10Code(String(p.codigoCIEDiagnostico3 ?? ''));
    const flags = codigo ? await resolveDiagCatalogFlags(codigo) : null;
    aplica = aplicaConfirmacionDiagnostico23({
      tipoPersonal,
      edad,
      flags,
      primeraVezDiagnostico:
        typeof p.primeraVezDiagnostico3 === 'number'
          ? p.primeraVezDiagnostico3
          : null,
    });
  }

  if (aplica) {
    if (valor !== true && valor !== false) {
      const label =
        slot === 1 ? 'Confirmación diagnóstica' : `Confirmación diagnóstica ${slot}`;
      return {
        ok: false,
        messageToast: `${label}: debe indicar Sí o No según la normativa CEX.`,
        paso,
      };
    }
    return null;
  }

  if (valor !== undefined && valor !== null) {
    return {
      ok: false,
      messageToast: `${field}: no aplica y debe omitirse.`,
      paso,
    };
  }

  return null;
}

/** Normaliza confirmacionDiagnostica* cuando no aplican (undefined, no -1). */
export async function normalizeNotaMedicaConfirmacionDiagnostica(
  formData: Record<string, unknown>,
  opts: {
    trabajadorFechaNacimiento: Date;
    fechaNotaMedica: Date;
    medicoFirmante: MedicoFirmanteLike;
    enfermeraFirmante?: EnfermeraFirmanteLike;
  },
): Promise<void> {
  const tipoRes = await resolveEffectiveTipoPersonalDgis(
    opts.medicoFirmante,
    opts.enfermeraFirmante,
  );
  const edad = calcularEdadAnios(
    opts.trabajadorFechaNacimiento,
    opts.fechaNotaMedica,
  );

  for (const slot of [1, 2, 3] as const) {
    const field = confirmacionFieldKey(slot);
    let aplica = false;

    if (slot === 1) {
      const codigo = extractCIE10Code(String(formData.codigoCIE10Principal ?? ''));
      const flags = codigo ? await resolveDiagCatalogFlags(codigo) : null;
      aplica = aplicaConfirmacionDiagnostico1({
        tipoPersonal: tipoRes.value,
        edad,
        flags,
        relacionTemporal:
          typeof formData.relacionTemporal === 'number'
            ? formData.relacionTemporal
            : null,
      });
    } else if (slot === 2) {
      const codigo = extractCIE10Code(String(formData.codigoCIEDiagnostico2 ?? ''));
      const flags = codigo ? await resolveDiagCatalogFlags(codigo) : null;
      aplica = aplicaConfirmacionDiagnostico23({
        tipoPersonal: tipoRes.value,
        edad,
        flags,
        primeraVezDiagnostico:
          typeof formData.primeraVezDiagnostico2 === 'number'
            ? formData.primeraVezDiagnostico2
            : null,
      });
    } else {
      const codigo = extractCIE10Code(String(formData.codigoCIEDiagnostico3 ?? ''));
      const flags = codigo ? await resolveDiagCatalogFlags(codigo) : null;
      aplica = aplicaConfirmacionDiagnostico23({
        tipoPersonal: tipoRes.value,
        edad,
        flags,
        primeraVezDiagnostico:
          typeof formData.primeraVezDiagnostico3 === 'number'
            ? formData.primeraVezDiagnostico3
            : null,
      });
    }

    if (!aplica) {
      delete formData[field];
    }
  }
}

export async function validateNotaMedicaConfirmacionDiagnostica(
  params: ValidateConfirmacionParams,
): Promise<ValidateConfirmacionResult> {
  const tipoRes = await resolveEffectiveTipoPersonalDgis(
    params.medicoFirmante,
    params.enfermeraFirmante,
  );
  const edad = calcularEdadAnios(
    params.trabajadorFechaNacimiento,
    params.fechaNotaMedica,
  );

  for (const slot of [1, 2, 3] as const) {
    const issue = await validateSlot(slot, params, tipoRes.value, edad);
    if (issue) return issue;
  }

  return { ok: true };
}

export interface MuestraConfirmacionFlags {
  confirmacion1: boolean;
  confirmacion2: boolean;
  confirmacion3: boolean;
}

export async function computeMuestraConfirmacionFlags(params: {
  formData: Record<string, unknown>;
  trabajadorFechaNacimiento: Date;
  fechaNotaMedica: Date;
  medicoFirmante: MedicoFirmanteLike;
  enfermeraFirmante?: EnfermeraFirmanteLike;
}): Promise<MuestraConfirmacionFlags> {
  const tipoRes = await resolveEffectiveTipoPersonalDgis(
    params.medicoFirmante,
    params.enfermeraFirmante,
  );
  const edad = calcularEdadAnios(
    params.trabajadorFechaNacimiento,
    params.fechaNotaMedica,
  );
  const p = params.formData;

  const codigo1 = extractCIE10Code(String(p.codigoCIE10Principal ?? ''));
  const flags1 = codigo1 ? await resolveDiagCatalogFlags(codigo1) : null;
  const confirmacion1 = aplicaConfirmacionDiagnostico1({
    tipoPersonal: tipoRes.value,
    edad,
    flags: flags1,
    relacionTemporal:
      typeof p.relacionTemporal === 'number' ? p.relacionTemporal : null,
  });

  const codigo2 = extractCIE10Code(String(p.codigoCIEDiagnostico2 ?? ''));
  const flags2 = codigo2 ? await resolveDiagCatalogFlags(codigo2) : null;
  const confirmacion2 = aplicaConfirmacionDiagnostico23({
    tipoPersonal: tipoRes.value,
    edad,
    flags: flags2,
    primeraVezDiagnostico:
      typeof p.primeraVezDiagnostico2 === 'number'
        ? p.primeraVezDiagnostico2
        : null,
  });

  const codigo3 = extractCIE10Code(String(p.codigoCIEDiagnostico3 ?? ''));
  const flags3 = codigo3 ? await resolveDiagCatalogFlags(codigo3) : null;
  const confirmacion3 = aplicaConfirmacionDiagnostico23({
    tipoPersonal: tipoRes.value,
    edad,
    flags: flags3,
    primeraVezDiagnostico:
      typeof p.primeraVezDiagnostico3 === 'number'
        ? p.primeraVezDiagnostico3
        : null,
  });

  return {
    confirmacion1,
    confirmacion2,
    confirmacion3,
  };
}
