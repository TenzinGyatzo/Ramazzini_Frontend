<script setup>
import MicrostepAnchor from '../MicrostepAnchor.vue';
import EfSectionStep from './EfSectionStep.vue';
import Step1 from './Step1.vue';
</script>

<template>
  <EfSectionStep title="Fecha">
    <MicrostepAnchor :legacy-step="1">
      <Step1 variant="compact" />
    </MicrostepAnchor>
  </EfSectionStep>
</template>
