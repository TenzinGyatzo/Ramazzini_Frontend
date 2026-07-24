<script setup>
import MicrostepAnchor from '../MicrostepAnchor.vue';
import HoSectionStep from './HoSectionStep.vue';
import Step1 from './Step1.vue';
</script>

<template>
  <HoSectionStep title="Fecha de valoración">
    <MicrostepAnchor :legacy-step="1">
      <Step1 variant="compact" />
    </MicrostepAnchor>
  </HoSectionStep>
</template>
