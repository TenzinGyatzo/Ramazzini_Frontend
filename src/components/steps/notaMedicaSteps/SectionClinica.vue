<script setup>
import NotaMedicaSectionStep from './NotaMedicaSectionStep.vue';
import Step4 from './Step4.vue';
import Step5 from './Step5.vue';
</script>

<template>
  <NotaMedicaSectionStep title="Antecedentes y exploración">
    <Step4 variant="compact" />
    <div class="py-2.5">
      <div class="border-t border-gray-200" />
    </div>
    <Step5 variant="compact" />
  </NotaMedicaSectionStep>
</template>
