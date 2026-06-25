import { ref } from 'vue';
import { useRouter, type RouteLocationRaw } from 'vue-router';
import { useRegulatoryPolicy } from './useRegulatoryPolicy';
import { useTreatmentConsent } from './useTreatmentConsent';
import { useRegulatoryErrorMapper } from './useRegulatoryErrorMapper';
import type { ConsentimientoCreated } from '@/types/consentimiento';

export function useNavigateWithTreatmentConsent() {
  const router = useRouter();
  const { isSIRES, dailyConsentEnabled } = useRegulatoryPolicy();
  const { checkStatus } = useTreatmentConsent();
  const { extractRegulatoryError } = useRegulatoryErrorMapper();

  const showModal = ref(false);
  const modalTrabajadorId = ref('');
  const modalTrabajadorNombre = ref('');
  const pendingNavigation = ref<RouteLocationRaw | (() => void) | null>(null);
  const resolveNavigation = ref<((value: boolean) => void) | null>(null);

  async function navigateWithTreatmentConsent(options: {
    trabajadorId: string;
    trabajadorNombre: string;
    to: RouteLocationRaw | (() => void);
  }): Promise<void> {
    const { trabajadorId, trabajadorNombre, to } = options;

    if (!isSIRES.value || !dailyConsentEnabled.value) {
      executeNavigation(to);
      return;
    }

    try {
      const statusResult = await checkStatus(trabajadorId);

      if (statusResult?.accepted) {
        executeNavigation(to);
        return;
      }

      await new Promise<boolean>((resolve) => {
        pendingNavigation.value = to;
        modalTrabajadorId.value = trabajadorId;
        modalTrabajadorNombre.value = trabajadorNombre;
        resolveNavigation.value = resolve;
        showModal.value = true;
      });
    } catch (error: any) {
      console.error('Error al verificar consentimiento:', error);
      executeNavigation(to);
    }
  }

  function executeNavigation(to: RouteLocationRaw | (() => void)) {
    if (typeof to === 'function') {
      to();
    } else {
      router.push(to);
    }
  }

  async function handleConsentRegistered(_consent: ConsentimientoCreated) {
    showModal.value = false;

    if (!pendingNavigation.value) {
      resolveNavigation.value?.(false);
      return;
    }

    try {
      await checkStatus(modalTrabajadorId.value);
      executeNavigation(pendingNavigation.value);
      resolveNavigation.value?.(true);
    } catch (error: any) {
      const regulatoryError = extractRegulatoryError(error);
      if (regulatoryError?.errorCode === 'CONSENT_ALREADY_EXISTS') {
        await checkStatus(modalTrabajadorId.value);
        executeNavigation(pendingNavigation.value);
        resolveNavigation.value?.(true);
      } else {
        console.error('Error después de registrar consentimiento:', error);
        executeNavigation(pendingNavigation.value);
        resolveNavigation.value?.(true);
      }
    } finally {
      pendingNavigation.value = null;
      resolveNavigation.value = null;
    }
  }

  function handleConsentCancel() {
    showModal.value = false;
    resolveNavigation.value?.(false);
    pendingNavigation.value = null;
    resolveNavigation.value = null;
  }

  return {
    navigateWithTreatmentConsent,
    showModal,
    modalTrabajadorId,
    modalTrabajadorNombre,
    handleConsentRegistered,
    handleConsentCancel,
  };
}
