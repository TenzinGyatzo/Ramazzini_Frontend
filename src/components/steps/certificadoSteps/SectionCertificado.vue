<script setup>
import CertificadoSectionStep from './CertificadoSectionStep.vue';
import Step1 from './Step1.vue';
import Step2 from './Step2.vue';
</script>

<template>
  <CertificadoSectionStep title="Certificado de Salud">
    <Step1 variant="compact" />
    <!-- padding (no margin): space-y del shell pisa mt/mb del hijo -->
    <div class="py-6">
      <div class="border-t border-gray-200" />
    </div>
    <Step2 variant="compact" />
  </CertificadoSectionStep>
</template>
