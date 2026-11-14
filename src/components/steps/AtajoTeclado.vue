<script setup>
/** Atajo de teclado discreto («Alt ← anterior»): solo en laptop o PC, con el estilo de IndicacionTab. */
import { esComputadora } from '@/composables/useAutofocoPrimerVacio';

defineProps({
  teclas: { type: Array, required: true },
  texto: { type: String, required: true },
});

const visible = esComputadora();
</script>

<template>
  <span v-if="visible" class="indicacion-tab inline-flex items-center gap-1 text-[11px] leading-4 text-gray-400" data-atajo-teclado>
    <kbd v-for="tecla in teclas" :key="tecla">{{ tecla }}</kbd>
    {{ texto }}
  </span>
</template>

<style scoped>
kbd {
  display: inline-block;
  min-width: 1.25rem;
  padding: 0 0.3rem;
  border: 1px solid #e5e7eb;
  border-bottom-width: 2px;
  border-radius: 0.25rem;
  background: #f9fafb;
  color: #6b7280;
  font-family: inherit;
  font-size: 0.625rem;
  line-height: 0.95rem;
  text-align: center;
}
</style>
