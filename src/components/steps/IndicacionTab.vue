<script setup>
/** «Tab para avanzar · Shift Tab para retroceder»: solo en laptop o PC (no en tabletas ni celulares). */
import { esComputadora } from '@/composables/useAutofocoPrimerVacio';

const visible = esComputadora();
</script>

<template>
  <p v-if="visible" class="indicacion-tab flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] leading-4 text-gray-400" data-indicacion-tab>
    <span class="inline-flex items-center gap-1"><kbd>Tab</kbd> para avanzar</span>
    <span class="inline-flex items-center gap-1"><kbd>Shift</kbd><kbd>Tab</kbd> para retroceder</span>
  </p>
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
