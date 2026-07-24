<script setup>
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
    <Step7 variant="compact" />
    <Step8 variant="compact" />
    <div class="py-2">
      <div class="border-t border-gray-200" />
    </div>
    <Step9 variant="compact" />
    <div class="py-2">
      <div class="border-t border-gray-200" />
    </div>
    <Step10 variant="compact" />
    <Step11 variant="compact" />
    <div class="py-2">
      <div class="border-t border-gray-200" />
    </div>
    <Step12 variant="compact" />
  </PeSectionStep>
</template>
