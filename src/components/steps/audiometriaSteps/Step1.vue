<script setup>
import { ref, watch, onMounted, onUnmounted } from 'vue';
import { format } from 'date-fns';
import { formatDateYYYYMMDD } from '@/helpers/dates';
import { buildClinicalDirectoryPath } from '@/helpers/clinicalPath';
import { useEmpresasStore } from '@/stores/empresas';
import { useCentrosTrabajoStore } from '@/stores/centrosTrabajo';
import { useTrabajadoresStore } from '@/stores/trabajadores';
import { useFormDataStore } from '@/stores/formDataStore';
import { useDocumentosStore } from '@/stores/documentos';
import { useSiresDocumentDateMax } from '@/composables/useSiresDocumentDateMax';

const empresas = useEmpresasStore();
const centrosTrabajo = useCentrosTrabajoStore();
const trabajadores = useTrabajadoresStore();
const { formDataAudiometria } = useFormDataStore();
const documentos = useDocumentosStore();
const { fechaDocumentoMax } = useSiresDocumentDateMax();

// Valor local para el método de audiometría
const metodoAudiometria = ref('LFT');
const today = format(new Date(), 'yyyy-MM-dd');

// Inicializar la referencia local sincronizada con formData
const fechaAudiometria = ref(today);

onMounted(() => {
  if (documentos.currentDocument) {
    // Si se está editando un documento, usa los valores existentes
    metodoAudiometria.value = documentos.currentDocument.metodoAudiometria || 'LFT';
    fechaAudiometria.value = formatDateYYYYMMDD(documentos.currentDocument.fechaAudiometria || today);
  } else {
    // Si es un documento nuevo, usa valores predeterminados o lo que ya exista en formData
    metodoAudiometria.value = formDataAudiometria.metodoAudiometria || 'LFT';
    fechaAudiometria.value = formatDateYYYYMMDD(formDataAudiometria.fechaAudiometria || today);

    // Configurar valores iniciales en formData si no existen
    if (!formDataAudiometria.idTrabajador) {
      formDataAudiometria.idTrabajador = trabajadores.currentTrabajadorId;
    }
  }

  // Establece rutaPDF en formData
  const empresa = empresas.currentEmpresa.nombreComercial;
  const centroTrabajo = centrosTrabajo.currentCentroTrabajo.nombreCentro;
  const trabajadorNombre = trabajadores.currentTrabajador.nombre;
  const trabajadorId = trabajadores.currentTrabajadorId;
  formDataAudiometria.rutaPDF = buildClinicalDirectoryPath(empresa, centroTrabajo, trabajadorNombre, trabajadorId);
});

onUnmounted(() => {
  // Guardar valores en formData antes de desmontar
  formDataAudiometria.metodoAudiometria = metodoAudiometria.value;
  formDataAudiometria.fechaAudiometria = fechaAudiometria.value;
});

// Sincronizar metodoAudiometria con formData
watch(metodoAudiometria, (newValue) => {
  formDataAudiometria.metodoAudiometria = newValue;
});

// Mantener sincronizados los valores
watch(fechaAudiometria, (newValue) => {
  formDataAudiometria.fechaAudiometria = newValue;
});
</script>

<template>
  <div>
    <!-- Jerarquía Visual Mejorada -->
    <div class="flex items-center justify-between mb-4">
      <h1 class="text-2xl font-bold text-gray-900">Audiometría</h1>
      <!-- Badge del método seleccionado -->
      <div 
        :class="[
          'px-3 py-1 rounded-full text-sm font-semibold transition-all duration-200',
          metodoAudiometria === 'AMA' 
            ? 'bg-blue-100 text-blue-800 border border-blue-200' 
            : 'bg-green-100 text-green-800 border border-green-200'
        ]"
      >
        {{ metodoAudiometria }}
      </div>
    </div>
    
    <!-- Pregunta principal con mejor jerarquía -->
    <div class="mb-8">
      <p class="text-lg font-medium mb-4 text-gray-800">¿Método de audiometría?</p>
      
      <!-- Diseño de Radio Buttons más Visual tipo Card -->
      <div class="grid grid-cols-2 gap-3">
        <!-- Opción AMA -->
        <label 
          :class="[
            'relative flex flex-col items-center justify-center py-3 px-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ease-in-out',
            metodoAudiometria === 'AMA' 
              ? 'border-emerald-600 bg-emerald-50 shadow-md' 
              : 'border-gray-300 bg-white hover:border-emerald-400 hover:bg-emerald-50/50 hover:shadow-sm'
          ]"
        >
          <input 
            type="radio" 
            value="AMA" 
            v-model="metodoAudiometria" 
            class="sr-only" 
          />
          <span 
            :class="[
              'text-base font-semibold transition-colors duration-200',
              metodoAudiometria === 'AMA' ? 'text-emerald-700' : 'text-gray-700'
            ]"
          >
            AMA
          </span>
          <span class="text-xs text-center text-gray-500">American Medical Association</span>
          <!-- Indicador de selección -->
          <div 
            v-if="metodoAudiometria === 'AMA'"
            class="absolute top-2 right-2 w-4 h-4 bg-emerald-600 rounded-full flex items-center justify-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-2.5 w-2.5 text-white" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
            </svg>
          </div>
        </label>

        <!-- Opción LFT -->
        <label 
          :class="[
            'relative flex flex-col items-center justify-center py-3 px-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ease-in-out',
            metodoAudiometria === 'LFT' 
              ? 'border-emerald-600 bg-emerald-50 shadow-md' 
              : 'border-gray-300 bg-white hover:border-emerald-400 hover:bg-emerald-50/50 hover:shadow-sm'
          ]"
        >
          <input 
            type="radio" 
            value="LFT" 
            v-model="metodoAudiometria" 
            class="sr-only" 
          />
          <span 
            :class="[
              'text-base font-semibold transition-colors duration-200',
              metodoAudiometria === 'LFT' ? 'text-emerald-700' : 'text-gray-700'
            ]"
          >
            LFT
          </span>
          <span class="text-xs text-center text-gray-500">Ley Federal de Trabajo (México)</span>
          <!-- Indicador de selección -->
          <div 
            v-if="metodoAudiometria === 'LFT'"
            class="absolute top-2 right-2 w-4 h-4 bg-emerald-600 rounded-full flex items-center justify-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-2.5 w-2.5 text-white" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
            </svg>
          </div>
        </label>
      </div>
    </div>

    <!-- Sección de fecha con mejor espaciado -->
    <div class="mt-8">
      <h2 class="text-lg font-medium mb-3 text-gray-800">Fecha de realización</h2>
      <FormKit 
        type="date" 
        name="fechaAudiometria" 
        placeholder="Seleccione una fecha"
        :max="fechaDocumentoMax"
        v-model="fechaAudiometria" 
      />
    </div>
  </div>
</template>
