<script setup>
// Trabajo anterior 3: el contenido está en EmpleoAnterior (punto 39; antes, tres copias)
import EmpleoAnterior from './EmpleoAnterior.vue';

defineProps({
  variant: {
    type: String,
    default: 'fullscreen',
    validator: (v) => ['fullscreen', 'compact'].includes(v),
  },
});
</script>

<template>
  <EmpleoAnterior :numero="3" :variant="variant" />
</template>
