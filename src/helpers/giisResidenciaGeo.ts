import { PAIS_NACIMIENTO_MEXICO_CODE, PAIS_NACIMIENTO_NO_ESPECIFICADO_CODE } from './paisNacimiento';

export const PAIS_RESIDENCIA_MEXICO = Number(PAIS_NACIMIENTO_MEXICO_CODE);
export const PAIS_RESIDENCIA_NO_ESPECIFICADO = Number(
  PAIS_NACIMIENTO_NO_ESPECIFICADO_CODE,
);

export const GIIS_ENTIDAD_NO_APLICA = '88';
export const GIIS_ENTIDAD_SE_IGNORA = '99';
export const GIIS_ENTIDAD_NO_ESPECIFICADO = '00';
export const RENAPO_ENTIDAD_EXTRANJERO = 'NE';

export const GIIS_MUNICIPIO_NO_APLICA = '997';
export const GIIS_MUNICIPIO_SE_IGNORA = '998';
export const GIIS_MUNICIPIO_NO_ESPECIFICADO = '999';
export const INEGI_MUNICIPIO_NO_DISPONIBLE = '000';

export const GIIS_LOCALIDAD_NO_APLICA = '9997';
export const GIIS_LOCALIDAD_SE_IGNORA = '9998';
export const GIIS_LOCALIDAD_NO_ESPECIFICADO = '9999';
export const INEGI_LOCALIDAD_NO_DISPONIBLE = '0000';

export const ENTIDADES_RESIDENCIA_ESPECIALES = [
  RENAPO_ENTIDAD_EXTRANJERO,
  GIIS_ENTIDAD_NO_ESPECIFICADO,
  GIIS_ENTIDAD_NO_APLICA,
  GIIS_ENTIDAD_SE_IGNORA,
] as const;

export function normalizeEntidadResidencia(
  value: string | undefined | null,
): string {
  return String(value ?? '')
    .trim()
    .toUpperCase();
}

export function isEntidadResidenciaEspecial(
  code: string | undefined | null,
): boolean {
  return ENTIDADES_RESIDENCIA_ESPECIALES.includes(
    normalizeEntidadResidencia(code) as (typeof ENTIDADES_RESIDENCIA_ESPECIALES)[number],
  );
}

export function getGiisGeoForEntidadResidencia(entidad: string): {
  municipio: string;
  localidad: string;
} | null {
  switch (normalizeEntidadResidencia(entidad)) {
    case GIIS_ENTIDAD_NO_APLICA:
    case RENAPO_ENTIDAD_EXTRANJERO:
      return {
        municipio: GIIS_MUNICIPIO_NO_APLICA,
        localidad: GIIS_LOCALIDAD_NO_APLICA,
      };
    case GIIS_ENTIDAD_SE_IGNORA:
      return {
        municipio: GIIS_MUNICIPIO_SE_IGNORA,
        localidad: GIIS_LOCALIDAD_SE_IGNORA,
      };
    case GIIS_ENTIDAD_NO_ESPECIFICADO:
      return {
        municipio: GIIS_MUNICIPIO_NO_ESPECIFICADO,
        localidad: GIIS_LOCALIDAD_NO_ESPECIFICADO,
      };
    default:
      return null;
  }
}

export function getGiisGeoForMunicipioResidencia(municipio: string): {
  localidad: string;
} | null {
  switch (String(municipio ?? '').trim()) {
    case GIIS_MUNICIPIO_NO_ESPECIFICADO:
    case INEGI_MUNICIPIO_NO_DISPONIBLE:
      return { localidad: GIIS_LOCALIDAD_NO_ESPECIFICADO };
    case GIIS_MUNICIPIO_SE_IGNORA:
      return { localidad: GIIS_LOCALIDAD_SE_IGNORA };
    case GIIS_MUNICIPIO_NO_APLICA:
      return { localidad: GIIS_LOCALIDAD_NO_APLICA };
    default:
      return null;
  }
}

export function getMunicipioSentinelForEntidad(entidad: string): {
  code: string;
  description: string;
} {
  const geo = getGiisGeoForEntidadResidencia(entidad);
  if (!geo) {
    return { code: INEGI_MUNICIPIO_NO_DISPONIBLE, description: 'No disponible' };
  }

  switch (normalizeEntidadResidencia(entidad)) {
    case GIIS_ENTIDAD_NO_APLICA:
    case RENAPO_ENTIDAD_EXTRANJERO:
      return { code: geo.municipio, description: 'NO APLICA' };
    case GIIS_ENTIDAD_SE_IGNORA:
      return { code: geo.municipio, description: 'SE IGNORA' };
    case GIIS_ENTIDAD_NO_ESPECIFICADO:
      return { code: geo.municipio, description: 'NO ESPECIFICADO' };
    default:
      return { code: INEGI_MUNICIPIO_NO_DISPONIBLE, description: 'No disponible' };
  }
}

export function getLocalidadSentinelForEntidad(entidad: string): {
  code: string;
  description: string;
} {
  const geo = getGiisGeoForEntidadResidencia(entidad);
  if (!geo) {
    return { code: INEGI_LOCALIDAD_NO_DISPONIBLE, description: 'No disponible' };
  }

  switch (normalizeEntidadResidencia(entidad)) {
    case GIIS_ENTIDAD_NO_APLICA:
    case RENAPO_ENTIDAD_EXTRANJERO:
      return { code: geo.localidad, description: 'NO APLICA' };
    case GIIS_ENTIDAD_SE_IGNORA:
      return { code: geo.localidad, description: 'SE IGNORA' };
    case GIIS_ENTIDAD_NO_ESPECIFICADO:
      return { code: geo.localidad, description: 'NO ESPECIFICADO' };
    default:
      return { code: INEGI_LOCALIDAD_NO_DISPONIBLE, description: 'No disponible' };
  }
}
