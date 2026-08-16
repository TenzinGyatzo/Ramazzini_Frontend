import {
  getAllowedEntidadCodesForPaisResidencia,
  getExcludedEntidadCodes,
  getMexicoEntidadResidenciaAllowedCodes,
  isEntidadAllowedForPaisResidencia,
  isEntidadEstatal,
  isMexicoPais,
  isNonMexicoPais,
  normalizePaisCode,
  type GeoFormContext,
} from './geoSelectorRules';
import {
  GIIS_ENTIDAD_NO_APLICA,
  GIIS_ENTIDAD_NO_ESPECIFICADO,
  GIIS_ENTIDAD_SE_IGNORA,
  GIIS_LOCALIDAD_NO_APLICA,
  GIIS_LOCALIDAD_NO_ESPECIFICADO,
  GIIS_LOCALIDAD_SE_IGNORA,
  GIIS_MUNICIPIO_NO_APLICA,
  GIIS_MUNICIPIO_NO_ESPECIFICADO,
  GIIS_MUNICIPIO_SE_IGNORA,
  INEGI_LOCALIDAD_NO_DISPONIBLE,
  INEGI_MUNICIPIO_NO_DISPONIBLE,
  PAIS_RESIDENCIA_MEXICO,
  RENAPO_ENTIDAD_EXTRANJERO,
  getGiisGeoForEntidadResidencia,
  isEntidadResidenciaEspecial,
  normalizeEntidadResidencia,
} from './giisResidenciaGeo';

export interface ResidenciaFields {
  entidadResidencia: string;
  municipioResidencia: string;
  localidadResidencia: string;
  paisResidencia: string | number;
}

export interface ResidenciaFieldUiState {
  locked: boolean;
  forcedValue?: string;
  allowedEntidadCodes?: string[];
}

export interface ResidenciaUiState {
  entidad: ResidenciaFieldUiState;
  municipio: ResidenciaFieldUiState & {
    sentinelCodes: string[];
  };
  localidad: ResidenciaFieldUiState & {
    sentinelCodes: string[];
  };
}

export type ResidenciaCoherenceTrigger =
  | 'pais'
  | 'entidad'
  | 'municipio'
  | 'localidad'
  | 'init';

export function normalizePaisResidencia(
  value: string | number | null | undefined,
): number | null {
  return normalizePaisCode(value);
}

export function isMexicoResidenciaPais(
  pais: number | null | undefined,
): boolean {
  return isMexicoPais(pais);
}

export function isForeignResidenciaPais(
  pais: number | null | undefined,
): boolean {
  return isNonMexicoPais(pais);
}

export function isEntidadEstatalResidencia(
  entidad: string | undefined | null,
): boolean {
  return isEntidadEstatal(entidad);
}

export function isMunicipioGiisSentinel(code: string | undefined | null): boolean {
  const value = String(code ?? '').trim();
  return (
    value === GIIS_MUNICIPIO_NO_APLICA ||
    value === GIIS_MUNICIPIO_SE_IGNORA ||
    value === GIIS_MUNICIPIO_NO_ESPECIFICADO ||
    value === INEGI_MUNICIPIO_NO_DISPONIBLE
  );
}

export function isLocalidadGiisSentinel(code: string | undefined | null): boolean {
  const value = String(code ?? '').trim();
  return (
    value === GIIS_LOCALIDAD_NO_APLICA ||
    value === GIIS_LOCALIDAD_NO_ESPECIFICADO ||
    value === GIIS_LOCALIDAD_SE_IGNORA ||
    value === INEGI_LOCALIDAD_NO_DISPONIBLE
  );
}

