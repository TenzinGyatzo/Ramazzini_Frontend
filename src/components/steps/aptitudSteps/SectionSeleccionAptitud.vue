<script setup>
import MicrostepAnchor from '../MicrostepAnchor.vue';
import AptitudSectionStep from './AptitudSectionStep.vue';
import Step8 from './Step8.vue';
</script>

<template>
  <AptitudSectionStep title="APTITUD AL PUESTO">
    <MicrostepAnchor :legacy-step="8">
      <Step8 variant="compact" />
    </MicrostepAnchor>
  </AptitudSectionStep>
</template>
