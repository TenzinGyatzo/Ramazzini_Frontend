import { computed } from 'vue';
import { useRegulatoryPolicy } from '@/composables/useRegulatoryPolicy';

/**
 * Folio de edición exhibido en runtime según el régimen del tenant.
 * Los números vienen de compile-time (__APP_VERSION_SIRES__ / __APP_VERSION_COMMERCIAL__);
 * la línea se elige en runtime. Sin régimen: «Ramazzini» sin número (nunca el folio SIRES).
 */
export function useEditionLabel() {
  const { isSIRES, isSinRegimen } = useRegulatoryPolicy();

  const editionLabel = computed(() => {
    if (isSIRES.value) {
      return `SIRES ${__APP_VERSION_SIRES__}`;
    }
    if (isSinRegimen.value) {
      return `Ramazzini ${__APP_VERSION_COMMERCIAL__}`;
    }
    return 'Ramazzini';
  });

  return { editionLabel };
}
