<script setup>
import MicrostepAnchor from '../MicrostepAnchor.vue';
import HoSectionStep from './HoSectionStep.vue';
import Step22 from './Step22.vue';
import Step23 from './Step23.vue';
import Step24 from './Step24.vue';
</script>

<template>
  <HoSectionStep title="Otros y otoscopia">
    <MicrostepAnchor :legacy-step="22">
      <Step22 variant="compact" />
    </MicrostepAnchor>
    <MicrostepAnchor :legacy-step="23">
      <Step23 variant="compact" />
    </MicrostepAnchor>
    <div class="py-2">
      <div class="border-t border-gray-200" />
    </div>
    <MicrostepAnchor :legacy-step="24">
      <Step24 variant="compact" />
    </MicrostepAnchor>
  </HoSectionStep>
</template>
