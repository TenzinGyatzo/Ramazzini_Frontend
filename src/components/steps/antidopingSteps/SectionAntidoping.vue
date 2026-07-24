<script setup>
import AntidopingSectionStep from './AntidopingSectionStep.vue';
import Step1 from './Step1.vue';
import Step2 from './Step2.vue';
</script>

<template>
  <AntidopingSectionStep title="Prueba Antidoping">
    <Step1 variant="compact" />
    <!-- padding (no margin): space-y del shell pisa mt/mb del hijo -->
    <div class="py-2.5">
      <div class="border-t border-gray-200" />
    </div>
    <Step2 variant="compact" />
  </AntidopingSectionStep>
</template>
