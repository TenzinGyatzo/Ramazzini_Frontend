<script setup lang="ts">
/**
 * Punto (60): etiqueta de los campos del registro (para la ranura `label` de FormKit): asterisco
 * en los obligatorios y la palomita cuando el campo ya es válido.
 */
import PalomitaCompleto from '@/components/PalomitaCompleto.vue';

withDefaults(defineProps<{ texto: string; para?: string; completo?: boolean; requerido?: boolean }>(), {
  para: undefined,
  completo: false,
  requerido: true,
});
</script>

<template>
  <label :for="para" class="formkit-label flex items-center justify-between gap-2 font-medium text-lg text-gray-700">
    <span>{{ texto }}<span v-if="requerido" class="text-red-500">*</span></span>
    <PalomitaCompleto :visible="completo" />
  </label>
</template>
