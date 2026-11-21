<script setup>
import { ref, watch, onMounted, reactive } from 'vue';
import { useFormDataStore } from '@/stores/formDataStore';
import { useDocumentosStore } from '@/stores/documentos';
import { enCapturaRapida } from '@/composables/capturaRapidaKey';

import { CLASE_INPUT } from '../captura/estiloCaptura';

// En la sección (variant compact) el título lo pone la sección; solo en el asistente anterior
const { variant } = defineProps({ variant: { type: String, default: '' } });

const capturaRapida = enCapturaRapida();
const COLUMNAS = [
  { clave: 'esfera', etiqueta: 'Esfera', ejemplo: '+2.00' },
  { clave: 'cilindro', etiqueta: 'Cilindro', ejemplo: '-0.50' },
  { clave: 'adicion', etiqueta: 'Adición', ejemplo: '+1.50' },
];
const OJOS = [
  { clave: 'OjoIzquierdo', etiqueta: 'Ojo izquierdo', corta: 'OI' },
  { clave: 'OjoDerecho', etiqueta: 'Ojo derecho', corta: 'OD' },
];

const { formDataExamenVista } = useFormDataStore();
const documentos = useDocumentosStore();

const esferaOjoIzquierdo = ref('');
const cilindroOjoIzquierdo = ref('');
const adicionOjoIzquierdo = ref('');
const esferaOjoDerecho = ref('');
const cilindroOjoDerecho = ref('');
const adicionOjoDerecho = ref('');
// La tabla pinta los seis campos en lista; reactive deja escribir en cada ref
const valores = reactive({
  esferaOjoIzquierdo,
  cilindroOjoIzquierdo,
  adicionOjoIzquierdo,
  esferaOjoDerecho,
  cilindroOjoDerecho,
  adicionOjoDerecho,
});

onMounted(() => {
  if (documentos.currentDocument) {
    esferaOjoIzquierdo.value = documentos.currentDocument.esferaOjoIzquierdo || '';
    cilindroOjoIzquierdo.value = documentos.currentDocument.cilindroOjoIzquierdo || '';
    adicionOjoIzquierdo.value = documentos.currentDocument.adicionOjoIzquierdo || '';
    esferaOjoDerecho.value = documentos.currentDocument.esferaOjoDerecho || '';
    cilindroOjoDerecho.value = documentos.currentDocument.cilindroOjoDerecho || '';
    adicionOjoDerecho.value = documentos.currentDocument.adicionOjoDerecho || '';
  }
});

// Observa los cambios y actualiza el store
watch([esferaOjoIzquierdo, cilindroOjoIzquierdo, adicionOjoIzquierdo, esferaOjoDerecho, cilindroOjoDerecho, adicionOjoDerecho], () => {
  formDataExamenVista.esferaOjoIzquierdo = esferaOjoIzquierdo.value || undefined;
  formDataExamenVista.cilindroOjoIzquierdo = cilindroOjoIzquierdo.value || undefined;
  formDataExamenVista.adicionOjoIzquierdo = adicionOjoIzquierdo.value || undefined;
  formDataExamenVista.esferaOjoDerecho = esferaOjoDerecho.value || undefined;
  formDataExamenVista.cilindroOjoDerecho = cilindroOjoDerecho.value || undefined;
  formDataExamenVista.adicionOjoDerecho = adicionOjoDerecho.value || undefined;
});
</script>

<template>
  <div>
    <h1 v-if="variant !== 'compact'" class="text-2xl font-bold mb-4 text-gray-900">Receta final</h1>
    <div class="overflow-x-auto">
      <table class="w-full text-sm border-separate border-spacing-x-2 border-spacing-y-1.5 -mx-2">
        <thead>
          <tr>
            <th :class="capturaRapida ? 'sm:w-24' : ''"></th>
            <th v-for="c in COLUMNAS" :key="c.clave" scope="col" class="text-left text-sm font-medium text-gray-700">{{ c.etiqueta }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="o in OJOS" :key="o.clave">
            <th scope="row" class="text-left text-sm font-medium text-gray-700 whitespace-nowrap"><template v-if="capturaRapida"><span class="sm:hidden">{{ o.corta }}</span><span class="hidden sm:inline">{{ o.etiqueta }}</span></template><template v-else>{{ o.corta }}</template></th>
            <td v-for="c in COLUMNAS" :key="c.clave">
              <input
                :id="c.clave + o.clave"
                v-model="valores[c.clave + o.clave]"
                type="text"
                :class="[CLASE_INPUT, 'min-w-0 !px-2 sm:!px-3']"
                :placeholder="c.ejemplo"
                :aria-label="`${c.etiqueta}, ${o.etiqueta.toLowerCase()}`"
              />
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
