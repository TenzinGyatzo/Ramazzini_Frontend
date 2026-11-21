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
const cesareas = ref('0 (Ninguna)');

onMounted(() => {
    // Verificar si formDataHistoriaClinica.cesareas tiene un valor y establecerlo en cesareas
    if (formDataHistoriaClinica.cesareas) {
        cesareas.value = formDataHistoriaClinica.cesareas;
    }
});

// Sincronizar cesareas con formData
watch(cesareas, (newValue) => {
    formDataHistoriaClinica.cesareas = newValue;
});


// Punto 39: lista con el estilo común, igual en los dos modos
const OPCIONES = ['0 (Ninguna)', '1 cesarea', '2 cesareas', '3 cesareas', 'Más de 3 cesareas'];
</script>

<template>
  <div>
    <h1 v-if="variant !== 'compact' && false" class="text-2xl font-bold mb-4 text-gray-900">Antecedentes Gineco Obstétricos</h1>
    <OpcionLista
      id="cesareas"
      v-model="cesareas"
      data-campo="cesareas"
      etiqueta="Cesáreas"
      :opciones="OPCIONES"
    />
  </div>
</template>
