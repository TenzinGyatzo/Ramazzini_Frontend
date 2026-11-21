<script setup lang="ts" generic="T extends string">
/**
 * Punto 44: varias opciones a la vez, con el aspecto de los botones juntos (OpcionesSegmentadas)
 * pero como casillas. Se reparten en renglones si no caben. Son casillas de verdad: se recorren
 * con Tab y se marcan con espacio. Quién excluye a quién lo decide el paso (`alternar`).
 */
defineProps<{
  name: string;
  opciones: Array<{ valor: T; etiqueta: string }>;
  /** Etiqueta para lectores de pantalla. */
  etiqueta?: string;
  seleccion: T[];
}>();
const emit = defineEmits<{ alternar: [valor: T] }>();
</script>

<template>
  <div role="group" :aria-label="etiqueta" class="flex flex-wrap gap-1.5">
    <label
      v-for="op in opciones"
      :key="op.valor"
      :class="[
        'relative inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border text-sm cursor-pointer select-none whitespace-nowrap transition-colors duration-150 focus-within:ring-2 focus-within:ring-emerald-500',
        seleccion.includes(op.valor)
          ? 'border-emerald-500 bg-emerald-50 text-emerald-700 font-semibold'
          : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50',
      ]"
    >
      <input
        type="checkbox"
        class="sr-only"
        :name="name"
        :value="op.valor"
        :checked="seleccion.includes(op.valor)"
        @change="emit('alternar', op.valor)"
      />
      <i v-if="seleccion.includes(op.valor)" class="fas fa-check text-xs" aria-hidden="true"></i>
      {{ op.etiqueta }}
    </label>
  </div>
</template>
