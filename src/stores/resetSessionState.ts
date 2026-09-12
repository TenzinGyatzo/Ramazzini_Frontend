import { invalidateInicioResumenCache } from '@/composables/inicioResumenCache';
import { resetBorradoresNotaMedicaState } from '@/composables/useBorradoresNotaMedica';
import { useCentrosTrabajoStore } from '@/stores/centrosTrabajo';
import { useDocumentosStore } from '@/stores/documentos';
import { useEmpresasStore } from '@/stores/empresas';
import { useEnfermeraFirmanteStore } from '@/stores/enfermeraFirmante';
import { useMedicoFirmanteStore } from '@/stores/medicoFirmante';
import { useProveedorSaludStore } from '@/stores/proveedorSalud';
import { useRiesgoTrabajoStore } from '@/stores/riesgosTrabajo';
import { useSidebarStore } from '@/stores/sidebar';
import { useTecnicoFirmanteStore } from '@/stores/tecnicoFirmante';
import { useTrabajadoresStore } from '@/stores/trabajadores';

/**
 * Limpia estado de tenant/sesión en memoria.
 * No toca preferencias de UI (sidebar colapsado, tema).
 * El cache intra-sesión (skip-if-loaded, TTLs) se conserva para el siguiente login.
 */
export function resetSessionScopedState() {
  useSidebarStore().invalidatePendingInitialization();
  useEmpresasStore().clear();
  useCentrosTrabajoStore().clear();
  useTrabajadoresStore().clear();
  useDocumentosStore().clear();
  useRiesgoTrabajoStore().clear();
  useMedicoFirmanteStore().clear();
  useEnfermeraFirmanteStore().clear();
  useTecnicoFirmanteStore().clear();
  useProveedorSaludStore().clear();
  invalidateInicioResumenCache();
  resetBorradoresNotaMedicaState();
}
