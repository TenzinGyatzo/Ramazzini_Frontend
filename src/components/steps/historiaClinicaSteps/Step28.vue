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
const menarca = ref('12-14 años');

onMounted(() => {
    // Verificar si formDataHistoriaClinica.menarca tiene un valor y establecerlo en menarca
    if (formDataHistoriaClinica.menarca) {
        menarca.value = formDataHistoriaClinica.menarca;
    }
});

// Sincronizar menarca con formData
watch(menarca, (newValue) => {
    formDataHistoriaClinica.menarca = newValue;
});


// Punto 39: lista con el estilo común, igual en los dos modos
const OPCIONES = ['Menos de 9 años', '9-11 años', '12-14 años', '15-17 años', '18-20 años', '21-24 años', '25 años o más'];
</script>

<template>
  <div>
    <h1 v-if="variant !== 'compact' && true" class="text-2xl font-bold mb-4 text-gray-900">Antecedentes Gineco Obstétricos</h1>
    <OpcionLista
      id="menarca"
      v-model="menarca"
      data-campo="menarca"
      etiqueta="Menarca"
      ayuda="¿A qué edad tuvo su primera menstruación?"
      :opciones="OPCIONES"
    />
  </div>
</template>
