import { ref } from 'vue';
import { useRegulatoryPolicy } from './useRegulatoryPolicy';
import { useRegulatoryErrorMapper } from './useRegulatoryErrorMapper';
import { useTreatmentConsent } from './useTreatmentConsent';
import type { ConsentimientoCreated } from '@/types/consentimiento';

export function useTreatmentConsentGate() {
  const { dailyConsentEnabled } = useRegulatoryPolicy();
  const { extractRegulatoryError } = useRegulatoryErrorMapper();
  const { checkStatus } = useTreatmentConsent();

  const showModal = ref(false);
  const modalTrabajadorId = ref('');
  const modalTrabajadorNombre = ref('');
  const pendingAction = ref<(() => Promise<any>) | null>(null);
  const resolveAction = ref<((value: any) => void) | null>(null);
  const rejectAction = ref<((error: any) => void) | null>(null);

  async function runWithTreatmentConsent<T>(
    actionFn: () => Promise<T>,
    trabajadorId: string,
    trabajadorNombre: string,
  ): Promise<T | null> {
    if (!dailyConsentEnabled.value) {
      return await actionFn();
    }

    try {
      return await actionFn();
    } catch (error: any) {
      const regulatoryError = extractRegulatoryError(error);

      if (regulatoryError?.errorCode === 'CONSENT_REQUIRED') {
        return await new Promise<T | null>((resolve, reject) => {
          pendingAction.value = actionFn;
          modalTrabajadorId.value = trabajadorId;
          modalTrabajadorNombre.value = trabajadorNombre;
          resolveAction.value = resolve;
          rejectAction.value = reject;
          showModal.value = true;
        });
      }

      throw error;
    }
  }

  async function handleConsentRegistered(_consent: ConsentimientoCreated) {
    showModal.value = false;

    if (!pendingAction.value) {
      resolveAction.value?.(null);
      return;
    }

    try {
      const result = await pendingAction.value();
      resolveAction.value?.(result);
    } catch (error: any) {
      const regulatoryError = extractRegulatoryError(error);
      if (regulatoryError?.errorCode === 'CONSENT_ALREADY_EXISTS') {
        await checkStatus(modalTrabajadorId.value);
        try {
          const result = await pendingAction.value();
          resolveAction.value?.(result);
        } catch (retryError) {
          rejectAction.value?.(retryError);
        }
      } else {
        rejectAction.value?.(error);
      }
    } finally {
      pendingAction.value = null;
      resolveAction.value = null;
      rejectAction.value = null;
    }
  }

  function handleConsentCancel() {
    showModal.value = false;
    resolveAction.value?.(null);
    pendingAction.value = null;
    resolveAction.value = null;
    rejectAction.value = null;
  }

  return {
    runWithTreatmentConsent,
    showModal,
    modalTrabajadorId,
    modalTrabajadorNombre,
    handleConsentRegistered,
    handleConsentCancel,
  };
}
