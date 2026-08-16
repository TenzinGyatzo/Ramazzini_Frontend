import { watch, type Ref } from 'vue';
import {
  applyResidenciaCoherence,
  normalizeLegacyResidencia,
  type ResidenciaCoherenceTrigger,
  type ResidenciaFields,
} from '@/helpers/residenciaGeoRules';
import type { GeoFormContext } from '@/helpers/geoSelectorRules';

export type { ResidenciaFields };

export function useResidenciaGeoCoherence(
  formulario: Ref<ResidenciaFields>,
  geoContext: GeoFormContext = 'trabajador',
) {
  watch(
    () => formulario.value.paisResidencia,
    () => {
      applyResidenciaCoherence(formulario.value, 'pais', geoContext);
    },
    { immediate: true },
  );

  watch(
    () => formulario.value.entidadResidencia,
    () => {
      applyResidenciaCoherence(formulario.value, 'entidad', geoContext);
    },
  );

  watch(
    () => formulario.value.municipioResidencia,
    () => {
      applyResidenciaCoherence(formulario.value, 'municipio', geoContext);
    },
  );

  watch(
    () => formulario.value.localidadResidencia,
    () => {
      applyResidenciaCoherence(formulario.value, 'localidad', geoContext);
    },
  );
}

export function initializeResidenciaGeoFields(
  formulario: Ref<ResidenciaFields>,
  trigger: ResidenciaCoherenceTrigger = 'init',
  geoContext: GeoFormContext = 'trabajador',
): void {
  normalizeLegacyResidencia(formulario.value);
  applyResidenciaCoherence(formulario.value, trigger, geoContext);
}

/** @deprecated Usar useResidenciaGeoCoherence */
export function useEntidadPaisResidenciaCoherence(
  formulario: Ref<ResidenciaFields>,
) {
  useResidenciaGeoCoherence(formulario);
}

export {
  PAIS_RESIDENCIA_MEXICO,
  PAIS_RESIDENCIA_NO_ESPECIFICADO,
} from '@/helpers/giisResidenciaGeo';
