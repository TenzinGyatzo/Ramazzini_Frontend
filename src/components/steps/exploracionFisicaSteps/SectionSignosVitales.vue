<script setup>
import MicrostepAnchor from '../MicrostepAnchor.vue';
import EfSectionStep from './EfSectionStep.vue';
import Step3 from './Step3.vue';
</script>

<template>
  <EfSectionStep title="Signos vitales">
    <MicrostepAnchor :legacy-step="3">
      <Step3 variant="compact" />
    </MicrostepAnchor>
  </EfSectionStep>
</template>
