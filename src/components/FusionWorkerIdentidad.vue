<script setup lang="ts">
import { computed } from 'vue';
import type { DuplicateWorkerSummary } from '@/interfaces/trabajador.interface';
import {
  fieldDiffers,
  labelAntiguedadWorker,
  labelEdadWorker,
  labelPuestoWorker,
  labelSexoWorker,
  nombreCompletoWorker,
} from '@/helpers/fusionWorkerCompare';

const props = defineProps<{
  registro: DuplicateWorkerSummary;
  opuesto: DuplicateWorkerSummary;
}>();

function textClass(field: Parameters<typeof fieldDiffers>[0], normal = 'text-gray-600'): string {
  if (fieldDiffers(field, props.registro, props.opuesto)) {
    return 'text-orange-600 font-semibold';
  }
  return normal;
}

const nombre = computed(() => nombreCompletoWorker(props.registro));
const puesto = computed(() => labelPuestoWorker(props.registro));
const edad = computed(() => labelEdadWorker(props.registro));
const antiguedad = computed(() => labelAntiguedadWorker(props.registro));
const sexo = computed(() => labelSexoWorker(props.registro));
const centro = computed(
  () => props.registro.nombreCentroTrabajo?.trim() || 'Centro no disponible',
);
</script>

<template>
  <div>
    <!-- Encabezado (estilo tarjeta RT) -->
    <div class="flex-1 min-w-0 mb-3">
      <h3
        class="text-lg font-semibold truncate mb-2"
        :class="textClass('nombre', 'text-gray-900')"
      >
        {{ nombre || 'Sin nombre' }}
      </h3>
      <div class="flex items-center gap-3 flex-wrap">
        <div class="inline-flex items-center gap-1.5 text-sm font-medium">
          <i class="fas fa-briefcase text-gray-500 text-sm"></i>
          <span :class="textClass('puesto')">{{ puesto }}</span>
        </div>
        <div
          v-if="sexo !== '—'"
          class="inline-flex items-center gap-1.5 text-sm"
        >
          <i
            v-if="registro.sexo === 'Masculino'"
            class="fas fa-mars text-sky-600 text-sm"
          ></i>
          <i v-else class="fas fa-venus text-rose-600 text-sm"></i>
          <span :class="textClass('sexo')">{{ sexo }}</span>
        </div>
      </div>
    </div>

    <!-- Datos laborales / demográficos -->
    <div class="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2 sm:gap-4 mb-3">
      <div class="flex items-center gap-2">
        <i class="fas fa-building text-gray-500 text-sm"></i>
        <span class="text-sm" :class="textClass('centroTrabajo')">{{ centro }}</span>
      </div>
      <div class="flex items-center gap-2">
        <i class="fas fa-birthday-cake text-emerald-500 text-sm"></i>
        <span class="text-sm" :class="textClass('fechaNacimiento')">{{ edad }}</span>
      </div>
      <div class="flex items-center gap-2">
        <i class="fas fa-clock text-cyan-500 text-sm"></i>
        <span class="text-sm" :class="textClass('fechaIngreso')">{{ antiguedad }}</span>
      </div>
    </div>

    <!-- Identificadores (mismo estilo entre sí) -->
    <div class="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2 sm:gap-4">
      <div class="flex items-center gap-2 min-w-0">
        <i class="fas fa-id-badge text-purple-500 text-sm shrink-0"></i>
        <span class="text-sm truncate" :class="textClass('numeroEmpleado')">
          No. {{ registro.numeroEmpleado || '—' }}
        </span>
      </div>
      <div class="flex items-center gap-2 min-w-0">
        <i class="fas fa-id-badge text-purple-500 text-sm shrink-0"></i>
        <span class="text-sm truncate" :class="textClass('curp')">
          CURP {{ registro.curp || '—' }}
        </span>
      </div>
      <div class="flex items-center gap-2 min-w-0">
        <i class="fas fa-id-badge text-purple-500 text-sm shrink-0"></i>
        <span class="text-sm truncate" :class="textClass('folio')">
          Folio {{ registro.folio || '—' }}
        </span>
      </div>
    </div>
  </div>
</template>
