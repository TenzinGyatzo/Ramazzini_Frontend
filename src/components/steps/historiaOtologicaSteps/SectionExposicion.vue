<script setup>
import MicrostepAnchor from '../MicrostepAnchor.vue';
import HoSectionStep from './HoSectionStep.vue';
import Step16 from './Step16.vue';
import Step17 from './Step17.vue';
import Step18 from './Step18.vue';
import Step19 from './Step19.vue';
import Step20 from './Step20.vue';
import Step21 from './Step21.vue';
</script>

<template>
  <HoSectionStep title="Exposición a ruido">
    <MicrostepAnchor :legacy-step="16">
      <Step16 variant="compact" />
    </MicrostepAnchor>
    <div class="py-2">
      <div class="border-t border-gray-200" />
    </div>
    <MicrostepAnchor :legacy-step="17">
      <Step17 variant="compact" />
    </MicrostepAnchor>
    <div class="py-2">
      <div class="border-t border-gray-200" />
    </div>
    <MicrostepAnchor :legacy-step="18">
      <Step18 variant="compact" />
    </MicrostepAnchor>
    <div class="py-2">
      <div class="border-t border-gray-200" />
    </div>
    <MicrostepAnchor :legacy-step="19">
      <Step19 variant="compact" />
    </MicrostepAnchor>
    <MicrostepAnchor :legacy-step="20">
      <Step20 variant="compact" />
    </MicrostepAnchor>
    <MicrostepAnchor :legacy-step="21">
      <Step21 variant="compact" />
    </MicrostepAnchor>
  </HoSectionStep>
</template>
