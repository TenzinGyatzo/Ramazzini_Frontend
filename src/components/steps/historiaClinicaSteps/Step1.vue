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

const empresas = useEmpresasStore();
const centrosTrabajo = useCentrosTrabajoStore();
const trabajadores = useTrabajadoresStore();
const { formDataHistoriaClinica } = useFormDataStore();
const documentos = useDocumentosStore();

// Valor local para la pregunta principal
const motivoExamen = ref('Ingreso');
const today = format(new Date(), 'yyyy-MM-dd');

// Inicializar la referencia local sincronizada con formData
const fechaHistoriaClinica = ref(today);

onMounted(() => {
  if (documentos.currentDocument) {
    // Si se está editando un documento, usa los valores existentes
    motivoExamen.value = documentos.currentDocument.motivoExamen || 'Ingreso';
    fechaHistoriaClinica.value = formatDateYYYYMMDD(documentos.currentDocument.fechaHistoriaClinica || today);
  } else {
    // Si es un documento nuevo, usa valores predeterminados o lo que ya exista en formData
    motivoExamen.value = formDataHistoriaClinica.motivoExamen || 'Ingreso';
    fechaHistoriaClinica.value = formatDateYYYYMMDD(formDataHistoriaClinica.fechaHistoriaClinica || today);

    // Configurar valores iniciales en formData si no existen
    if (!formDataHistoriaClinica.idTrabajador) {
      formDataHistoriaClinica.idTrabajador = trabajadores.currentTrabajadorId;
    }
  }
  
  
  // Establece rutaPDF en formData
  const empresa = empresas.currentEmpresa.nombreComercial;
  const centroTrabajo = centrosTrabajo.currentCentroTrabajo.nombreCentro;
  const trabajadorNombre = trabajadores.currentTrabajador.nombre;
  const trabajadorId = trabajadores.currentTrabajadorId;
  formDataHistoriaClinica.rutaPDF = buildClinicalDirectoryPath(empresa, centroTrabajo, trabajadorNombre, trabajadorId);
});

onUnmounted(() => {
  // Guardar valores en formData antes de desmontar
  formDataHistoriaClinica.motivoExamen = motivoExamen.value;
  formDataHistoriaClinica.fechaHistoriaClinica = fechaHistoriaClinica.value;
});

// Sincronizar motivoExamen con formData
watch(motivoExamen, (newValue) => {
  formDataHistoriaClinica.motivoExamen = newValue;
});

// Mantener sincronizados los valores
watch(fechaHistoriaClinica, (newValue) => {
  formDataHistoriaClinica.fechaHistoriaClinica = newValue;
});
</script>

<template>
  <div>
    <!-- Jerarquía Visual Mejorada -->
    <h1 class="text-2xl font-bold mb-4 text-gray-900">Historia Clínica</h1>
    
    <!-- Pregunta principal con mejor jerarquía -->
    <div class="mb-8">
      <p class="text-lg font-medium mb-4 text-gray-800">¿Motivo del examen médico?</p>
      
      <!-- Diseño de Radio Buttons más Visual tipo Card -->
      <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <!-- Opción Ingreso -->
        <label 
          :class="[
            'relative flex flex-col items-center justify-center py-3 px-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ease-in-out',
            motivoExamen === 'Ingreso' 
              ? 'border-emerald-600 bg-emerald-50 shadow-md' 
              : 'border-gray-300 bg-white hover:border-emerald-400 hover:bg-emerald-50/50 hover:shadow-sm'
          ]"
        >
          <input 
            type="radio" 
            value="Ingreso" 
            v-model="motivoExamen" 
            class="sr-only" 
          />
          <!-- Icono -->
          <div 
            :class="[
              'w-8 h-8 rounded-full flex items-center justify-center mb-1.5 transition-colors duration-200',
              motivoExamen === 'Ingreso' ? 'bg-emerald-600 text-white' : 'bg-gray-200 text-gray-600'
            ]"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
          </div>
          <span 
            :class="[
              'text-base font-semibold transition-colors duration-200',
              motivoExamen === 'Ingreso' ? 'text-emerald-700' : 'text-gray-700'
            ]"
          >
            Ingreso
          </span>
          <!-- Indicador de selección -->
          <div 
            v-if="motivoExamen === 'Ingreso'"
            class="absolute top-2 right-2 w-4 h-4 bg-emerald-600 rounded-full flex items-center justify-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-2.5 w-2.5 text-white" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
            </svg>
          </div>
        </label>

        <!-- Opción Inicial -->
        <label 
          :class="[
            'relative flex flex-col items-center justify-center py-3 px-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ease-in-out',
            motivoExamen === 'Inicial' 
              ? 'border-emerald-600 bg-emerald-50 shadow-md' 
              : 'border-gray-300 bg-white hover:border-emerald-400 hover:bg-emerald-50/50 hover:shadow-sm'
          ]"
        >
          <input 
            type="radio" 
            value="Inicial" 
            v-model="motivoExamen" 
            class="sr-only" 
          />
          <!-- Icono -->
          <div 
            :class="[
              'w-8 h-8 rounded-full flex items-center justify-center mb-1.5 transition-colors duration-200',
              motivoExamen === 'Inicial' ? 'bg-emerald-600 text-white' : 'bg-gray-200 text-gray-600'
            ]"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <span 
            :class="[
              'text-base font-semibold transition-colors duration-200',
              motivoExamen === 'Inicial' ? 'text-emerald-700' : 'text-gray-700'
            ]"
          >
            Inicial
          </span>
          <!-- Indicador de selección -->
          <div 
            v-if="motivoExamen === 'Inicial'"
            class="absolute top-2 right-2 w-4 h-4 bg-emerald-600 rounded-full flex items-center justify-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-2.5 w-2.5 text-white" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
            </svg>
          </div>
        </label>

        <!-- Opción Periódico -->
        <label 
          :class="[
            'relative flex flex-col items-center justify-center py-3 px-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ease-in-out',
            motivoExamen === 'Periódico' 
              ? 'border-emerald-600 bg-emerald-50 shadow-md' 
              : 'border-gray-300 bg-white hover:border-emerald-400 hover:bg-emerald-50/50 hover:shadow-sm'
          ]"
        >
          <input 
            type="radio" 
            value="Periódico" 
            v-model="motivoExamen" 
            class="sr-only" 
          />
          <!-- Icono -->
          <div 
            :class="[
              'w-8 h-8 rounded-full flex items-center justify-center mb-1.5 transition-colors duration-200',
              motivoExamen === 'Periódico' ? 'bg-emerald-600 text-white' : 'bg-gray-200 text-gray-600'
            ]"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </div>
          <span 
            :class="[
              'text-base font-semibold transition-colors duration-200',
              motivoExamen === 'Periódico' ? 'text-emerald-700' : 'text-gray-700'
            ]"
          >
            Periódico
          </span>
          <!-- Indicador de selección -->
          <div 
            v-if="motivoExamen === 'Periódico'"
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
      <h2 class="text-lg font-medium mb-3 text-gray-800">Fecha de Historia Clínica</h2>
      <FormKit 
        type="date" 
        name="fechaHistoriaClinica" 
        placeholder="Seleccione una fecha"
        v-model="fechaHistoriaClinica" 
      />
    </div>
  </div>
</template>
