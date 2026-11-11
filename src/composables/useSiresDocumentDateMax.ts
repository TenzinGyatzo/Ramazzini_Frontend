import { computed } from 'vue';
import { format, subDays } from 'date-fns';
import { useNom024Fields } from '@/composables/useNom024Fields';
import { useCurrentUser } from '@/composables/useCurrentUser';
import { useTrabajadoresStore } from '@/stores/trabajadores';
import { useMedicoFirmanteStore } from '@/stores/medicoFirmante';
import { useEnfermeraFirmanteStore } from '@/stores/enfermeraFirmante';
import { useTecnicoFirmanteStore } from '@/stores/tecnicoFirmante';
import { resolveFirmanteTipo } from '@/constants/rolePermissionPolicy';
import {
  fechasMinimasPorEdad,
  mensajeEdadEnFechaDocumento,
} from '@/helpers/edadEnFechaDocumento';

/** Antigüedad máxima (días naturales, inclusive) de la fecha de atención en SIRES_NOM024. */
export const DOCUMENT_DATE_MAX_LOOKBACK_DAYS = 30;

/**
 * Límites del selector de fecha de documentos clínicos en SIRES_NOM024:
 * - max: hoy
 * - min: el más tardío entre hoy − 30 días naturales, el día en que el trabajador cumple 17
 *   y el día en que el firmante cumple 18 (regla E2; `conEdades: false` para documentos
 *   externos y resultados clínicos, que no la llevan).
 * En SIN_REGIMEN retorna undefined (sin restricción en el selector).
 */
export function useSiresDocumentDateMax(options: { conEdades?: boolean } = {}) {
  const conEdades = options.conEdades !== false;
  const { isSIRES } = useNom024Fields();
  const trabajadores = useTrabajadoresStore();
  const { currentUser } = useCurrentUser();
  const medicoStore = useMedicoFirmanteStore();
  const enfermeraStore = useEnfermeraFirmanteStore();
  const tecnicoStore = useTecnicoFirmanteStore();

  const firmanteNacimiento = computed(() => {
    const tipo = resolveFirmanteTipo(currentUser.value?.role, currentUser.value?.perfilProfesional);
    const firmante =
      tipo === 'medico'
        ? medicoStore.medicoFirmante
        : tipo === 'enfermera'
          ? enfermeraStore.enfermeraFirmante
          : tipo === 'tecnico'
            ? (tecnicoStore as { tecnicoFirmante?: { fechaNacimiento?: string } | null }).tecnicoFirmante
            : null;
    return (firmante as { fechaNacimiento?: string } | null)?.fechaNacimiento ?? null;
  });

  const edades = computed(() => ({
    trabajadorNacimiento: trabajadores.currentTrabajador?.fechaNacimiento ?? null,
    firmanteNacimiento: firmanteNacimiento.value,
  }));

  const fechaDocumentoMax = computed(() => {
    if (!isSIRES.value) return undefined;
    return format(new Date(), 'yyyy-MM-dd');
  });

  const fechaDocumentoMin = computed(() => {
    if (!isSIRES.value) return undefined;
    const limites = [format(subDays(new Date(), DOCUMENT_DATE_MAX_LOOKBACK_DAYS), 'yyyy-MM-dd')];
    if (conEdades) {
      const { trabajador, firmante } = fechasMinimasPorEdad(edades.value);
      if (trabajador) limites.push(trabajador);
      if (firmante) limites.push(firmante);
    }
    return limites.sort().at(-1);
  });

  /** Mensaje si la fecha es anterior a la edad mínima del trabajador o del firmante; '' si no. */
  const mensajeEdadEnFecha = (fechaDocumento: string | Date | null | undefined): string => {
    if (!isSIRES.value || !conEdades) return '';
    return mensajeEdadEnFechaDocumento(fechaDocumento, edades.value);
  };

  return { fechaDocumentoMax, fechaDocumentoMin, mensajeEdadEnFecha };
}
