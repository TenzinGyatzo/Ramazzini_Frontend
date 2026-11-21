<script setup>
import { watch, ref, onMounted, toRefs } from 'vue';
import { useFormDataStore } from '@/stores/formDataStore';
import OpcionLista from '@/components/steps/captura/OpcionLista.vue';

const props = defineProps({
  variant: {
    type: String,
    default: 'fullscreen',
    validator: (v) => ['fullscreen', 'compact'].includes(v),
  },
});
const { variant } = toRefs(props);

const { formDataHistoriaClinica } = useFormDataStore();

// Valor local para la pregunta principal
const frecuencia = ref('Regular');

onMounted(() => {
    // Verificar si formDataHistoriaClinica.frecuencia tiene un valor y establecerlo en frecuencia
    if (formDataHistoriaClinica.frecuencia) {
        frecuencia.value = formDataHistoriaClinica.frecuencia;
    }
});

// Sincronizar frecuencia con formData
watch(frecuencia, (newValue) => {
    formDataHistoriaClinica.frecuencia = newValue;
});


// Punto 39: lista con el estilo común, igual en los dos modos
const OPCIONES = ['Regular', 'Oligomenorrea', 'Polimenorrea', 'Amenorrea'];
</script>

<template>
  <div>
    <h1 v-if="variant !== 'compact' && false" class="text-2xl font-bold mb-4 text-gray-900">Antecedentes Gineco Obstétricos</h1>
    <OpcionLista
      id="frecuencia"
      v-model="frecuencia"
      data-campo="frecuencia"
      etiqueta="Frecuencia de los ciclos"
      ayuda="¿Cómo es la frecuencia de sus ciclos menstruales?"
      :opciones="OPCIONES"
    />
  </div>
</template>
