<script setup>
import MicrostepAnchor from '../MicrostepAnchor.vue';
import PeSectionStep from './PeSectionStep.vue';
import Step1 from './Step1.vue';
</script>

<template>
  <PeSectionStep title="Fecha del cuestionario">
    <MicrostepAnchor :legacy-step="1">
      <Step1 variant="compact" />
    </MicrostepAnchor>
  </PeSectionStep>
</template>
