<script setup>
import MicrostepAnchor from '../MicrostepAnchor.vue';
import AntidopingSectionStep from './AntidopingSectionStep.vue';
import Step1 from './Step1.vue';
import Step2 from './Step2.vue';
</script>

<template>
  <AntidopingSectionStep title="Prueba Antidoping">
    <MicrostepAnchor :legacy-step="1">
      <Step1 variant="compact" />
    </MicrostepAnchor>
    <!-- padding (no margin): space-y del shell pisa mt/mb del hijo -->
    <div class="py-2.5">
      <div class="border-t border-gray-200" />
    </div>
    <MicrostepAnchor :legacy-step="2">
      <Step2 variant="compact" />
    </MicrostepAnchor>
  </AntidopingSectionStep>
</template>
