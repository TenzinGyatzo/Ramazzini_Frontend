<script setup>
import { ref, watch, onMounted, reactive } from 'vue';
import { enCapturaRapida } from '@/composables/capturaRapidaKey';
import { CLASE_ETIQUETA, CLASE_INPUT } from '../captura/estiloCaptura';
import { useFormDataStore } from '@/stores/formDataStore';
import { useDocumentosStore } from '@/stores/documentos';

const capturaRapida = enCapturaRapida();
const PRUEBAS = [
  { id: 'testEstereopsis', etiqueta: 'Test de estereopsis' },
  { id: 'testCampoVisual', etiqueta: 'Campos visuales por confrontación' },
  { id: 'coverTest', etiqueta: 'Cover test' },
];

// En la sección (variant compact) el título lo pone la sección; solo en el asistente anterior
const { variant } = defineProps({ variant: { type: String, default: '' } });

const { formDataExamenVista } = useFormDataStore();
const documentos = useDocumentosStore();

const testEstereopsis = ref('');
const testCampoVisual = ref('');
const coverTest = ref('');
// Los tres campos se pintan en lista; reactive deja escribir en cada ref
const valores = reactive({ testEstereopsis, testCampoVisual, coverTest });

onMounted(() => {
  if (documentos.currentDocument) {
    testEstereopsis.value = documentos.currentDocument.testEstereopsis || '';
    testCampoVisual.value = documentos.currentDocument.testCampoVisual || '';
    coverTest.value = documentos.currentDocument.coverTest || '';
  }
});

// Observa los cambios y actualiza el store
watch([testEstereopsis, testCampoVisual, coverTest], () => {
  formDataExamenVista.testEstereopsis = testEstereopsis.value || undefined;
  formDataExamenVista.testCampoVisual = testCampoVisual.value || undefined;
  formDataExamenVista.coverTest = coverTest.value || undefined;
});
</script>

<template>
  <div>
    <h1 v-if="variant !== 'compact'" class="text-2xl font-bold mb-4 text-gray-900">Pruebas de función ocular</h1>
    <div :class="['grid gap-3 items-end', capturaRapida ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-1']">
      <div v-for="p in PRUEBAS" :key="p.id">
        <label :for="p.id" :class="[CLASE_ETIQUETA, 'mb-1']">{{ p.etiqueta }}</label>
        <input :id="p.id" v-model="valores[p.id]" type="text" :class="CLASE_INPUT" placeholder="Resultado" />
      </div>
    </div>
  </div>
</template>
