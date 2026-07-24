<script setup>
import PeSectionStep from './PeSectionStep.vue';
import Step13 from './Step13.vue';
import Step14 from './Step14.vue';
import Step15 from './Step15.vue';
import Step16 from './Step16.vue';
import Step17 from './Step17.vue';
</script>

<template>
  <PeSectionStep title="Antecedentes y medicamentos">
    <Step13 variant="compact" />
    <Step14 variant="compact" />
    <Step15 variant="compact" />
    <Step16 variant="compact" />
    <div class="py-2">
      <div class="border-t border-gray-200" />
    </div>
    <Step17 variant="compact" />
  </PeSectionStep>
</template>
