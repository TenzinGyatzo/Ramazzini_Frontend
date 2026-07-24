<script setup>
import MicrostepAnchor from '../MicrostepAnchor.vue';
import AptitudSectionStep from './AptitudSectionStep.vue';
import Step1 from './Step1.vue';
</script>

<template>
  <AptitudSectionStep title="Fecha de Evaluación">
    <MicrostepAnchor :legacy-step="1">
      <Step1 variant="compact" />
    </MicrostepAnchor>
  </AptitudSectionStep>
</template>
