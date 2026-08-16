import { computed, toValue, type MaybeRefOrGetter } from 'vue';
import { useTrabajadoresStore } from '@/stores/trabajadores';
import { calcularEdad, calcularAntiguedad } from '@/helpers/dates';

/**
 * Edad y antigüedad del trabajador calculadas contra la fecha del documento clínico.
 * Si la fecha del documento aún no está capturada, usa hoy como fallback.
 */
export function useEdadAntiguedadDocumento(
  fechaDocumento: MaybeRefOrGetter<Date | string | null | undefined>,
) {
  const trabajadores = useTrabajadoresStore();

  const edad = computed(() => {
    const fechaNac = trabajadores.currentTrabajador?.fechaNacimiento;
    if (!fechaNac) return null;
    const ref = toValue(fechaDocumento) ?? undefined;
    return calcularEdad(fechaNac, ref);
  });

  const antiguedad = computed(() => {
    const fechaIngreso = trabajadores.currentTrabajador?.fechaIngreso;
    if (!fechaIngreso) return '-';
    const ref = toValue(fechaDocumento) ?? undefined;
    return calcularAntiguedad(fechaIngreso, ref);
  });

  return { edad, antiguedad };
}
