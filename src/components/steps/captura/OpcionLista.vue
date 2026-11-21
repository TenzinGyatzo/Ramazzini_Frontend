<script setup lang="ts">
/**
 * Punto 39: pregunta con muchas opciones (4 a 7, p. ej. menarca o gestas) como lista
 * desplegable con el estilo común. Los botones juntos no caben en una columna angosta; la
 * lista se elige rápido con el teclado (escribir la primera letra o con flechas).
 */
import { computed } from 'vue';
import { CLASE_AYUDA, CLASE_ETIQUETA, CLASE_INPUT } from './estiloCaptura';

const props = defineProps<{
  id: string;
  etiqueta: string;
  /** La pregunta completa, como ayuda debajo de la etiqueta. */
  ayuda?: string;
  opciones: string[];
}>();
const modelo = defineModel<string | null>();

// Un valor guardado que ya no está en la lista se conserva y se muestra
const opcionesVisibles = computed(() =>
  modelo.value && !props.opciones.includes(modelo.value) ? [modelo.value, ...props.opciones] : props.opciones,
);
</script>

<template>
  <div>
    <label :for="id" :class="[CLASE_ETIQUETA, 'leading-tight']">{{ etiqueta }}</label>
    <p v-if="ayuda" :class="[CLASE_AYUDA, 'mt-0.5 mb-1']">{{ ayuda }}</p>
    <!-- Opción elegida marcada en cada <option> (con v-model la lista mostraba la primera) -->
    <select
      :id="id"
      :class="[CLASE_INPUT, ayuda ? '' : 'mt-1']"
      @change="modelo = ($event.target as HTMLSelectElement).value"
    >
      <option v-for="op in opcionesVisibles" :key="op" :value="op" :selected="op === modelo">{{ op }}</option>
    </select>
  </div>
</template>