export function getResidenciaUiState(
  fields: ResidenciaFields,
  geoContext: GeoFormContext = 'trabajador',
): ResidenciaUiState {
  const pais = normalizePaisResidencia(fields.paisResidencia);
  const entidad = normalizeEntidadResidencia(fields.entidadResidencia);
  const municipio = String(fields.municipioResidencia ?? '').trim();
  const allowedEntidadCodes = getAllowedEntidadCodesForPaisResidencia(
    pais,
    geoContext,
  );

  if (isNonMexicoPais(pais)) {
    return {
      entidad: {
        locked: true,
        forcedValue: GIIS_ENTIDAD_NO_APLICA,
        allowedEntidadCodes: [GIIS_ENTIDAD_NO_APLICA],
      },
      municipio: {
        locked: true,
        forcedValue: GIIS_MUNICIPIO_NO_APLICA,
        sentinelCodes: [],
      },
      localidad: {
        locked: true,
        forcedValue: GIIS_LOCALIDAD_NO_APLICA,
        sentinelCodes: [],
      },
    };
  }

  if (entidad === GIIS_ENTIDAD_NO_ESPECIFICADO) {
    return {
      entidad: {
        locked: false,
        allowedEntidadCodes,
      },
      municipio: {
        locked: true,
        forcedValue: GIIS_MUNICIPIO_NO_ESPECIFICADO,
        sentinelCodes: [],
      },
      localidad: {
        locked: true,
        forcedValue: GIIS_LOCALIDAD_NO_ESPECIFICADO,
        sentinelCodes: [],
      },
    };
  }

  if (entidad === GIIS_ENTIDAD_SE_IGNORA) {
    return {
      entidad: {
        locked: false,
        allowedEntidadCodes,
      },
      municipio: {
        locked: true,
        forcedValue: GIIS_MUNICIPIO_SE_IGNORA,
        sentinelCodes: [],
      },
      localidad: {
        locked: true,
        forcedValue: GIIS_LOCALIDAD_SE_IGNORA,
        sentinelCodes: [],
      },
    };
  }

  if (isEntidadEstatalResidencia(entidad)) {
    const municipioLocked =
      municipio === GIIS_MUNICIPIO_NO_ESPECIFICADO ||
      municipio === GIIS_MUNICIPIO_SE_IGNORA;

    const municipioSentinels =
      geoContext === 'firmante'
        ? []
        : [GIIS_MUNICIPIO_NO_ESPECIFICADO, GIIS_MUNICIPIO_SE_IGNORA];
    const localidadSentinels =
      geoContext === 'firmante' ||
      !municipio ||
      municipio === GIIS_MUNICIPIO_NO_ESPECIFICADO ||
      municipio === GIIS_MUNICIPIO_SE_IGNORA
        ? []
        : [GIIS_LOCALIDAD_NO_ESPECIFICADO, GIIS_LOCALIDAD_SE_IGNORA];

    return {
      entidad: {
        locked: false,
        allowedEntidadCodes,
      },
      municipio: {
        locked: false,
        sentinelCodes: municipioSentinels,
      },
      localidad: {
        locked: municipioLocked,
        forcedValue:
          municipio === GIIS_MUNICIPIO_NO_ESPECIFICADO
            ? GIIS_LOCALIDAD_NO_ESPECIFICADO
            : municipio === GIIS_MUNICIPIO_SE_IGNORA
              ? GIIS_LOCALIDAD_SE_IGNORA
              : undefined,
        sentinelCodes: localidadSentinels,
      },
    };
  }

  if (isEntidadResidenciaEspecial(entidad)) {
    const geo = getGiisGeoForEntidadResidencia(entidad);
    return {
      entidad: {
        locked: false,
        allowedEntidadCodes,
      },
      municipio: {
        locked: true,
        forcedValue: geo?.municipio,
        sentinelCodes: [],
      },
      localidad: {
        locked: true,
        forcedValue: geo?.localidad,
        sentinelCodes: [],
      },
    };
  }

  return {
    entidad: {
      locked: false,
      allowedEntidadCodes:
        pais === null ? undefined : getMexicoEntidadResidenciaAllowedCodes(geoContext),
    },
    municipio: {
      locked: !entidad,
      sentinelCodes: [],
    },
    localidad: {
      locked: !entidad || !municipio,
      sentinelCodes: [],
    },
  };
}

const ENTITY_LEVEL_SENTINEL_MUNICIPIOS = [
  GIIS_MUNICIPIO_NO_APLICA,
  GIIS_MUNICIPIO_NO_ESPECIFICADO,
  GIIS_MUNICIPIO_SE_IGNORA,
  INEGI_MUNICIPIO_NO_DISPONIBLE,
];

const ENTITY_LEVEL_SENTINEL_LOCALIDADES = [
  GIIS_LOCALIDAD_NO_APLICA,
  GIIS_LOCALIDAD_NO_ESPECIFICADO,
  GIIS_LOCALIDAD_SE_IGNORA,
  INEGI_LOCALIDAD_NO_DISPONIBLE,
];

