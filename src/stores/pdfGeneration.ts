import { defineStore } from 'pinia';
import { ref } from 'vue';

/**
 * Estado optimista de PDFs en generación.
 * Permite mostrar "Generando PDF…" en el expediente aunque el PATCH
 * de pdfStatus aún no haya terminado.
 */
export const usePdfGenerationStore = defineStore('pdfGeneration', () => {
  const generatingIds = ref<Record<string, true>>({});

  function markLocalGenerating(documentId: string | null | undefined) {
    if (!documentId) return;
    generatingIds.value = { ...generatingIds.value, [documentId]: true };
  }

  function clearLocalGenerating(documentId: string | null | undefined) {
    if (!documentId || !generatingIds.value[documentId]) return;
    const next = { ...generatingIds.value };
    delete next[documentId];
    generatingIds.value = next;
  }

  function isLocalGenerating(documentId: string | null | undefined) {
    if (!documentId) return false;
    return !!generatingIds.value[documentId];
  }

  return {
    generatingIds,
    markLocalGenerating,
    clearLocalGenerating,
    isLocalGenerating,
  };
});
