<script setup>
import MicrostepAnchor from '../MicrostepAnchor.vue';
import PeSectionStep from './PeSectionStep.vue';
import Step13 from './Step13.vue';
import Step14 from './Step14.vue';
import Step15 from './Step15.vue';
import Step16 from './Step16.vue';
import Step17 from './Step17.vue';
</script>

<template>
  <PeSectionStep title="Antecedentes y medicamentos">
    <MicrostepAnchor :legacy-step="13">
      <Step13 variant="compact" />
    </MicrostepAnchor>
    <MicrostepAnchor :legacy-step="14">
      <Step14 variant="compact" />
    </MicrostepAnchor>
    <MicrostepAnchor :legacy-step="15">
      <Step15 variant="compact" />
    </MicrostepAnchor>
    <MicrostepAnchor :legacy-step="16">
      <Step16 variant="compact" />
    </MicrostepAnchor>
    <div class="py-2">
      <div class="border-t border-gray-200" />
    </div>
    <MicrostepAnchor :legacy-step="17">
      <Step17 variant="compact" />
    </MicrostepAnchor>
  </PeSectionStep>
</template>
