<script setup>
import MicrostepAnchor from '../MicrostepAnchor.vue';
import HoSectionStep from './HoSectionStep.vue';
import Step25 from './Step25.vue';
</script>

<template>
  <HoSectionStep title="Resultado del cuestionario">
    <MicrostepAnchor :legacy-step="25">
      <Step25 variant="compact" />
    </MicrostepAnchor>
  </HoSectionStep>
</template>
