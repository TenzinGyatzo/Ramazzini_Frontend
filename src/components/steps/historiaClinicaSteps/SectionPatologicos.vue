<script setup>
import MicrostepAnchor from '../MicrostepAnchor.vue';
import HcSectionStep from './HcSectionStep.vue';
import Step12 from './Step12.vue';
import Step13 from './Step13.vue';
import Step14 from './Step14.vue';
import Step15 from './Step15.vue';
import Step16 from './Step16.vue';
import Step17 from './Step17.vue';
import Step18 from './Step18.vue';
import Step19 from './Step19.vue';
import Step20 from './Step20.vue';
import Step21 from './Step21.vue';
</script>

<template>
  <HcSectionStep title="Antecedentes personales patológicos">
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
    <MicrostepAnchor :legacy-step="16">
      <Step16 variant="compact" />
    </MicrostepAnchor>
    <MicrostepAnchor :legacy-step="17">
      <Step17 variant="compact" />
    </MicrostepAnchor>
    <MicrostepAnchor :legacy-step="18">
      <Step18 variant="compact" />
    </MicrostepAnchor>
    <MicrostepAnchor :legacy-step="19">
      <Step19 variant="compact" />
    </MicrostepAnchor>
    <MicrostepAnchor :legacy-step="20">
      <Step20 variant="compact" />
    </MicrostepAnchor>
    <MicrostepAnchor :legacy-step="21">
      <Step21 variant="compact" />
    </MicrostepAnchor>
  </HcSectionStep>
</template>
