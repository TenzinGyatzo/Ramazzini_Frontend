import { watch, type Ref } from 'vue';
import {
  getExcludedEntidadCodes,
  isEntidadAllowedForPaisNacimiento,
  isEntidadEstatal,
  isNonMexicoPais,
  normalizePaisCode,
  PAIS_MEXICO,
  type GeoFormContext,
} from '@/helpers/geoSelectorRules';
import { GIIS_ENTIDAD_NO_APLICA } from '@/helpers/giisResidenciaGeo';

export const PAIS_NACIMIENTO_MEXICO = PAIS_MEXICO;
export const PAIS_NACIMIENTO_NO_ESPECIFICADO = 248;

export interface FirmanteNacimientoFields {
  entidadNacimiento: string;
  paisNacimiento: string | number;
}

const NON_MEXICO_ENTIDAD_CODES = ['NE', '00', '88', '99'];

function isNonMexicoEntidad(entidad: string): boolean {
  return NON_MEXICO_ENTIDAD_CODES.includes(entidad);
}

function applyForeignNacimiento(formulario: FirmanteNacimientoFields): void {
  formulario.entidadNacimiento = GIIS_ENTIDAD_NO_APLICA;
}

function clearEntidadIfInvalid(
  formulario: FirmanteNacimientoFields,
  paisNum: number | null,
  geoContext: GeoFormContext,
): void {
  const entidad = formulario.entidadNacimiento?.trim().toUpperCase();
  if (!entidad) return;

  if (!isEntidadAllowedForPaisNacimiento(entidad, paisNum, geoContext)) {
    formulario.entidadNacimiento = '';
  }
}

/**
 * Coherencia NOM-024: sincronización bidireccional entidad de nacimiento ↔ país de nacimiento.
 *
 * - País ≠ México → fuerza entidad 88 (NO APLICA), igual que residencia
 * - Cambio a México: limpia entidad si ya no es válida (p. ej. 88)
 * - Entidad estatal MX (01-32) → país 142
 * - Entidad NE/00/88/99 con país 142 → limpia país
 */
export function useEntidadPaisNacimientoCoherence(
  formulario: Ref<FirmanteNacimientoFields>,
  geoContext: GeoFormContext = 'trabajador',
) {
  watch(
    () => formulario.value.entidadNacimiento,
    (entidad) => {
      if (!entidad) return;

      const normalized = entidad.trim().toUpperCase();
      if (getExcludedEntidadCodes(geoContext).includes(normalized)) {
        formulario.value.entidadNacimiento = '';
        return;
      }

      if (isEntidadEstatal(entidad)) {
        if (normalizePaisCode(formulario.value.paisNacimiento) !== PAIS_MEXICO) {
          formulario.value.paisNacimiento = PAIS_MEXICO;
        }
        return;
      }

      if (isNonMexicoEntidad(entidad)) {
        const paisNum = normalizePaisCode(formulario.value.paisNacimiento);
        if (paisNum === PAIS_MEXICO) {
          formulario.value.paisNacimiento = '';
        }
      }
    },
  );

  watch(
    () => formulario.value.paisNacimiento,
    (pais) => {
      const paisNum = normalizePaisCode(pais);
      if (isNonMexicoPais(paisNum)) {
        applyForeignNacimiento(formulario.value);
        return;
      }
      clearEntidadIfInvalid(formulario.value, paisNum, geoContext);
    },
    { immediate: true },
  );
}
