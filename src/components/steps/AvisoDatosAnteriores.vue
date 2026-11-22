<script setup lang="ts">
/**
 * Punto (54): aviso discreto de que el documento nuevo trae datos del anterior, con la opción de
 * empezar en blanco.
 */
import { computed } from 'vue';
import { datosAnteriores } from '@/helpers/datosDocumentoAnterior';

const emit = defineEmits<{ (e: 'en-blanco'): void }>();

const texto = computed(() =>
  datosAnteriores.tipo === 'exploracionFisica'
    ? `Altura y hallazgos tomados de la exploración física del ${datosAnteriores.fecha}. Confírmalos al explorar.`
    : `Antecedentes tomados de la historia clínica del ${datosAnteriores.fecha}. Confírmalos con el trabajador.`,
);
</script>

<template>
  <div
    v-if="datosAnteriores.fecha"
    data-aviso-datos-anteriores
    role="status"
    class="mb-3 flex flex-wrap items-baseline gap-x-2 gap-y-1 rounded-md border border-sky-200 bg-sky-50 px-3 py-2 text-xs text-sky-900"
  >
    <i class="fas fa-clock-rotate-left text-sky-600" aria-hidden="true"></i>
    <span class="flex-1 min-w-0">{{ texto }}</span>
    <button
      type="button"
      class="font-medium text-sky-700 underline underline-offset-2 hover:text-sky-900"
      @click="emit('en-blanco')"
    >
      Empezar en blanco
    </button>
  </div>
</template>
