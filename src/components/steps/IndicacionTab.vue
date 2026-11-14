<script setup>
/** «Tab para avanzar · Shift Tab para retroceder»: solo en laptop o PC (no en tabletas ni celulares). */
import { esComputadora } from '@/composables/useAutofocoPrimerVacio';

const visible = esComputadora();
</script>

<template>
  <p v-if="visible" class="indicacion-tab flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500" data-indicacion-tab>
    <span class="inline-flex items-center gap-1"><kbd>Tab</kbd> para avanzar</span>
    <span class="inline-flex items-center gap-1"><kbd>Shift</kbd><kbd>Tab</kbd> para retroceder</span>
  </p>
</template>

<style scoped>
kbd {
  display: inline-block;
  min-width: 1.5rem;
  padding: 0.05rem 0.35rem;
  border: 1px solid #d1d5db;
  border-bottom-width: 2px;
  border-radius: 0.3rem;
  background: #f9fafb;
  color: #374151;
  font-family: inherit;
  font-size: 0.7rem;
  line-height: 1.2rem;
  text-align: center;
}
</style>
