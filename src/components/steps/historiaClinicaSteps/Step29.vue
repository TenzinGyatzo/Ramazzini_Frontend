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
const duracionPromedio = ref('5 días');

onMounted(() => {
    // Verificar si formDataHistoriaClinica.duracionPromedio tiene un valor y establecerlo en duracionPromedio
    if (formDataHistoriaClinica.duracionPromedio) {
        duracionPromedio.value = formDataHistoriaClinica.duracionPromedio;
    }
});

// Sincronizar duracionPromedio con formData
watch(duracionPromedio, (newValue) => {
    formDataHistoriaClinica.duracionPromedio = newValue;
});


// Punto 39: lista con el estilo común, igual en los dos modos
const OPCIONES = ['2 días', '3 días', '4 días', '5 días', '6 días', '7 días', 'Otro'];
</script>

<template>
  <div>
    <h1 v-if="variant !== 'compact' && false" class="text-2xl font-bold mb-4 text-gray-900">Antecedentes Gineco Obstétricos</h1>
    <OpcionLista
      id="duracionPromedio"
      v-model="duracionPromedio"
      data-campo="duracionPromedio"
      etiqueta="Duración del periodo"
      ayuda="¿Cuántos días dura, en promedio, su periodo menstrual?"
      :opciones="OPCIONES"
    />
  </div>
</template>
