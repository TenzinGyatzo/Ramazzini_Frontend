<script setup>
import MicrostepAnchor from '../MicrostepAnchor.vue';
import HcSectionStep from './HcSectionStep.vue';
import Step2 from './Step2.vue';
import Step3 from './Step3.vue';
import Step4 from './Step4.vue';
import Step5 from './Step5.vue';
import Step6 from './Step6.vue';
import Step7 from './Step7.vue';
import Step8 from './Step8.vue';
import Step9 from './Step9.vue';
import Step10 from './Step10.vue';
import Step11 from './Step11.vue';
import { enCapturaRapida } from '@/composables/capturaRapidaKey';

// Punto 39: en la captura rápida, las preguntas en dos columnas (la mitad del alto)
const capturaRapida = enCapturaRapida();
</script>

<template>
  <HcSectionStep title="Antecedentes heredofamiliares" icono="fa-users">
    <div :class="capturaRapida ? 'grid grid-cols-1 sm:grid-cols-2 gap-x-8 [&>*]:min-w-0' : ''">
      <MicrostepAnchor :legacy-step="2">
        <Step2 variant="compact" />
      </MicrostepAnchor>
      <MicrostepAnchor :legacy-step="3">
        <Step3 variant="compact" />
      </MicrostepAnchor>
      <MicrostepAnchor :legacy-step="4">
        <Step4 variant="compact" />
      </MicrostepAnchor>
      <MicrostepAnchor :legacy-step="5">
        <Step5 variant="compact" />
      </MicrostepAnchor>
      <MicrostepAnchor :legacy-step="6">
        <Step6 variant="compact" />
      </MicrostepAnchor>
      <MicrostepAnchor :legacy-step="7">
        <Step7 variant="compact" />
      </MicrostepAnchor>
      <MicrostepAnchor :legacy-step="8">
        <Step8 variant="compact" />
      </MicrostepAnchor>
      <MicrostepAnchor :legacy-step="9">
        <Step9 variant="compact" />
      </MicrostepAnchor>
      <MicrostepAnchor :legacy-step="10">
        <Step10 variant="compact" />
      </MicrostepAnchor>
      <MicrostepAnchor :legacy-step="11">
        <Step11 variant="compact" />
      </MicrostepAnchor>
    </div>
  </HcSectionStep>
</template>
