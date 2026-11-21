<script setup lang="ts">
/**
 * Captura rápida (punto 38): campo numérico con la unidad dentro y, si aplica, «Se desconoce»
 * junto a la etiqueta (fuera del recorrido con Tab, para pasar de un número al siguiente).
 * Solo acomoda: el valor, la casilla y el aviso los lleva el paso, igual que en el asistente.
 */
import { vValorDePartida } from '@/directives/valorDePartida';
import { parseOptionalNumber } from '@/helpers/notaMedicaCexRanges';
import {
  CLASE_CASILLA_LATERAL,
  CLASE_ERROR,
  CLASE_ETIQUETA,
  CLASE_INPUT,
} from './estiloCaptura';

defineProps<{
  id: string;
  etiqueta: string;
  unidad?: string;
  obligatorio?: boolean;
  min?: number;
  max?: number;
  step?: string;
  placeholder?: string;
  error?: string;
  /** Valor con el que abrió el paso (directiva v-valor-de-partida). */
  partida?: number | null;
  /** Sin casilla «Se desconoce» si es undefined. */
  conSeDesconoce?: boolean;
}>();
const valor = defineModel<number | null>({ default: null });
const seDesconoce = defineModel<boolean>('seDesconoce', { default: false });
</script>

<template>
  <div>
    <div class="flex items-center justify-between gap-2 mb-1">
      <label :for="id" :class="CLASE_ETIQUETA">
        {{ etiqueta }} <span v-if="obligatorio" class="text-red-500">*</span>
      </label>
      <label v-if="conSeDesconoce" :class="CLASE_CASILLA_LATERAL">
        <input v-model="seDesconoce" type="checkbox" class="rounded" tabindex="-1" />
        Se desconoce
      </label>
    </div>
    <div class="relative">
      <input
        :id="id"
        v-valor-de-partida="partida"
        type="number"
        :class="[CLASE_INPUT, unidad ? 'pr-14' : '']"
        :value="valor ?? ''"
        :min="min"
        :max="max"
        :step="step ?? '1'"
        :placeholder="placeholder"
        :disabled="seDesconoce"
        @input="valor = parseOptionalNumber(($event.target as HTMLInputElement).value)"
      />
      <span
        v-if="unidad"
        class="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-gray-400"
      >{{ unidad }}</span>
    </div>
    <p v-if="error" :class="CLASE_ERROR">{{ error }}</p>
  </div>
</template>
