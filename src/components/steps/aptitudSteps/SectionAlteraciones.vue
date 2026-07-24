<script setup>
import MicrostepAnchor from '../MicrostepAnchor.vue';
import AptitudSectionStep from './AptitudSectionStep.vue';
import Step9 from './Step9.vue';
</script>

<template>
  <AptitudSectionStep title="Alteraciones de salud">
    <MicrostepAnchor :legacy-step="9">
      <Step9 variant="compact" />
    </MicrostepAnchor>
  </AptitudSectionStep>
</template>
