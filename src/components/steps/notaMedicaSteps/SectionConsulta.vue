<script setup>
import MicrostepAnchor from '../MicrostepAnchor.vue';
import NotaMedicaSectionStep from './NotaMedicaSectionStep.vue';
import Step1 from './Step1.vue';
import Step2 from './Step2.vue';
import { enCapturaRapida } from '@/composables/capturaRapidaKey';

const capturaRapida = enCapturaRapida();
</script>

<template>
  <NotaMedicaSectionStep title="Datos de la consulta" icono="fa-stethoscope">
    <MicrostepAnchor :legacy-step="1">
      <Step1 variant="compact" />
    </MicrostepAnchor>
    <div v-if="capturaRapida" class="h-4" />
    <div v-else class="py-2.5">
      <div class="border-t border-gray-200 dark:border-slate-700" />
    </div>
    <MicrostepAnchor :legacy-step="2">
      <Step2 variant="compact" />
    </MicrostepAnchor>
  </NotaMedicaSectionStep>
</template>
