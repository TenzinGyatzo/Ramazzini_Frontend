<script setup>
// Punto 45: las seis evaluaciones adicionales son la misma pieza (EvaluacionAdicional)
import EvaluacionAdicional from './EvaluacionAdicional.vue';

defineProps({ variant: { type: String, default: 'fullscreen' } });
</script>

<template>
  <EvaluacionAdicional :n="3" :variant="variant" />
</template>
