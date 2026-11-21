<script setup>
import { watch, ref, onMounted, toRefs } from 'vue';
import { useFormDataStore } from '@/stores/formDataStore';
import { useDocumentosStore } from '@/stores/documentos';
import InsumosSuministrados from '@/components/inventario/InsumosSuministrados.vue';
import { enCapturaRapida } from '@/composables/capturaRapidaKey';
import ListaCaptura from '@/components/steps/captura/ListaCaptura.vue';

// Captura rápida (punto 38): mismos renglones, con el estilo común
const capturaRapida = enCapturaRapida();

const props = defineProps({
  variant: {
    type: String,
    default: 'fullscreen',
    validator: (v) => ['fullscreen', 'compact'].includes(v),
  },
});
const { variant } = toRefs(props);

const { formDataNotaMedica } = useFormDataStore();
const documentos = useDocumentosStore();

const tratamiento = ref([]);

onMounted(() => {
  if (documentos.currentDocument && documentos.currentDocument.tratamiento) {
    tratamiento.value = Array.isArray(documentos.currentDocument.tratamiento)
      ? documentos.currentDocument.tratamiento
      : [documentos.currentDocument.tratamiento];
  }

  if (formDataNotaMedica.tratamiento) {
    tratamiento.value = Array.isArray(formDataNotaMedica.tratamiento)
      ? formDataNotaMedica.tratamiento
      : [formDataNotaMedica.tratamiento];
  }
});

watch(tratamiento, (newValue) => {
  formDataNotaMedica.tratamiento = newValue;
}, { deep: true });

// Funciones para agregar o eliminar entradas
function addTratamiento() {
  tratamiento.value.push('');
  // Esperar a que el DOM se actualice y luego establecer el focus
  // En la captura rápida, ListaCaptura pone el cursor en el renglón nuevo de su lista
  if (!capturaRapida) setTimeout(() => {
    const inputs = document.querySelectorAll('input');
    const lastInput = inputs[inputs.length - 1];
    lastInput.focus();
  }, 0);
}

function removeTratamiento(index) {
  tratamiento.value.splice(index, 1);
}
</script>

<template>
  <div v-if="capturaRapida" class="nota-medica-dark-inputs">
    <ListaCaptura
      id="tratamiento"
      v-model="tratamiento"
      etiqueta="Tratamiento"
      nombre-renglon="Tratamiento"
      texto-agregar="Agregar tratamiento"
      @agregar="addTratamiento"
      @quitar="removeTratamiento"
    />
    <InsumosSuministrados />
  </div>

  <div v-else class="nota-medica-dark-inputs">
    <h2
      v-if="variant !== 'compact'"
      class="text-2xl font-bold text-gray-900 mb-4 uppercase"
    >
      Tratamiento
    </h2>
    <p
      v-else
      class="text-sm font-semibold text-gray-800 mb-2"
    >
      Tratamiento
    </p>

    <div class="space-y-2">
      <div v-for="(item, index) in tratamiento" :key="index" class="flex gap-2 items-center">
        <input
          class="w-full p-3 border border-gray-300 rounded-lg text-gray-700 placeholder-gray-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
          v-model="tratamiento[index]"
          :placeholder="`Tratamiento #${index + 1}`"
        />
        <button
          type="button"
          class="text-red-500 font-bold px-2"
          @click="removeTratamiento(index)"
          title="Eliminar"
        >
          ✕
        </button>
      </div>
      <button
        type="button"
        class="mt-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm"
        @click="addTratamiento"
      >
        Agregar tratamiento
      </button>
    </div>

    <InsumosSuministrados />
  </div>
</template>
