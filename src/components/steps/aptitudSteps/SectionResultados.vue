<script setup>
import MicrostepAnchor from '../MicrostepAnchor.vue';
import AptitudSectionStep from './AptitudSectionStep.vue';
import Step10 from './Step10.vue';
</script>

<template>
  <AptitudSectionStep title="Resultados">
    <MicrostepAnchor :legacy-step="10">
      <Step10 variant="compact" />
    </MicrostepAnchor>
  </AptitudSectionStep>
</template>
