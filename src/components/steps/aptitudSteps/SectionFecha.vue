<script setup>
import MicrostepAnchor from '../MicrostepAnchor.vue';
import AptitudSectionStep from './AptitudSectionStep.vue';
import Step1 from './Step1.vue';
</script>

<template>
  <AptitudSectionStep icono="fa-calendar-day" title="Fecha de evaluación">
    <MicrostepAnchor :legacy-step="1">
      <Step1 variant="compact" />
    </MicrostepAnchor>
  </AptitudSectionStep>
</template>
