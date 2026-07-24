<script setup>
import NotaMedicaSectionStep from './NotaMedicaSectionStep.vue';
import Step12 from './Step12.vue';
import Step13 from './Step13.vue';
import Step14 from './Step14.vue';
</script>

<template>
  <NotaMedicaSectionStep title="Plan">
    <Step12 variant="compact" />
    <div class="py-2.5">
      <div class="border-t border-gray-200" />
    </div>
    <Step13 variant="compact" />
    <div class="py-2.5">
      <div class="border-t border-gray-200" />
    </div>
    <Step14 variant="compact" />
  </NotaMedicaSectionStep>
</template>
