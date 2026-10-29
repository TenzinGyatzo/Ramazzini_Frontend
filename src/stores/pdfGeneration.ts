import { defineStore } from 'pinia';
import { ref } from 'vue';

/**
 * Estado optimista de PDFs en generación.
 * Permite mostrar "Generando PDF…" en el expediente aunque el PATCH
 * de pdfStatus aún no haya terminado.
 */
export const usePdfGenerationStore = defineStore('pdfGeneration', () => {
  const generatingIds = ref<Record<string, true>>({});
  /**
   * PDFs que terminaron en esta sesión: quien pidió el PDF lo sabe al recibir la respuesta
   * y el expediente lo muestra listo sin esperar a su siguiente consulta.
   */
  const readyIds = ref<Record<string, true>>({});

  function markLocalGenerating(documentId: string | null | undefined) {
    if (!documentId) return;
    generatingIds.value = { ...generatingIds.value, [documentId]: true };
    if (readyIds.value[documentId]) {
      const next = { ...readyIds.value };
      delete next[documentId];
      readyIds.value = next;
    }
  }

  /** El servidor respondió: el PDF ya está escrito. */
  function markLocalReady(documentId: string | null | undefined) {
    if (!documentId) return;
    clearLocalGenerating(documentId);
    readyIds.value = { ...readyIds.value, [documentId]: true };
  }

  /** El expediente ya lo mostró listo. */
  function forgetLocalReady(documentId: string | null | undefined) {
    if (!documentId || !readyIds.value[documentId]) return;
    const next = { ...readyIds.value };
    delete next[documentId];
    readyIds.value = next;
  }

  function isLocalReady(documentId: string | null | undefined) {
    if (!documentId) return false;
    return !!readyIds.value[documentId];
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
    readyIds,
    markLocalGenerating,
    markLocalReady,
    forgetLocalReady,
    clearLocalGenerating,
    isLocalGenerating,
    isLocalReady,
  };
});
