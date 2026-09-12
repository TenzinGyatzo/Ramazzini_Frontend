import { computed } from 'vue';
import { format, subDays } from 'date-fns';
import { useNom024Fields } from '@/composables/useNom024Fields';

/** Antigüedad máxima (días naturales, inclusive) de la fecha de atención en SIRES_NOM024. */
export const DOCUMENT_DATE_MAX_LOOKBACK_DAYS = 30;

/**
 * Límites del selector de fecha de documentos clínicos en SIRES_NOM024:
 * - max: hoy
 * - min: hoy − 30 días naturales
 * En SIN_REGIMEN retorna undefined (sin restricción en el selector).
 */
export function useSiresDocumentDateMax() {
  const { isSIRES } = useNom024Fields();

  const fechaDocumentoMax = computed(() => {
    if (!isSIRES.value) return undefined;
    return format(new Date(), 'yyyy-MM-dd');
  });

  const fechaDocumentoMin = computed(() => {
    if (!isSIRES.value) return undefined;
    return format(subDays(new Date(), DOCUMENT_DATE_MAX_LOOKBACK_DAYS), 'yyyy-MM-dd');
  });

  return { fechaDocumentoMax, fechaDocumentoMin };
}
