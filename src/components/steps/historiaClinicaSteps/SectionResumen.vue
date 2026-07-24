<script setup>
import MicrostepAnchor from '../MicrostepAnchor.vue';
import HcSectionStep from './HcSectionStep.vue';
import Step46 from './Step46.vue';
</script>

<template>
  <HcSectionStep title="Resumen">
    <MicrostepAnchor :legacy-step="46">
      <Step46 variant="compact" />
    </MicrostepAnchor>
  </HcSectionStep>
</template>
