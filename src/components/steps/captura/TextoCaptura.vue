<script setup lang="ts">
/**
 * Captura rápida (punto 38): cuadro de texto con su etiqueta y, si los hay, consejos que se
 * abren a petición (en lugar del bloque azul siempre abierto).
 */
import { ref } from 'vue';
import { CLASE_ETIQUETA, CLASE_TEXTAREA } from './estiloCaptura';

defineProps<{
  id: string;
  etiqueta: string;
  obligatorio?: boolean;
  placeholder?: string;
  filas?: number;
  consejos?: string[];
}>();
const modelo = defineModel<string | null>();
const verConsejos = ref(false);
</script>

<template>
  <div>
    <div class="flex items-baseline justify-between gap-3 mb-1">
      <label :for="id" :class="CLASE_ETIQUETA">
        {{ etiqueta }} <span v-if="obligatorio" class="text-red-500">*</span>
      </label>
      <button
        v-if="consejos?.length"
        type="button"
        tabindex="-1"
        class="text-xs text-emerald-700 hover:underline inline-flex items-center gap-1"
        :aria-expanded="verConsejos"
        @click="verConsejos = !verConsejos"
      >
        <i class="fas fa-lightbulb" aria-hidden="true"></i>
        Consejos
      </button>
    </div>
    <ul v-if="verConsejos && consejos?.length" class="mb-2 text-xs text-gray-600 list-disc pl-5 space-y-0.5">
      <li v-for="c in consejos" :key="c">{{ c }}</li>
    </ul>
    <textarea
      :id="id"
      v-model="modelo"
      :rows="filas ?? 3"
      :class="CLASE_TEXTAREA"
      :placeholder="placeholder"
      data-skip-validation
    ></textarea>
  </div>
</template>
