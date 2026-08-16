import { computed } from 'vue';
import { useMedicoFirmanteStore } from '@/stores/medicoFirmante';
import { useEnfermeraFirmanteStore } from '@/stores/enfermeraFirmante';
import { useTecnicoFirmanteStore } from '@/stores/tecnicoFirmante';
import { formatearTituloYNombreFirmante } from '@/helpers/nombres';
import { useProveedorSaludStore } from '@/stores/proveedorSalud';

/**
 * Composable para obtener el firmante activo del usuario actual
 * Prioridad: Médico > Enfermera > Técnico
 * 
 * @returns Objeto con el firmante activo y su nombre formateado
 */
export function useActiveFirmante() {
  const medicoFirmanteStore = useMedicoFirmanteStore();
  const enfermeraFirmanteStore = useEnfermeraFirmanteStore();
  const tecnicoFirmanteStore = useTecnicoFirmanteStore();
  const proveedorSaludStore = useProveedorSaludStore();

  /**
   * Determina el firmante activo según prioridad
   * Prioridad: Médico > Enfermera > Técnico
   */
  const activeFirmante = computed(() => {
    // Prioridad: Médico > Enfermera > Técnico
    if (medicoFirmanteStore.medicoFirmante?.nombre) {
      return {
        type: 'medico' as const,
        firmante: medicoFirmanteStore.medicoFirmante,
      };
    }
    
    if (enfermeraFirmanteStore.enfermeraFirmante?.nombre) {
      return {
        type: 'enfermera' as const,
        firmante: enfermeraFirmanteStore.enfermeraFirmante,
      };
    }
    
    if (tecnicoFirmanteStore.tecnicoFirmante?.nombre) {
      return {
        type: 'tecnico' as const,
        firmante: tecnicoFirmanteStore.tecnicoFirmante,
      };
    }
    
    return null;
  });

  /** Título + nombre completo (nombre + apellidos). */
  const firmanteDisplayName = computed(() => {
    const firmanteData = activeFirmante.value;

    if (!firmanteData) {
      return 'Profesional no identificado';
    }

    return formatearTituloYNombreFirmante(
      firmanteData.firmante,
      proveedorSaludStore.regimenRegulatorio,
    ) || 'Profesional no identificado';
  });

  return {
    activeFirmante,
    firmanteDisplayName,
  };
}
