<script setup>
import MicrostepAnchor from '../MicrostepAnchor.vue';
import PeSectionStep from './PeSectionStep.vue';
import Step28 from './Step28.vue';
</script>

<template>
  <PeSectionStep title="Resultado del cuestionario">
    <MicrostepAnchor :legacy-step="28">
      <Step28 variant="compact" />
    </MicrostepAnchor>
  </PeSectionStep>
</template>
