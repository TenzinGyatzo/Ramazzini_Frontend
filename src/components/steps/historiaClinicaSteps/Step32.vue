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
const partos = ref('0 (Ninguno)');

onMounted(() => {
    // Verificar si formDataHistoriaClinica.partos tiene un valor y establecerlo en partos
    if (formDataHistoriaClinica.partos) {
        partos.value = formDataHistoriaClinica.partos;
    }
});

// Sincronizar partos con formData
watch(partos, (newValue) => {
    formDataHistoriaClinica.partos = newValue;
});


// Punto 39: lista con el estilo común, igual en los dos modos
const OPCIONES = ['0 (Ninguno)', '1 parto', '2 partos', '3 partos', '4 partos', '5 partos', 'Más de 5 partos'];
</script>

<template>
  <div>
    <h1 v-if="variant !== 'compact' && false" class="text-2xl font-bold mb-4 text-gray-900">Antecedentes Gineco Obstétricos</h1>
    <OpcionLista
      id="partos"
      v-model="partos"
      data-campo="partos"
      etiqueta="Partos"
      ayuda="Partos completos"
      :opciones="OPCIONES"
    />
  </div>
</template>
