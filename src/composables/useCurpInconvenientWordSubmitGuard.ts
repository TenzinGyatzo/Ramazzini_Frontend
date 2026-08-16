import { ref } from 'vue';
import { curpHasUnfilteredInconvenientWord } from '@/utils/curp';

/**
 * Guard de submit: exige confirmación explícita si la CURP contiene palabra inconveniente sin filtrar.
 */
export function useCurpInconvenientWordSubmitGuard() {
  const showModal = ref(false);
  const detectedWord = ref('');

  let resolvePromise: ((value: boolean) => void) | null = null;

  function needsConfirmation(curp: string | null | undefined): boolean {
    return curpHasUnfilteredInconvenientWord((curp ?? '').trim());
  }

  function confirmOrProceed(curp: string | null | undefined): Promise<boolean> {
    if (!needsConfirmation(curp)) {
      return Promise.resolve(true);
    }

    detectedWord.value = (curp ?? '').trim().substring(0, 4).toUpperCase();
    showModal.value = true;

    return new Promise((resolve) => {
      resolvePromise = resolve;
    });
  }

  function onConfirm() {
    showModal.value = false;
    resolvePromise?.(true);
    resolvePromise = null;
  }

  function onCancel() {
    showModal.value = false;
    resolvePromise?.(false);
    resolvePromise = null;
  }

  return {
    showModal,
    detectedWord,
    needsConfirmation,
    confirmOrProceed,
    onConfirm,
    onCancel,
  };
}
