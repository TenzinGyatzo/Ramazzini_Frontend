<script setup>
import NotaMedicaSectionStep from './NotaMedicaSectionStep.vue';
import Step9 from './Step9.vue';
import Step10 from './Step10.vue';
import Step11 from './Step11.vue';
</script>

<template>
  <NotaMedicaSectionStep title="Diagnósticos">
    <Step9 variant="compact" />
    <div class="py-3.5">
      <div class="border-t border-gray-200" />
    </div>
    <Step10 variant="compact" />
    <div class="py-3.5">
      <div class="border-t border-gray-200" />
    </div>
    <Step11 variant="compact" />
  </NotaMedicaSectionStep>
</template>
