import { computed } from 'vue';
import { format } from 'date-fns';
import { useNom024Fields } from '@/composables/useNom024Fields';

/**
 * Límite superior (hoy) para fechas de documentos clínicos en régimen SIRES_NOM024.
 * En SIN_REGIMEN retorna undefined (sin restricción en el selector).
 */
export function useSiresDocumentDateMax() {
  const { isSIRES } = useNom024Fields();

  const fechaDocumentoMax = computed(() => {
    if (!isSIRES.value) return undefined;
    return format(new Date(), 'yyyy-MM-dd');
  });

  return { fechaDocumentoMax };
}
