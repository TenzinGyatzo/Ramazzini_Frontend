<script setup>
import { ref, watch, onMounted } from 'vue';
import { useFormDataStore } from '@/stores/formDataStore';
import { useDocumentosStore } from '@/stores/documentos';

import OpcionesSegmentadas from '../captura/OpcionesSegmentadas.vue';

// En la sección (variant compact) el título lo pone la sección; solo en el asistente anterior
const { variant } = defineProps({ variant: { type: String, default: '' } });

const { formDataExamenVista } = useFormDataStore();
const documentos = useDocumentosStore();

const utilizaAnteojos = ref('No');

onMounted(() => {
  // Priorizar formData (cambios locales) sobre BD: si el usuario ya modificó y regresa al step, mantener sus cambios
  const local = formDataExamenVista.utilizaAnteojos;
  const fromDb = documentos.currentDocument?.utilizaAnteojos;
  utilizaAnteojos.value = (local != null && local !== '') ? local : (fromDb || 'No');
});

watch(utilizaAnteojos, () => {
  formDataExamenVista.utilizaAnteojos = utilizaAnteojos.value;
});
</script>

<template>
  <div>
    <h1 v-if="variant !== 'compact'" class="text-2xl font-bold mb-4 text-gray-900">Utiliza anteojos</h1>
    <div data-campo="utilizaAnteojos" class="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
      <p class="text-sm font-semibold text-gray-800">¿La persona utiliza anteojos?</p>
      <OpcionesSegmentadas
        v-model="utilizaAnteojos"
        name="utilizaAnteojos"
        etiqueta="¿La persona utiliza anteojos?"
        compacto
        :opciones="[{ valor: 'No', etiqueta: 'No' }, { valor: 'Si', etiqueta: 'Sí' }]"
      />
    </div>
  </div>
</template>
