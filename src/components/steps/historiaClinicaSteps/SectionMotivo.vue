<script setup>
import MicrostepAnchor from '../MicrostepAnchor.vue';
import HcSectionStep from './HcSectionStep.vue';
import Step1 from './Step1.vue';
</script>

<template>
  <HcSectionStep title="Motivo del examen">
    <MicrostepAnchor :legacy-step="1">
      <Step1 variant="compact" />
    </MicrostepAnchor>
  </HcSectionStep>
</template>
