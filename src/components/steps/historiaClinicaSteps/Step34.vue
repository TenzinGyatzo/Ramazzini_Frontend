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
const abortos = ref('0 (Ninguno)');

onMounted(() => {
    // Verificar si formDataHistoriaClinica.abortos tiene un valor y establecerlo en abortos
    if (formDataHistoriaClinica.abortos) {
        abortos.value = formDataHistoriaClinica.abortos;
    }
});

// Sincronizar abortos con formData
watch(abortos, (newValue) => {
    formDataHistoriaClinica.abortos = newValue;
});


// Punto 39: lista con el estilo común, igual en los dos modos
const OPCIONES = ['0 (Ninguno)', '1 aborto', '2 abortos', '3 abortos', 'Más de 3 abortos'];
</script>

<template>
  <div>
    <h1 v-if="variant !== 'compact' && false" class="text-2xl font-bold mb-4 text-gray-900">Antecedentes Gineco Obstétricos</h1>
    <OpcionLista
      id="abortos"
      v-model="abortos"
      data-campo="abortos"
      etiqueta="Abortos"
      ayuda="Pérdidas de embarazo antes de las 20 semanas"
      :opciones="OPCIONES"
    />
  </div>
</template>