const STATE_LEVEL_LOCALIDAD_SENTINELS = [
  GIIS_LOCALIDAD_NO_ESPECIFICADO,
  GIIS_LOCALIDAD_SE_IGNORA,
];

function applyForeignBranch(formulario: ResidenciaFields): void {
  formulario.entidadResidencia = GIIS_ENTIDAD_NO_APLICA;
  formulario.municipioResidencia = GIIS_MUNICIPIO_NO_APLICA;
  formulario.localidadResidencia = GIIS_LOCALIDAD_NO_APLICA;
}

function applyEntidadBranch(formulario: ResidenciaFields, entidad: string): void {
  const geo = getGiisGeoForEntidadResidencia(entidad);
  if (geo) {
    formulario.municipioResidencia = geo.municipio;
    formulario.localidadResidencia = geo.localidad;
    return;
  }

  if (ENTITY_LEVEL_SENTINEL_MUNICIPIOS.includes(formulario.municipioResidencia)) {
    formulario.municipioResidencia = '';
  }
  if (ENTITY_LEVEL_SENTINEL_LOCALIDADES.includes(formulario.localidadResidencia)) {
    formulario.localidadResidencia = '';
  }
}

function applyMunicipioBranch(
  formulario: ResidenciaFields,
  municipio: string,
): void {
  if (municipio === GIIS_MUNICIPIO_NO_ESPECIFICADO) {
    formulario.localidadResidencia = GIIS_LOCALIDAD_NO_ESPECIFICADO;
    return;
  }
  if (municipio === GIIS_MUNICIPIO_SE_IGNORA) {
    formulario.localidadResidencia = GIIS_LOCALIDAD_SE_IGNORA;
    return;
  }
  if (
    STATE_LEVEL_LOCALIDAD_SENTINELS.includes(formulario.localidadResidencia)
  ) {
    formulario.localidadResidencia = '';
  }
}

function clearInvalidResidenciaFields(
  formulario: ResidenciaFields,
  geoContext: GeoFormContext,
): void {
  const pais = normalizePaisResidencia(formulario.paisResidencia);
  const entidad = normalizeEntidadResidencia(formulario.entidadResidencia);
  if (!entidad) return;

  const excluded = getExcludedEntidadCodes(geoContext);
  if (excluded.includes(entidad)) {
    formulario.entidadResidencia = '';
    formulario.municipioResidencia = '';
    formulario.localidadResidencia = '';
    return;
  }

  if (
    pais != null &&
    !isEntidadAllowedForPaisResidencia(entidad, pais, geoContext)
  ) {
    formulario.entidadResidencia = '';
    formulario.municipioResidencia = '';
    formulario.localidadResidencia = '';
  }
}

export function applyResidenciaCoherence(
  formulario: ResidenciaFields,
  trigger: ResidenciaCoherenceTrigger = 'init',
  geoContext: GeoFormContext = 'trabajador',
): void {
  const pais = normalizePaisResidencia(formulario.paisResidencia);

  if (isForeignResidenciaPais(pais)) {
    applyForeignBranch(formulario);
    return;
  }

  if (trigger === 'pais' || trigger === 'entidad' || trigger === 'init') {
    clearInvalidResidenciaFields(formulario, geoContext);
  }

  const entidad = normalizeEntidadResidencia(formulario.entidadResidencia);

  if (
    (trigger === 'entidad' || trigger === 'init') &&
    entidad &&
    isEntidadEstatalResidencia(entidad) &&
    !isMexicoResidenciaPais(pais)
  ) {
    formulario.paisResidencia = PAIS_RESIDENCIA_MEXICO;
  }

  const currentEntidad = normalizeEntidadResidencia(formulario.entidadResidencia);
  if (!currentEntidad) return;

  if (trigger === 'pais' || trigger === 'entidad' || trigger === 'init') {
    applyEntidadBranch(formulario, currentEntidad);
  }

  const municipio = String(formulario.municipioResidencia ?? '').trim();
  if (!municipio) return;

  if (
    trigger === 'pais' ||
    trigger === 'entidad' ||
    trigger === 'municipio' ||
    trigger === 'init'
  ) {
    if (isEntidadEstatalResidencia(currentEntidad)) {
      applyMunicipioBranch(formulario, municipio);
    }
  }
}

