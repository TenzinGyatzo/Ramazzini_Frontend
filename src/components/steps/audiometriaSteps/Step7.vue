<script setup>
import { ref, watch, nextTick } from 'vue';
import { useFormDataStore } from '@/stores/formDataStore';
import { RECOMENDACIONES_POR_DEFECTO } from '@/helpers/audiometriaGuardado';

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

const lista = ref(null);

async function addRecomendacion() {
  recomendacionesAudiometria.value.push('');
  escribir();
  await nextTick();
  // El renglón nuevo de esta lista (en la captura rápida hay más campos en la página)
  const campos = lista.value?.querySelectorAll('input');
  campos?.[campos.length - 1]?.focus();
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
    <div ref="lista" class="space-y-2">
      <div v-for="(item, index) in recomendacionesAudiometria" :key="index" class="flex gap-2 items-center">
        <input
          class="w-full p-3 border border-gray-300 dark:border-slate-600 rounded-lg text-gray-700 dark:text-slate-100 bg-white dark:bg-slate-700 placeholder-gray-400 dark:placeholder-slate-300 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
          v-model="recomendacionesAudiometria[index]"
          @input="escribir"
          :placeholder="`Recomendación #${index + 1}`"
        />
        <button
          type="button"
          class="text-red-500 font-bold px-2"
          @click="removeRecomendacion(index)"
          title="Eliminar"
        >
          ✕
        </button>
      </div>
    </div>
    <div class="mt-3 flex gap-2 flex-wrap">
      <button
        type="button"
        class="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-base"
        @click="addRecomendacion"
      >
        Agregar recomendación
      </button>
    </div>
    <div class="flex gap-2 mt-4 w-full">
      <button
        type="button"
        class="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-xs"
        @click="reestablecerRecomendacionesDefault"
      >
        Reestablecer por defecto
      </button>
      <button
        type="button"
        class="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-xs"
        @click="limpiarRecomendaciones"
      >
        Limpiar todas
      </button>
    </div>
  </div>
</template>
