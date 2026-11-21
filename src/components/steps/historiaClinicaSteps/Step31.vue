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
const gestas = ref('0 (Ninguna)');

onMounted(() => {
    // Verificar si formDataHistoriaClinica.gestas tiene un valor y establecerlo en gestas
    if (formDataHistoriaClinica.gestas) {
        gestas.value = formDataHistoriaClinica.gestas;
    }
});

// Sincronizar gestas con formData
watch(gestas, (newValue) => {
    formDataHistoriaClinica.gestas = newValue;
});


// Punto 39: lista con el estilo común, igual en los dos modos
const OPCIONES = ['0 (Ninguna)', '1 gesta', '2 gestas', '3 gestas', '4 gestas', '5 gestas', 'Más de 5 gestas'];
</script>

<template>
  <div>
    <h1 v-if="variant !== 'compact' && false" class="text-2xl font-bold mb-4 text-gray-900">Antecedentes Gineco Obstétricos</h1>
    <OpcionLista
      id="gestas"
      v-model="gestas"
      data-campo="gestas"
      etiqueta="Gestas"
      ayuda="Embarazos, incluido el actual si lo hay"
      :opciones="OPCIONES"
    />
  </div>
</template>
