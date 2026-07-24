<script setup>
import MicrostepAnchor from '../MicrostepAnchor.vue';
import PeSectionStep from './PeSectionStep.vue';
import Step18 from './Step18.vue';
import Step19 from './Step19.vue';
import Step20 from './Step20.vue';
import Step21 from './Step21.vue';
import Step22 from './Step22.vue';
</script>

<template>
  <PeSectionStep title="Contraindicaciones relativas">
    <MicrostepAnchor :legacy-step="18">
      <Step18 variant="compact" />
    </MicrostepAnchor>
    <MicrostepAnchor :legacy-step="19">
      <Step19 variant="compact" />
    </MicrostepAnchor>
    <MicrostepAnchor :legacy-step="20">
      <Step20 variant="compact" />
    </MicrostepAnchor>
    <MicrostepAnchor :legacy-step="21">
      <Step21 variant="compact" />
    </MicrostepAnchor>
    <MicrostepAnchor :legacy-step="22">
      <Step22 variant="compact" />
    </MicrostepAnchor>
  </PeSectionStep>
</template>
