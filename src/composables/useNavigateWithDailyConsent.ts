import { ref } from 'vue';
import { useRouter, type RouteLocationRaw } from 'vue-router';
import { useRegulatoryPolicy } from './useRegulatoryPolicy';
import { useDailyConsent } from './useDailyConsent';
import { useRegulatoryErrorMapper } from './useRegulatoryErrorMapper';
import type { ConsentimientoCreated } from '@/types/consentimiento-diario';

/**
 * Composable para navegar con verificación preventiva de consentimiento diario
 * Verifica el consentimiento ANTES de navegar a CrearDocumentoView
 */
export function useNavigateWithDailyConsent() {
  const router = useRouter();
  const { isSIRES, dailyConsentEnabled } = useRegulatoryPolicy();
  const { checkStatus, registerConsent, currentDateKey } = useDailyConsent();
  const { extractRegulatoryError } = useRegulatoryErrorMapper();

  // Estado del modal
  const showModal = ref(false);
  const modalTrabajadorId = ref('');
  const modalTrabajadorNombre = ref('');
  const modalTrabajadorSexo = ref<string>('');
  const pendingNavigation = ref<RouteLocationRaw | (() => void) | null>(null);
  const resolveNavigation = ref<((value: boolean) => void) | null>(null);

  /**
   * Navega a una ruta verificando consentimiento diario si aplica
   * 
   * @param options - Opciones de navegación
   * @param options.trabajadorId - ID del trabajador
   * @param options.trabajadorNombre - Nombre completo del trabajador
   * @param options.trabajadorSexo - Sexo del trabajador ('Masculino' | 'Femenino') para texto dinámico
   * @param options.to - Ruta destino (RouteLocationRaw) o callback que ejecuta la navegación
   */
  async function navigateWithDailyConsent(options: {
    trabajadorId: string;
    trabajadorNombre: string;
    trabajadorSexo?: string;
    to: RouteLocationRaw | (() => void);
  }): Promise<void> {
    const { trabajadorId, trabajadorNombre, trabajadorSexo, to } = options;

    // Si no aplica la policy (no es SIRES o consentimiento no habilitado), navegar directamente
    if (!isSIRES.value || !dailyConsentEnabled.value) {
      executeNavigation(to);
      return;
    }

    try {
      // Verificar status del consentimiento para hoy
      const status = await checkStatus(trabajadorId);
      
      // Si ya existe consentimiento, navegar directamente
      if (status?.hasConsent) {
        executeNavigation(to);
        return;
      }

      // Si no existe consentimiento, abrir modal
      await new Promise<boolean>((resolve) => {
        pendingNavigation.value = to;
        modalTrabajadorId.value = trabajadorId;
        modalTrabajadorNombre.value = trabajadorNombre;
        modalTrabajadorSexo.value = trabajadorSexo || '';
        resolveNavigation.value = resolve;
        showModal.value = true;
      });
      return;
    } catch (error: any) {
      // Si hay error al verificar, navegar de todas formas (fallback)
      console.error('Error al verificar consentimiento:', error);
      executeNavigation(to);
    }
  }

  /**
   * Ejecuta la navegación (ruta o callback)
   */
  function executeNavigation(to: RouteLocationRaw | (() => void)) {
    if (typeof to === 'function') {
      to();
    } else {
      router.push(to);
    }
  }

  /**
   * Maneja el evento cuando se registra el consentimiento exitosamente
   * Navega automáticamente a la ruta destino
   */
  async function handleConsentRegistered(consent: ConsentimientoCreated) {
    showModal.value = false;

    if (!pendingNavigation.value) {
      resolveNavigation.value?.(false);
      return;
    }

    try {
      // Verificar que el consentimiento se registró correctamente
      // (el backend ya lo validó, pero refrescamos status por si acaso)
      await checkStatus(modalTrabajadorId.value);
      
      // Ejecutar navegación
      executeNavigation(pendingNavigation.value);
      resolveNavigation.value?.(true);
    } catch (error: any) {
      // Si es CONSENT_ALREADY_EXISTS (race condition), refrescar y navegar igualmente
      const regulatoryError = extractRegulatoryError(error);
      if (regulatoryError?.errorCode === 'CONSENT_ALREADY_EXISTS') {
        // Refrescar status y navegar de todas formas
        await checkStatus(modalTrabajadorId.value);
        executeNavigation(pendingNavigation.value);
        resolveNavigation.value?.(true);
      } else {
        // Otro error, pero navegamos de todas formas (ya hay consentimiento)
        console.error('Error después de registrar consentimiento:', error);
        executeNavigation(pendingNavigation.value);
        resolveNavigation.value?.(true);
      }
    } finally {
      // Limpiar estado
      pendingNavigation.value = null;
      resolveNavigation.value = null;
    }
  }

  /**
   * Maneja el evento cuando se cancela el modal
   * No navega
   */
  function handleConsentCancel() {
    showModal.value = false;
    resolveNavigation.value?.(false);
    pendingNavigation.value = null;
    resolveNavigation.value = null;
  }

  return {
    navigateWithDailyConsent,
    showModal,
    modalTrabajadorId,
    modalTrabajadorNombre,
    modalTrabajadorSexo,
    handleConsentRegistered,
    handleConsentCancel,
  };
}
