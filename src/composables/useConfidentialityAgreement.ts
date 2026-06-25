import { ref, computed, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useUserStore } from '@/stores/user';
import { useProveedorSaludStore } from '@/stores/proveedorSalud';
import AcuerdoConfidencialidadAPI from '@/api/AcuerdoConfidencialidadAPI';

export const confidentialityAgreementRequired = ref(false);
export const confidentialityAgreementAccepted = ref(true);

const isLoading = ref(false);
const isChecking = ref(false);
const agreementText = ref('');
const footerConsent = ref('');
const currentVersion = ref('');
const error = ref<string | null>(null);

const publicRouteNames = [
  'login',
  'auth',
  'onboarding',
  'confirm-account',
  'forgot-password',
  'new-password',
];

export function isConfidentialityAgreementPending(): boolean {
  return confidentialityAgreementRequired.value && !confidentialityAgreementAccepted.value;
}

export async function refreshConfidentialityAgreementStatus(): Promise<void> {
  const userStore = useUserStore();

  if (!userStore.user) {
    confidentialityAgreementRequired.value = false;
    confidentialityAgreementAccepted.value = true;
    return;
  }

  isChecking.value = true;
  error.value = null;

  try {
    const { data } = await AcuerdoConfidencialidadAPI.getStatus();
    confidentialityAgreementRequired.value = data.required;
    confidentialityAgreementAccepted.value = data.required ? data.accepted : true;
    agreementText.value = data.agreementText ?? '';
    footerConsent.value = data.footerConsent ?? '';
    currentVersion.value = data.currentVersion ?? '';
  } catch (err) {
    console.error('Error al verificar acuerdo de confidencialidad:', err);
    error.value = 'No se pudo verificar el estado del acuerdo.';
  } finally {
    isChecking.value = false;
  }
}

export function useConfidentialityAgreement() {
  const route = useRoute();
  const userStore = useUserStore();
  const proveedorSaludStore = useProveedorSaludStore();

  const showModal = computed(
    () =>
      confidentialityAgreementRequired.value &&
      !confidentialityAgreementAccepted.value &&
      !publicRouteNames.includes(route.name as string) &&
      !!userStore.user,
  );

  async function acceptAgreement() {
    isLoading.value = true;
    error.value = null;

    try {
      await AcuerdoConfidencialidadAPI.accept();
      confidentialityAgreementAccepted.value = true;

      const idProveedorSalud = userStore.user?.idProveedorSalud;
      if (idProveedorSalud && !proveedorSaludStore.isProveedorLoaded) {
        await proveedorSaludStore.loadProveedorSalud(idProveedorSalud);
      }
    } catch (err) {
      console.error('Error al registrar aceptación del acuerdo:', err);
      error.value = 'No se pudo registrar la aceptación. Intente de nuevo.';
      throw err;
    } finally {
      isLoading.value = false;
    }
  }

  function resetState() {
    confidentialityAgreementRequired.value = false;
    confidentialityAgreementAccepted.value = true;
    isLoading.value = false;
    isChecking.value = false;
    agreementText.value = '';
    footerConsent.value = '';
    currentVersion.value = '';
    error.value = null;
  }

  watch(
    [() => userStore.user, () => route.name],
    async () => {
      if (publicRouteNames.includes(route.name as string)) {
        resetState();
        return;
      }

      if (!userStore.user) {
        resetState();
        return;
      }

      await refreshConfidentialityAgreementStatus();
    },
    { immediate: true },
  );

  return {
    isRequired: confidentialityAgreementRequired,
    isAccepted: confidentialityAgreementAccepted,
    isLoading,
    isChecking,
    agreementText,
    footerConsent,
    currentVersion,
    error,
    showModal,
    checkStatus: refreshConfidentialityAgreementStatus,
    acceptAgreement,
    resetState,
  };
}
