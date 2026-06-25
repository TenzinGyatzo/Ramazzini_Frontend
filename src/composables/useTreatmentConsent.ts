import { ref, computed } from 'vue';
import ConsentimientosAPI from '@/api/ConsentimientosAPI';
import { useRegulatoryPolicy } from './useRegulatoryPolicy';
import { useRegulatoryErrorMapper } from './useRegulatoryErrorMapper';
import type {
  ConsentState,
  ConsentError,
  ConsentimientoStatus,
  ConsentimientoCreated,
  CreateConsentimientoDto,
} from '@/types/consentimiento';

export function useTreatmentConsent() {
  const { dailyConsentEnabled } = useRegulatoryPolicy();
  const { mapRegulatoryError, extractRegulatoryError } =
    useRegulatoryErrorMapper();

  const state = ref<ConsentState>('idle');
  const error = ref<ConsentError | null>(null);
  const status = ref<ConsentimientoStatus | null>(null);

  const isLoading = computed(
    () => state.value === 'checking' || state.value === 'submitting',
  );

  const hasError = computed(
    () => state.value === 'error' && error.value !== null,
  );

  const reset = () => {
    state.value = 'idle';
    error.value = null;
    status.value = null;
  };

  const checkStatus = async (
    trabajadorId: string,
  ): Promise<ConsentimientoStatus | null> => {
    if (!dailyConsentEnabled.value) {
      return { required: false, accepted: true };
    }

    try {
      state.value = 'checking';
      error.value = null;

      const response = await ConsentimientosAPI.getStatus(trabajadorId);
      status.value = response.data;

      state.value = 'idle';
      return response.data;
    } catch (err: any) {
      const regulatoryError = extractRegulatoryError(err);
      if (regulatoryError) {
        const mappedError = mapRegulatoryError(regulatoryError);
        error.value = {
          code: regulatoryError.errorCode,
          message: mappedError.message,
        };
      } else {
        error.value = {
          message:
            err.response?.data?.message ||
            'Error al obtener el estado del consentimiento',
        };
      }

      state.value = 'error';
      return null;
    }
  };

  const registerConsent = async (
    createDto: CreateConsentimientoDto,
  ): Promise<ConsentimientoCreated | null> => {
    if (!dailyConsentEnabled.value) {
      error.value = {
        code: 'CONSENT_NOT_ENABLED',
        message:
          'El consentimiento para tratamiento de información no aplica para este proveedor.',
      };
      state.value = 'error';
      return null;
    }

    try {
      state.value = 'submitting';
      error.value = null;

      const response = await ConsentimientosAPI.create(createDto);

      state.value = 'idle';
      return response.data;
    } catch (err: any) {
      const regulatoryError = extractRegulatoryError(err);
      if (regulatoryError) {
        const mappedError = mapRegulatoryError(regulatoryError);
        error.value = {
          code: regulatoryError.errorCode,
          message: mappedError.message,
        };
      } else {
        error.value = {
          message:
            err.response?.data?.message ||
            'Error al registrar el consentimiento',
        };
      }

      state.value = 'error';
      return null;
    }
  };

  return {
    state,
    error,
    status,
    isLoading,
    hasError,
    reset,
    checkStatus,
    registerConsent,
    dailyConsentEnabled,
  };
}
