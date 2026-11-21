<script setup>
import { ref, watch } from 'vue';
import { useFormDataStore } from '@/stores/formDataStore';
import { RECOMENDACIONES_POR_DEFECTO } from '@/helpers/audiometriaGuardado';
import ListaCaptura from '../captura/ListaCaptura.vue';

defineProps({ variant: { type: String, default: '' } });

const formDataStore = useFormDataStore();
// Por el store (al editar, el documento puede llegar después del primer dibujo)
const df = () => formDataStore.formDataAudiometria;

// Punto 44: el paso no escribe al abrirse ni al cerrarse. Sin recomendaciones en el formulario
// muestra las de siempre, que escribe audiometriaGuardado al revisar la sección; lo que el
// usuario cambia se escribe en el momento (la lista y el formulario son el mismo arreglo).
const recomendacionesAudiometria = ref(
  Array.isArray(df().recomendacionesAudiometria) ? df().recomendacionesAudiometria : [...RECOMENDACIONES_POR_DEFECTO],
);
watch(
  () => df().recomendacionesAudiometria,
  (lista) => {
    if (Array.isArray(lista) && lista !== recomendacionesAudiometria.value) recomendacionesAudiometria.value = lista;
  },
);
const escribir = () => {
  df().recomendacionesAudiometria = recomendacionesAudiometria.value;
};
// Lo que se escribe en un renglón (la lista edita el arreglo en su lugar)
watch(recomendacionesAudiometria, escribir, { deep: true });

function addRecomendacion() {
  recomendacionesAudiometria.value.push('');
  escribir();
}

function removeRecomendacion(index) {
  recomendacionesAudiometria.value.splice(index, 1);
  escribir();
}

function limpiarRecomendaciones() {
  recomendacionesAudiometria.value = [];
  escribir();
}

function reestablecerRecomendacionesDefault() {
  recomendacionesAudiometria.value = [...RECOMENDACIONES_POR_DEFECTO];
  escribir();
}
</script>

<template>
  <div>
    <h2 v-if="variant !== 'compact'" class="font-bold mb-4 text-gray-800 leading-5">Recomendaciones:</h2>
    <ListaCaptura
      id="recomendacionesAudiometria"
      v-model="recomendacionesAudiometria"
      etiqueta="Recomendaciones"
      nombre-renglon="Recomendación"
      texto-agregar="Agregar recomendación"
      @agregar="addRecomendacion"
      @quitar="removeRecomendacion"
    />
    <div class="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
      <button type="button" class="text-emerald-700 hover:underline" @click="reestablecerRecomendacionesDefault">
        Restablecer las de siempre
      </button>
      <button type="button" class="text-gray-500 hover:text-red-600 hover:underline" @click="limpiarRecomendaciones">
        Quitar todas
      </button>
    </div>
  </div>
</template>
