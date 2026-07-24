<script setup>
import MicrostepAnchor from '../MicrostepAnchor.vue';
import PeSectionStep from './PeSectionStep.vue';
import Step23 from './Step23.vue';
import Step24 from './Step24.vue';
import Step25 from './Step25.vue';
import Step26 from './Step26.vue';
import Step27 from './Step27.vue';
</script>

<template>
  <PeSectionStep title="Contraindicaciones absolutas">
    <MicrostepAnchor :legacy-step="23">
      <Step23 variant="compact" />
    </MicrostepAnchor>
    <MicrostepAnchor :legacy-step="24">
      <Step24 variant="compact" />
    </MicrostepAnchor>
    <MicrostepAnchor :legacy-step="25">
      <Step25 variant="compact" />
    </MicrostepAnchor>
    <MicrostepAnchor :legacy-step="26">
      <Step26 variant="compact" />
    </MicrostepAnchor>
    <MicrostepAnchor :legacy-step="27">
      <Step27 variant="compact" />
    </MicrostepAnchor>
  </PeSectionStep>
</template>
