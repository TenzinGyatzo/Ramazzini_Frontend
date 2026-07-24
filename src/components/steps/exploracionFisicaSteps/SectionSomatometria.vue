<script setup>
import MicrostepAnchor from '../MicrostepAnchor.vue';
import EfSectionStep from './EfSectionStep.vue';
import Step2 from './Step2.vue';
</script>

<template>
  <EfSectionStep title="Somatometría">
    <MicrostepAnchor :legacy-step="2">
      <Step2 variant="compact" />
    </MicrostepAnchor>
  </EfSectionStep>
</template>
