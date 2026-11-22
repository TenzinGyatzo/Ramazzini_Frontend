<script setup>
/**
 * Alteraciones de salud (punto 45). El texto se genera con los documentos más cercanos a la
 * fecha de la aptitud (helpers/aptitudGuardado, mismas frases que antes) y lo escribe el guardado
 * en los dos modos, sin pisar lo editado; el paso ya no consulta al servidor ni escribe al abrirse.
 */
import { toRefs } from 'vue';
import TextoGeneradoAptitud from './TextoGeneradoAptitud.vue';

const props = defineProps({
  variant: {
    type: String,
    default: 'fullscreen',
    validator: (v) => ['fullscreen', 'compact'].includes(v),
  },
});
const { variant } = toRefs(props);
</script>

<template>
  <div>
    <h1 v-if="variant !== 'compact'" class="font-bold mb-4 text-gray-800 leading-5">Aptitud al Puesto</h1>
    <div data-campo="alteracionesSalud" :class="variant === 'compact' ? 'mb-2' : 'mb-4'">
      <h2 v-if="variant !== 'compact'" class="text-lg font-semibold mb-4 text-gray-800">Alteraciones de Salud</h2>
      <TextoGeneradoAptitud
        campo="alteracionesSalud"
        etiqueta="Descripción de alteraciones encontradas:"
        sin-texto="Hace falta registrar la historia clínica y/o la exploración física para generar el texto; escríbelo a mano."
        :variant="variant"
        alto="h-80"
      />
    </div>
  </div>
</template>
