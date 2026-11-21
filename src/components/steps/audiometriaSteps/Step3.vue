<script setup>
// Punto 44: los umbrales de los dos oídos son la misma pieza (UmbralesOido)
import UmbralesOido from './UmbralesOido.vue';

defineProps({ variant: { type: String, default: '' } });
</script>

<template>
  <UmbralesOido lado="Izquierdo" :variant="variant" />
</template>
