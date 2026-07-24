<script setup>
import MicrostepAnchor from '../MicrostepAnchor.vue';
import PeSectionStep from './PeSectionStep.vue';
import Step2 from './Step2.vue';
import Step3 from './Step3.vue';
import Step4 from './Step4.vue';
import Step5 from './Step5.vue';
import Step6 from './Step6.vue';
</script>

<template>
  <PeSectionStep title="Factores de riesgo respiratorio">
    <MicrostepAnchor :legacy-step="2">
      <Step2 variant="compact" />
    </MicrostepAnchor>
    <div class="py-2">
      <div class="border-t border-gray-200" />
    </div>
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
  </PeSectionStep>
</template>
