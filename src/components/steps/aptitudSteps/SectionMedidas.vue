<script setup>
import MicrostepAnchor from '../MicrostepAnchor.vue';
import AptitudSectionStep from './AptitudSectionStep.vue';
import Step11 from './Step11.vue';
</script>

<template>
  <AptitudSectionStep title="Medidas preventivas">
    <MicrostepAnchor :legacy-step="11">
      <Step11 variant="compact" />
    </MicrostepAnchor>
  </AptitudSectionStep>
</template>
