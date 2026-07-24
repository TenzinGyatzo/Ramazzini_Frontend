<script setup>
import MicrostepAnchor from '../MicrostepAnchor.vue';
import EfSectionStep from './EfSectionStep.vue';
import Step31 from './Step31.vue';
</script>

<template>
  <EfSectionStep title="Resumen">
    <MicrostepAnchor :legacy-step="31">
      <Step31 variant="compact" />
    </MicrostepAnchor>
  </EfSectionStep>
</template>
