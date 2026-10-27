import { ref } from 'vue';
import { useRouter, type RouteLocationRaw } from 'vue-router';
import { useRegulatoryPolicy } from './useRegulatoryPolicy';
import { precargarEstadoConsentimiento } from './useTreatmentConsent';
import type { ConsentimientoCreated } from '@/types/consentimiento';

export function useNavigateWithTreatmentConsent() {
  const router = useRouter();
  const { isSIRES, dailyConsentEnabled } = useRegulatoryPolicy();

  const showModal = ref(false);
  const modalTrabajadorId = ref('');
  const modalTrabajadorNombre = ref('');
  const modalConsentText = ref('');
  const modalDeclaracionProfesional = ref('');
  const pendingNavigation = ref<RouteLocationRaw | (() => void) | null>(null);
  const resolveNavigation = ref<((value: boolean) => void) | null>(null);

  const consentimientoAplica = () => isSIRES.value && dailyConsentEnabled.value;

  /** Consulta el estado antes del clic, para que la ventana (o la navegación) no espere al servidor. */
  function precargarConsentimiento(trabajadorId: string | undefined | null) {
    if (!trabajadorId || !consentimientoAplica()) return;
    void precargarEstadoConsentimiento(trabajadorId);
  }

  async function navigateWithTreatmentConsent(options: {
    trabajadorId: string;
    trabajadorNombre: string;
    to: RouteLocationRaw | (() => void);
  }): Promise<void> {
    const { trabajadorId, trabajadorNombre, to } = options;

    if (!consentimientoAplica()) {
      executeNavigation(to);
      return;
    }

    const statusResult = await precargarEstadoConsentimiento(trabajadorId);

    if (statusResult?.accepted) {
      executeNavigation(to);
      return;
    }

    await new Promise<boolean>((resolve) => {
      pendingNavigation.value = to;
      modalTrabajadorId.value = trabajadorId;
      modalTrabajadorNombre.value = trabajadorNombre;
      // Sin texto (falló la consulta) la ventana lo pide por su cuenta
      modalConsentText.value = statusResult?.consentText ?? '';
      modalDeclaracionProfesional.value = statusResult?.declaracionProfesional ?? '';
      resolveNavigation.value = resolve;
      showModal.value = true;
    });
  }

  function executeNavigation(to: RouteLocationRaw | (() => void)) {
    if (typeof to === 'function') {
      to();
    } else {
      router.push(to);
    }
  }

  // El registro ya dejó el estado como aceptado: se navega sin volver a consultar
  function handleConsentRegistered(_consent: ConsentimientoCreated) {
    showModal.value = false;

    if (pendingNavigation.value) {
      executeNavigation(pendingNavigation.value);
      resolveNavigation.value?.(true);
    } else {
      resolveNavigation.value?.(false);
    }

    pendingNavigation.value = null;
    resolveNavigation.value = null;
  }

  function handleConsentCancel() {
    showModal.value = false;
    resolveNavigation.value?.(false);
    pendingNavigation.value = null;
    resolveNavigation.value = null;
  }

  return {
    navigateWithTreatmentConsent,
    precargarConsentimiento,
    showModal,
    modalTrabajadorId,
    modalTrabajadorNombre,
    modalConsentText,
    modalDeclaracionProfesional,
    handleConsentRegistered,
    handleConsentCancel,
  };
}
