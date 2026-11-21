<script setup lang="ts" generic="T extends string | number">
/**
 * Punto 38: opciones excluyentes como botones juntos (en lugar de tarjetas grandes), en los
 * dos modos. Son radios de verdad: se recorren con Tab y flechas, y se eligen con espacio.
 */
import { enCapturaRapida } from '@/composables/capturaRapidaKey';

defineProps<{
  name: string;
  opciones: Array<{ valor: T; etiqueta: string }>;
  /** Etiqueta para lectores de pantalla. */
  etiqueta?: string;
}>();
const modelo = defineModel<T | null>();

// En el asistente angosto ocupan todo el ancho y se reparten parejo (no se parten en renglones)
const ancho = enCapturaRapida();
</script>

<template>
  <div
    role="radiogroup"
    :aria-label="etiqueta"
    :class="[
      'rounded-lg border border-gray-300 bg-white overflow-hidden',
      ancho ? 'inline-flex flex-wrap' : 'flex w-full',
    ]"
  >
    <label
      v-for="(op, i) in opciones"
      :key="String(op.valor)"
      :class="[
        ancho ? 'px-4' : 'flex-auto justify-center px-2 whitespace-nowrap',
        'relative inline-flex items-center gap-1.5 h-10 text-sm cursor-pointer select-none transition-colors duration-150 focus-within:z-10 focus-within:ring-2 focus-within:ring-inset focus-within:ring-emerald-500',
        i > 0 ? 'border-l border-gray-300' : '',
        modelo === op.valor
          ? 'bg-emerald-50 text-emerald-700 font-semibold'
          : 'text-gray-700 hover:bg-gray-50',
      ]"
    >
      <input v-model="modelo" type="radio" :name="name" :value="op.valor" class="sr-only" />
      <i v-if="ancho && modelo === op.valor" class="fas fa-check text-xs" aria-hidden="true"></i>
      {{ op.etiqueta }}
    </label>
  </div>
</template>