export function normalizeLegacyResidencia(formulario: ResidenciaFields): void {
  const entidad = normalizeEntidadResidencia(formulario.entidadResidencia);
  if (entidad === RENAPO_ENTIDAD_EXTRANJERO) {
    formulario.entidadResidencia = GIIS_ENTIDAD_NO_APLICA;
  }

  const normalizedEntidad = normalizeEntidadResidencia(
    formulario.entidadResidencia,
  );

  if (
    normalizedEntidad === GIIS_ENTIDAD_NO_APLICA ||
    normalizedEntidad === RENAPO_ENTIDAD_EXTRANJERO
  ) {
    if (formulario.municipioResidencia === INEGI_MUNICIPIO_NO_DISPONIBLE) {
      formulario.municipioResidencia = GIIS_MUNICIPIO_NO_APLICA;
    }
    if (formulario.localidadResidencia === INEGI_LOCALIDAD_NO_DISPONIBLE) {
      formulario.localidadResidencia = GIIS_LOCALIDAD_NO_APLICA;
    }
  }

  if (normalizedEntidad === GIIS_ENTIDAD_NO_ESPECIFICADO) {
    if (formulario.municipioResidencia === INEGI_MUNICIPIO_NO_DISPONIBLE) {
      formulario.municipioResidencia = GIIS_MUNICIPIO_NO_ESPECIFICADO;
    }
    if (formulario.localidadResidencia === INEGI_LOCALIDAD_NO_DISPONIBLE) {
      formulario.localidadResidencia = GIIS_LOCALIDAD_NO_ESPECIFICADO;
    }
  }

  if (normalizedEntidad === GIIS_ENTIDAD_SE_IGNORA) {
    if (formulario.municipioResidencia === INEGI_MUNICIPIO_NO_DISPONIBLE) {
      formulario.municipioResidencia = GIIS_MUNICIPIO_SE_IGNORA;
    }
    if (formulario.localidadResidencia === INEGI_LOCALIDAD_NO_DISPONIBLE) {
      formulario.localidadResidencia = GIIS_LOCALIDAD_SE_IGNORA;
    }
  }

  if (isEntidadEstatalResidencia(normalizedEntidad)) {
    if (formulario.municipioResidencia === INEGI_MUNICIPIO_NO_DISPONIBLE) {
      formulario.municipioResidencia = GIIS_MUNICIPIO_NO_ESPECIFICADO;
    }
    if (formulario.localidadResidencia === INEGI_LOCALIDAD_NO_DISPONIBLE) {
      formulario.localidadResidencia = GIIS_LOCALIDAD_NO_ESPECIFICADO;
    }
  }

  if (isEntidadResidenciaEspecial(normalizedEntidad)) {
    const geo = getGiisGeoForEntidadResidencia(normalizedEntidad);
    if (geo) {
      formulario.municipioResidencia = geo.municipio;
      formulario.localidadResidencia = geo.localidad;
    }
  }
}

export const MUNICIPIO_SENTINEL_LABELS: Record<string, string> = {
  [GIIS_MUNICIPIO_NO_APLICA]: 'NO APLICA',
  [GIIS_MUNICIPIO_SE_IGNORA]: 'SE IGNORA',
  [GIIS_MUNICIPIO_NO_ESPECIFICADO]: 'NO ESPECIFICADO',
};

export const LOCALIDAD_SENTINEL_LABELS: Record<string, string> = {
  [GIIS_LOCALIDAD_NO_APLICA]: 'NO APLICA',
  [GIIS_LOCALIDAD_SE_IGNORA]: 'SE IGNORA',
  [GIIS_LOCALIDAD_NO_ESPECIFICADO]: 'NO ESPECIFICADO',
};

export function buildMunicipioSentinelOption(code: string) {
  return {
    code,
    description: MUNICIPIO_SENTINEL_LABELS[code] ?? code,
  };
}

export function buildLocalidadSentinelOption(code: string) {
  return {
    code,
    description: LOCALIDAD_SENTINEL_LABELS[code] ?? code,
  };
}

// Re-export for backward compatibility
export {
  getMunicipioSentinelCodesForSelector,
  getLocalidadSentinelCodesForSelector,
} from './geoSelectorRules';
