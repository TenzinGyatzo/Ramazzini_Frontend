<script setup>
import { ref, watch, onMounted } from 'vue';
import { useFormDataStore } from '@/stores/formDataStore';
import { useDocumentosStore } from '@/stores/documentos';

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
    <h1 class="text-2xl font-bold mb-4 text-gray-900">UTILIZA ANEOJOS</h1>

    <div class="mb-8">
      <p class="text-lg font-medium mb-4 text-gray-800">¿La persona utiliza anteojos?</p>

      <div class="grid grid-cols-2 gap-3">
        <!-- Opción No -->
        <label
          :class="[
            'relative flex flex-col items-center justify-center py-3 px-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ease-in-out',
            utilizaAnteojos === 'No'
              ? 'border-emerald-600 bg-emerald-50 shadow-md'
              : 'border-gray-300 bg-white hover:border-emerald-400 hover:bg-emerald-50/50 hover:shadow-sm'
          ]"
        >
          <input type="radio" value="No" v-model="utilizaAnteojos" class="sr-only" />
          <div
            :class="[
              'w-8 h-8 rounded-full flex items-center justify-center mb-1.5 transition-colors duration-200',
              utilizaAnteojos === 'No' ? 'bg-emerald-600 text-white' : 'bg-gray-200 text-gray-600'
            ]"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <span
            :class="[
              'text-base font-semibold transition-colors duration-200',
              utilizaAnteojos === 'No' ? 'text-emerald-700' : 'text-gray-700'
            ]"
          >
            No
          </span>
          <div v-if="utilizaAnteojos === 'No'" class="absolute top-2 right-2 w-4 h-4 bg-emerald-600 rounded-full flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-2.5 w-2.5 text-white" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
            </svg>
          </div>
        </label>

        <!-- Opción Si -->
        <label
          :class="[
            'relative flex flex-col items-center justify-center py-3 px-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ease-in-out',
            utilizaAnteojos === 'Si'
              ? 'border-emerald-600 bg-emerald-50 shadow-md'
              : 'border-gray-300 bg-white hover:border-emerald-400 hover:bg-emerald-50/50 hover:shadow-sm'
          ]"
        >
          <input type="radio" value="Si" v-model="utilizaAnteojos" class="sr-only" />
          <div
            :class="[
              'w-8 h-8 rounded-full flex items-center justify-center mb-1.5 transition-colors duration-200',
              utilizaAnteojos === 'Si' ? 'bg-emerald-600 text-white' : 'bg-gray-200 text-gray-600'
            ]"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <span
            :class="[
              'text-base font-semibold transition-colors duration-200',
              utilizaAnteojos === 'Si' ? 'text-emerald-700' : 'text-gray-700'
            ]"
          >
            Sí
          </span>
          <div v-if="utilizaAnteojos === 'Si'" class="absolute top-2 right-2 w-4 h-4 bg-emerald-600 rounded-full flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-2.5 w-2.5 text-white" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
            </svg>
          </div>
        </label>
      </div>
    </div>
  </div>
</template>
