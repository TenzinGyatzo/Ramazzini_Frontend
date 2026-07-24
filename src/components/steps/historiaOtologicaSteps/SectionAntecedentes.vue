<script setup>
import MicrostepAnchor from '../MicrostepAnchor.vue';
import HoSectionStep from './HoSectionStep.vue';
import Step8 from './Step8.vue';
import Step9 from './Step9.vue';
import Step10 from './Step10.vue';
import Step11 from './Step11.vue';
import Step12 from './Step12.vue';
import Step13 from './Step13.vue';
import Step14 from './Step14.vue';
import Step15 from './Step15.vue';
</script>

<template>
  <HoSectionStep title="Antecedentes personales">
    <MicrostepAnchor :legacy-step="8">
      <Step8 variant="compact" />
    </MicrostepAnchor>
    <MicrostepAnchor :legacy-step="9">
      <Step9 variant="compact" />
    </MicrostepAnchor>
    <MicrostepAnchor :legacy-step="10">
      <Step10 variant="compact" />
    </MicrostepAnchor>
    <MicrostepAnchor :legacy-step="11">
      <Step11 variant="compact" />
    </MicrostepAnchor>
    <MicrostepAnchor :legacy-step="12">
      <Step12 variant="compact" />
    </MicrostepAnchor>
    <MicrostepAnchor :legacy-step="13">
      <Step13 variant="compact" />
    </MicrostepAnchor>
    <MicrostepAnchor :legacy-step="14">
      <Step14 variant="compact" />
    </MicrostepAnchor>
    <MicrostepAnchor :legacy-step="15">
      <Step15 variant="compact" />
    </MicrostepAnchor>
  </HoSectionStep>
</template>
