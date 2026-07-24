<script setup>
import MicrostepAnchor from '../MicrostepAnchor.vue';
import CertificadoSectionStep from './CertificadoSectionStep.vue';
import Step1 from './Step1.vue';
import Step2 from './Step2.vue';
</script>

<template>
  <CertificadoSectionStep title="Certificado de Salud">
    <MicrostepAnchor :legacy-step="1">
      <Step1 variant="compact" />
    </MicrostepAnchor>
    <!-- padding (no margin): space-y del shell pisa mt/mb del hijo -->
    <div class="py-6">
      <div class="border-t border-gray-200" />
    </div>
    <MicrostepAnchor :legacy-step="2">
      <Step2 variant="compact" />
    </MicrostepAnchor>
  </CertificadoSectionStep>
</template>
