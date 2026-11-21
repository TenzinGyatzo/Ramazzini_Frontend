<script setup>
import { ref, watch, onMounted } from 'vue';
import { useFormDataStore } from '@/stores/formDataStore';
import { useDocumentosStore } from '@/stores/documentos';

const { formDataExamenVista } = useFormDataStore();
const documentos = useDocumentosStore();

const esferaOjoIzquierdo = ref('');
const cilindroOjoIzquierdo = ref('');
const adicionOjoIzquierdo = ref('');
const esferaOjoDerecho = ref('');
const cilindroOjoDerecho = ref('');
const adicionOjoDerecho = ref('');

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
    <!-- Jerarquía Visual Mejorada -->
    <h1 class="text-2xl font-bold mb-4 text-gray-900">RECETA FINAL</h1>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <!-- Ojo Izquierdo -->
      <div>
        <h3 class="text-lg font-medium mb-4 text-gray-700">Ojo Izquierdo</h3>
        
        <!-- Esfera -->
        <div class="mb-4">
          <label for="esferaOjoIzquierdo" class="block text-lg font-normal text-gray-800 mb-3">
            Esfera
          </label>
          <input 
            type="text"
            class="w-full p-3 border border-gray-300 rounded-lg text-gray-700 placeholder-gray-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
            v-model="esferaOjoIzquierdo"
            placeholder="Ej: +2.00"
          />
        </div>

        <!-- Cilindro -->
        <div class="mb-4">
          <label for="cilindroOjoIzquierdo" class="block text-lg font-normal text-gray-800 mb-3">
            Cilindro
          </label>
          <input 
            type="text"
            class="w-full p-3 border border-gray-300 rounded-lg text-gray-700 placeholder-gray-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
            v-model="cilindroOjoIzquierdo"
            placeholder="Ej: -0.50"
          />
        </div>

        <!-- Adición -->
        <div class="mb-4">
          <label for="adicionOjoIzquierdo" class="block text-lg font-normal text-gray-800 mb-3">
            Adición
          </label>
          <input 
            type="text"
            class="w-full p-3 border border-gray-300 rounded-lg text-gray-700 placeholder-gray-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
            v-model="adicionOjoIzquierdo"
            placeholder="Ej: +1.50"
          />
        </div>
      </div>

      <!-- Ojo Derecho -->
      <div>
        <h3 class="text-lg font-medium mb-4 text-gray-700">Ojo Derecho</h3>
        
        <!-- Esfera -->
        <div class="mb-4">
          <label for="esferaOjoDerecho" class="block text-lg font-normal text-gray-800 mb-3">
            Esfera
          </label>
          <input 
            type="text"
            class="w-full p-3 border border-gray-300 rounded-lg text-gray-700 placeholder-gray-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
            v-model="esferaOjoDerecho"
            placeholder="Ej: +2.00"
          />
        </div>

        <!-- Cilindro -->
        <div class="mb-4">
          <label for="cilindroOjoDerecho" class="block text-lg font-normal text-gray-800 mb-3">
            Cilindro
          </label>
          <input 
            type="text"
            class="w-full p-3 border border-gray-300 rounded-lg text-gray-700 placeholder-gray-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
            v-model="cilindroOjoDerecho"
            placeholder="Ej: -0.50"
          />
        </div>

        <!-- Adición -->
        <div class="mb-4">
          <label for="adicionOjoDerecho" class="block text-lg font-normal text-gray-800 mb-3">
            Adición
          </label>
          <input 
            type="text"
            class="w-full p-3 border border-gray-300 rounded-lg text-gray-700 placeholder-gray-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
            v-model="adicionOjoDerecho"
            placeholder="Ej: +1.50"
          />
        </div>
      </div>
    </div>
  </div>
</template>

