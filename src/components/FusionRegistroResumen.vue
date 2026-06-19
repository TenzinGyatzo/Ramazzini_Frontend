<script setup lang="ts">
import { computed } from 'vue';
import { convertirFechaISOaDDMMYYYY } from '@/helpers/dates';
import {
  lineasDocumentosExpediente,
  lineasOtrosVinculados,
  formatCountLabel,
  TIPO_ESTUDIO_LABELS,
  RESULTADO_GLOBAL_LABELS,
} from '@/helpers/fusionPreviewDisplay';
import type {
  FusionResultadoClinicoSummary,
  FusionRiesgoTrabajoSummary,
} from '@/interfaces/trabajador.interface';

const props = defineProps<{
  conteos: Record<string, number>;
  resultadosClinicos: FusionResultadoClinicoSummary[];
  riesgosTrabajo: FusionRiesgoTrabajoSummary[];
  compact?: boolean;
  /** Disponer las 4 secciones en 2 columnas (p. ej. resumen de migración). */
  twoColumns?: boolean;
  /** Si false, oculta la sección de riesgos de trabajo por completo. */
  mostrarRiesgosTrabajo?: boolean;
}>();

const mostrarRiesgos = computed(() => props.mostrarRiesgosTrabajo !== false);

const lineasExpediente = computed(() => lineasDocumentosExpediente(props.conteos));
const lineasVinculados = computed(() => lineasOtrosVinculados(props.conteos));

const totalExpediente = computed(() =>
  lineasExpediente.value.reduce((s, l) => s + l.count, 0),
);

function formatFecha(iso: string): string {
  if (!iso) return '—';
  try {
    return convertirFechaISOaDDMMYYYY(iso);
  } catch {
    return iso.slice(0, 10);
  }
}

function labelTipoEstudio(tipo: string): string {
  return TIPO_ESTUDIO_LABELS[tipo] ?? tipo.replace(/_/g, ' ');
}

function labelResultadoGlobal(valor?: string): string {
  if (!valor) return '';
  return RESULTADO_GLOBAL_LABELS[valor] ?? valor;
}
</script>

<template>
  <div
    :class="[
      twoColumns ? 'grid grid-cols-1 md:grid-cols-2 gap-3' : 'space-y-3',
      compact ? 'text-xs' : 'text-sm',
    ]"
  >
    <!-- Expediente médico -->
    <div class="bg-gray-50 rounded-lg p-3 border border-gray-100">
      <p class="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
        <i class="fas fa-folder-open text-gray-500"></i>
        Expediente médico
        <span v-if="totalExpediente > 0" class="font-normal text-gray-500">
          ({{ totalExpediente }} documento{{ totalExpediente !== 1 ? 's' : '' }})
        </span>
      </p>
      <div
        v-if="lineasExpediente.length"
        class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs"
      >
        <div
          v-for="linea in lineasExpediente"
          :key="linea.modelName"
          class="flex items-center gap-2 min-w-0"
        >
          <i :class="[linea.icon, linea.iconClass, 'shrink-0']"></i>
          <span class="truncate">
            {{ formatCountLabel(linea.count, linea.labelSingular, linea.labelPlural) }}
          </span>
        </div>
      </div>
      <p v-else class="text-xs text-gray-500 italic">Sin documentos en el expediente</p>
    </div>

    <!-- Resultados clínicos (estudios) -->
    <div class="bg-violet-50 rounded-lg p-3 border border-violet-100">
      <p class="text-xs font-semibold text-violet-900 mb-2 flex items-center gap-1.5">
        <i class="fas fa-microscope text-violet-600"></i>
        Resultados clínicos (estudios)
        <span v-if="resultadosClinicos.length" class="font-normal text-violet-700">
          ({{ resultadosClinicos.length }})
        </span>
      </p>
      <ul v-if="resultadosClinicos.length" class="space-y-1.5 text-xs text-violet-950">
        <li
          v-for="rc in resultadosClinicos"
          :key="rc._id"
          class="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 pl-1 border-l-2 border-violet-200"
        >
          <span class="font-medium">{{ labelTipoEstudio(rc.tipoEstudio) }}</span>
          <span class="text-violet-700">{{ formatFecha(rc.fechaEstudio) }}</span>
          <span
            v-if="rc.resultadoGlobal"
            class="inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium bg-violet-100 text-violet-800"
          >
            {{ labelResultadoGlobal(rc.resultadoGlobal) }}
          </span>
        </li>
      </ul>
      <p v-else class="text-xs text-violet-700/70 italic">Sin resultados clínicos registrados</p>
    </div>

    <!-- Riesgos de trabajo -->
    <div
      v-if="mostrarRiesgos"
      class="bg-orange-50 rounded-lg p-3 border border-orange-100"
    >
      <p class="text-xs font-semibold text-orange-900 mb-2 flex items-center gap-1.5">
        <i class="fas fa-hard-hat text-orange-600"></i>
        Riesgos de trabajo
        <span v-if="riesgosTrabajo.length" class="font-normal text-orange-700">
          ({{ riesgosTrabajo.length }})
        </span>
      </p>
      <ul v-if="riesgosTrabajo.length" class="space-y-1.5 text-xs text-orange-950">
        <li
          v-for="rt in riesgosTrabajo"
          :key="rt._id"
          class="pl-1 border-l-2 border-orange-200 space-y-0.5"
        >
          <div class="flex flex-wrap items-baseline gap-x-2">
            <span class="font-medium">{{ rt.tipoRiesgo || 'Riesgo de trabajo' }}</span>
            <span class="text-orange-700">{{ formatFecha(rt.fechaRiesgo) }}</span>
          </div>
          <p v-if="rt.naturalezaLesion" class="text-orange-800/90">
            {{ rt.naturalezaLesion }}
            <template v-if="rt.parteCuerpoAfectada">
              · {{ rt.parteCuerpoAfectada }}
            </template>
          </p>
        </li>
      </ul>
      <p v-else class="text-xs text-orange-700/70 italic">Sin riesgos de trabajo registrados</p>
    </div>

    <!-- Otros registros vinculados -->
    <div
      v-if="lineasVinculados.length"
      class="bg-slate-50 rounded-lg p-3 border border-slate-100"
    >
      <p class="text-xs font-semibold text-slate-700 mb-2 flex items-center gap-1.5">
        <i class="fas fa-link text-slate-500"></i>
        Otros registros vinculados
      </p>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
        <div
          v-for="linea in lineasVinculados"
          :key="linea.modelName"
          class="flex items-center gap-2 min-w-0"
        >
          <i :class="[linea.icon, linea.iconClass, 'shrink-0']"></i>
          <span class="truncate">
            {{ formatCountLabel(linea.count, linea.labelSingular, linea.labelPlural) }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>
