<script setup>
import NotaMedicaSectionStep from './NotaMedicaSectionStep.vue';
import Step1 from './Step1.vue';
import Step2 from './Step2.vue';
</script>

<template>
  <NotaMedicaSectionStep title="Consulta">
    <Step1 variant="compact" />
    <div class="py-2.5">
      <div class="border-t border-gray-200" />
    </div>
    <Step2 variant="compact" />
  </NotaMedicaSectionStep>
</template>
