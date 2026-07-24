<script setup>
import MicrostepAnchor from '../MicrostepAnchor.vue';
import HoSectionStep from './HoSectionStep.vue';
import Step2 from './Step2.vue';
import Step3 from './Step3.vue';
import Step4 from './Step4.vue';
import Step5 from './Step5.vue';
import Step6 from './Step6.vue';
import Step7 from './Step7.vue';
</script>

<template>
  <HoSectionStep title="Últimos 2 meses">
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
  </HoSectionStep>
</template>
