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

// Estado por trabajador, compartido entre vistas: con él la ventana de consentimiento abre al
// instante. El consentimiento vale por trabajador y versión del texto; el estado guardado se
// refresca cada día por si cambió en otro equipo, y de todos modos el servidor lo revisa al guardar.
const estadoPorTrabajador = new Map<
  string,
  { dia: string; estado: Promise<ConsentimientoStatus | null> }
>();
const hoy = () => new Date().toDateString();

function guardarEstado(trabajadorId: string, estado: ConsentimientoStatus) {
  estadoPorTrabajador.set(trabajadorId, {
    dia: hoy(),
    estado: Promise.resolve(estado),
  });
}

/** Estado del consentimiento ya consultado hoy, o lo consulta (sin repetir la petición en curso). */
export function precargarEstadoConsentimiento(
  trabajadorId: string,
): Promise<ConsentimientoStatus | null> {
  const guardado = estadoPorTrabajador.get(trabajadorId);
  if (guardado && guardado.dia === hoy()) return guardado.estado;

  const estado = ConsentimientosAPI.getStatus(trabajadorId)
    .then((response) => response.data)
    .catch(() => {
      // Un fallo no se recuerda: el siguiente intento vuelve a consultar
      if (estadoPorTrabajador.get(trabajadorId)?.estado === estado) {
        estadoPorTrabajador.delete(trabajadorId);
      }
      return null;
    });
  estadoPorTrabajador.set(trabajadorId, { dia: hoy(), estado });
  return estado;
}

export function olvidarEstadosConsentimiento() {
  estadoPorTrabajador.clear();
}

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
      guardarEstado(trabajadorId, response.data);

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
      guardarEstado(createDto.trabajadorId, { required: true, accepted: true });

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
