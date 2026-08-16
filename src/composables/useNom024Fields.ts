import { computed } from 'vue';
import { storeToRefs } from 'pinia';
import { useProveedorSaludStore } from '@/stores/proveedorSalud';
import { isMexicoProvider } from '@/helpers/proveedorPais';

/**
 * Composable para acceder a flags de policy relacionados con campos NOM-024
 * Centraliza el acceso a las validaciones y features basadas en régimen regulatorio
 */
export function useNom024Fields() {
  const proveedorSaludStore = useProveedorSaludStore();
  const { proveedorSalud } = storeToRefs(proveedorSaludStore);

  const policy = computed(() => proveedorSaludStore.regulatoryPolicy);

  const cie10Required = computed(() => 
    policy.value?.validation?.cie10Principal === 'required'
  );

  const geoFieldsRequired = computed(() => 
    policy.value?.validation?.geoFields === 'required'
  );

  const workerCurpRequired = computed(() => 
    policy.value?.validation?.workerCurp === 'required_strict'
  );

  const cluesFieldVisible = computed(() => 
    policy.value?.features?.cluesFieldVisible ?? false
  );

  const workerIdentificationImmutable = computed(() =>
    policy.value?.features?.workerIdentificationImmutable ?? false
  );

  const isMxProveedor = computed(() =>
    isMexicoProvider(proveedorSalud.value?.pais),
  );

  /** Campo con etiqueta CURP (solo proveedores en México) */
  const showWorkerCurpField = computed(() => isMxProveedor.value);

  /** Solo required/optional: el formato y cruce A1 los maneja useCurpLiveValidation. */
  const mxWorkerCurpValidationRules = computed((): string => {
    if (workerCurpRequired.value) {
      return 'required';
    }
    return 'optional';
  });

  /**
   * Reglas FormKit para identificador personal del trabajador.
   * Fuera de MX retorna null para no enlazar el prop validation en FormKit.
   */
  const workerCurpValidationRules = computed((): string | null => {
    if (!isMxProveedor.value) {
      return null;
    }
    return mxWorkerCurpValidationRules.value;
  });

  return {
    cie10Required,
    geoFieldsRequired,
    workerCurpRequired,
    cluesFieldVisible,
    workerIdentificationImmutable,
    isMxProveedor,
    showWorkerCurpField,
    mxWorkerCurpValidationRules,
    workerCurpValidationRules,
    isSIRES: computed(() => policy.value?.regime === 'SIRES_NOM024'),
    isSinRegimen: computed(() => policy.value?.regime === 'SIN_REGIMEN'),
  };
}
