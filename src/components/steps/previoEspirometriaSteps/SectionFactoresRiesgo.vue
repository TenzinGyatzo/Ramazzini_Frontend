<script setup>
import PeSectionStep from './PeSectionStep.vue';
import Step2 from './Step2.vue';
import Step3 from './Step3.vue';
import Step4 from './Step4.vue';
import Step5 from './Step5.vue';
import Step6 from './Step6.vue';
</script>

<template>
  <PeSectionStep title="Factores de riesgo respiratorio">
    <Step2 variant="compact" />
    <div class="py-2">
      <div class="border-t border-gray-200" />
    </div>
    <Step3 variant="compact" />
    <Step4 variant="compact" />
    <Step5 variant="compact" />
    <Step6 variant="compact" />
  </PeSectionStep>
</template>
