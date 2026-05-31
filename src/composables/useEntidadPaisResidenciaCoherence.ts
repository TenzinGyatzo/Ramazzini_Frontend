import { watch, type Ref } from 'vue';
import {
  applyResidenciaCoherence,
  normalizeLegacyResidencia,
  type ResidenciaCoherenceTrigger,
  type ResidenciaFields,
} from '@/helpers/residenciaGeoRules';

export type { ResidenciaFields };

export function useResidenciaGeoCoherence(formulario: Ref<ResidenciaFields>) {
  watch(
    () => formulario.value.paisResidencia,
    () => {
      applyResidenciaCoherence(formulario.value, 'pais');
    },
    { immediate: true },
  );

  watch(
    () => formulario.value.entidadResidencia,
    () => {
      applyResidenciaCoherence(formulario.value, 'entidad');
    },
  );

  watch(
    () => formulario.value.municipioResidencia,
    () => {
      applyResidenciaCoherence(formulario.value, 'municipio');
    },
  );

  watch(
    () => formulario.value.localidadResidencia,
    () => {
      applyResidenciaCoherence(formulario.value, 'localidad');
    },
  );
}

export function initializeResidenciaGeoFields(
  formulario: Ref<ResidenciaFields>,
  trigger: ResidenciaCoherenceTrigger = 'init',
): void {
  normalizeLegacyResidencia(formulario.value);
  applyResidenciaCoherence(formulario.value, trigger);
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
