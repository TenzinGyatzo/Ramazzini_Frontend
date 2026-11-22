<script setup lang="ts" generic="T extends string | number">
/**
 * Punto 38: opciones excluyentes como botones juntos (en lugar de tarjetas grandes), en los
 * dos modos. Son radios de verdad: se recorren con Tab y flechas, y se eligen con espacio.
 * El anillo de enfoque sale solo con el teclado (con el ratón parecía que seguía elegida).
 */
import { enCapturaRapida } from '@/composables/capturaRapidaKey';

const props = defineProps<{
  name: string;
  opciones: Array<{ valor: T; etiqueta: string }>;
  /** Etiqueta para lectores de pantalla. */
  etiqueta?: string;
  /**
   * Botones chicos a su medida, al lado de una pregunta (las No/Sí de la historia clínica, punto
   * 39), igual en los dos modos.
   */
  compacto?: boolean;
  /**
   * Botones separados que bajan de renglón si no caben (punto 44: en el asistente angosto, las
   * preguntas con 3 o 4 opciones largas se cortaban).
   */
  separadas?: boolean;
  /** Un segundo clic en la opción elegida la quita (punto 44: protección auditiva). */
  deseleccionable?: boolean;
}>();
const modelo = defineModel<T | null>();

// En el asistente angosto, y en captura rápida en celular, ocupan todo el ancho y se reparten
// parejo (no se parten en renglones); en captura rápida desde sm, a su medida.
const ancho = enCapturaRapida();

// El clic (o la barra espaciadora) en un radio ya marcado no lo cambia: aquí se quita
function alHacerClic(valor: T) {
  if (props.deseleccionable && modelo.value === valor) modelo.value = null;
}
</script>

<template>
  <div
    role="radiogroup"
    :aria-label="etiqueta"
    :class="[
      separadas
        ? 'flex flex-wrap gap-1.5'
        : 'rounded-lg border border-gray-300 bg-white overflow-hidden',
      separadas ? '' : compacto ? 'inline-flex' : ancho ? 'flex w-full sm:inline-flex sm:w-auto' : 'flex w-full',
    ]"
  >
    <label
      v-for="(op, i) in opciones"
      :key="String(op.valor)"
      :class="[
        separadas
          ? 'justify-center px-3 h-8 whitespace-nowrap rounded-lg border border-gray-300 bg-white'
          : compacto
          ? 'justify-center min-w-[2.75rem] px-3 h-8 whitespace-nowrap'
          : ancho
            ? 'flex-auto justify-center px-2 whitespace-nowrap sm:flex-none sm:px-4 h-10'
            : 'flex-auto justify-center px-2 whitespace-nowrap h-10',
        'relative inline-flex items-center gap-1.5 text-sm cursor-pointer select-none transition-colors duration-150 has-[:focus-visible]:z-10 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-inset has-[:focus-visible]:ring-emerald-500',
        i > 0 && !separadas ? 'border-l border-gray-300' : '',
        modelo === op.valor
          ? ['bg-emerald-50 text-emerald-700 font-semibold', separadas ? '!border-emerald-500' : '']
          : 'text-gray-700 hover:bg-gray-50',
      ]"
    >
      <input
        v-model="modelo"
        type="radio"
        :name="name"
        :value="op.valor"
        class="sr-only"
        @click="alHacerClic(op.valor)"
      />
      <i v-if="ancho && !compacto && modelo === op.valor" class="fas fa-check text-xs hidden sm:inline" aria-hidden="true"></i>
      {{ op.etiqueta }}
    </label>
  </div>
</template>
