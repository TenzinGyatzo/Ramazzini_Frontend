<script setup>
import MicrostepAnchor from '../MicrostepAnchor.vue';
import PeSectionStep from './PeSectionStep.vue';
import Step7 from './Step7.vue';
import Step8 from './Step8.vue';
import Step9 from './Step9.vue';
import Step10 from './Step10.vue';
import Step11 from './Step11.vue';
import Step12 from './Step12.vue';
</script>

<template>
  <PeSectionStep title="Síntomas respiratorios">
    <MicrostepAnchor :legacy-step="7">
      <Step7 variant="compact" />
    </MicrostepAnchor>
    <MicrostepAnchor :legacy-step="8">
      <Step8 variant="compact" />
    </MicrostepAnchor>
    <div class="py-2">
      <div class="border-t border-gray-200" />
    </div>
    <MicrostepAnchor :legacy-step="9">
      <Step9 variant="compact" />
    </MicrostepAnchor>
    <div class="py-2">
      <div class="border-t border-gray-200" />
    </div>
    <MicrostepAnchor :legacy-step="10">
      <Step10 variant="compact" />
    </MicrostepAnchor>
    <MicrostepAnchor :legacy-step="11">
      <Step11 variant="compact" />
    </MicrostepAnchor>
    <div class="py-2">
      <div class="border-t border-gray-200" />
    </div>
    <MicrostepAnchor :legacy-step="12">
      <Step12 variant="compact" />
    </MicrostepAnchor>
  </PeSectionStep>
</template>
