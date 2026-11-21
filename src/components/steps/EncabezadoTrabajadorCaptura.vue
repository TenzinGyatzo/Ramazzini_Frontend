<script setup lang="ts">
/**
 * Captura rápida (punto 38): datos básicos del trabajador arriba del formulario, para saber
 * a quién se le está capturando sin abrir la vista previa. Edad y antigüedad a la fecha del
 * documento, como en el documento impreso.
 */
import { computed } from 'vue';
import { useTrabajadoresStore } from '@/stores/trabajadores';
import { useEmpresasStore } from '@/stores/empresas';
import { useEdadAntiguedadDocumento } from '@/composables/useEdadAntiguedadDocumento';
import { formatNombreCompleto } from '@/helpers/formatNombreCompleto';

const props = defineProps<{ fechaDocumento?: Date | string | null }>();

const trabajadores = useTrabajadoresStore();
const empresas = useEmpresasStore();
const { edad, antiguedad } = useEdadAntiguedadDocumento(() => props.fechaDocumento);

const trabajador = computed(() => trabajadores.currentTrabajador as Record<string, any> | null);

const datos = computed(() => {
  const t = trabajador.value;
  if (!t) return [];
  return [
    t.sexo ? { etiqueta: 'Sexo', valor: t.sexo } : null,
    edad.value != null ? { etiqueta: 'Edad', valor: `${edad.value} años` } : null,
    t.puesto ? { etiqueta: 'Puesto', valor: t.puesto } : null,
    antiguedad.value && antiguedad.value !== '-' ? { etiqueta: 'Antigüedad', valor: antiguedad.value } : null,
    t.numeroEmpleado ? { etiqueta: 'No. de empleado', valor: t.numeroEmpleado } : null,
    empresas.currentEmpresa?.nombreComercial
      ? { etiqueta: 'Empresa', valor: empresas.currentEmpresa.nombreComercial }
      : null,
  ].filter((d): d is { etiqueta: string; valor: string } => d !== null);
});
</script>

<template>
  <div
    v-if="trabajador"
    data-encabezado-trabajador
    class="mb-3 px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/60"
  >
    <p class="font-semibold text-gray-900 dark:text-slate-100 leading-tight">
      <i class="fas fa-user text-gray-400 mr-1.5" aria-hidden="true"></i>{{ formatNombreCompleto(trabajador as any) }}
    </p>
    <dl class="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-gray-600 dark:text-slate-300">
      <div v-for="d in datos" :key="d.etiqueta" class="flex gap-1">
        <dt class="text-gray-500 dark:text-slate-400">{{ d.etiqueta }}:</dt>
        <dd class="font-medium">{{ d.valor }}</dd>
      </div>
    </dl>
  </div>
</template>
