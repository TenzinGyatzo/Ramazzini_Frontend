<script setup>
import { ref, watch, onMounted, onUnmounted, toRefs } from 'vue';
import { format } from 'date-fns';
import { formatDateYYYYMMDD } from '@/helpers/dates';
import { buildClinicalDirectoryPath } from '@/helpers/clinicalPath';
import { useEmpresasStore } from '@/stores/empresas';
import { useCentrosTrabajoStore } from '@/stores/centrosTrabajo';
import { useTrabajadoresStore } from '@/stores/trabajadores';
import { useFormDataStore } from '@/stores/formDataStore';
import { useDocumentosStore } from '@/stores/documentos';

const props = defineProps({
  variant: {
    type: String,
    default: 'fullscreen',
    validator: (v) => ['fullscreen', 'compact'].includes(v),
  },
});
const { variant } = toRefs(props);

const empresas = useEmpresasStore();
const centrosTrabajo = useCentrosTrabajoStore();
const trabajadores = useTrabajadoresStore();
const { formDataNotaMedica } = useFormDataStore();
const documentos = useDocumentosStore();

// Valor local para la pregunta principal
const tipoNota = ref('Inicial');
const today = format(new Date(), 'yyyy-MM-dd');

// Inicializar la referencia local sincronizada con formData
const fechaNotaMedica = ref(today);

onMounted(() => {
  if (documentos.currentDocument) {
    // Si se está editando un documento, usa los valores existentes
    tipoNota.value = documentos.currentDocument.tipoNota || 'Inicial';
    fechaNotaMedica.value = formatDateYYYYMMDD(documentos.currentDocument.fechaNotaMedica || today);
  } else {
    // Si es un documento nuevo, usa valores predeterminados o lo que ya exista en formData
    tipoNota.value = formDataNotaMedica.tipoNota || 'Inicial';
    fechaNotaMedica.value = formatDateYYYYMMDD(formDataNotaMedica.fechaNotaMedica || today);

    // Configurar valores iniciales en formData si no existen
    if (!formDataNotaMedica.idTrabajador) {
      formDataNotaMedica.idTrabajador = trabajadores.currentTrabajadorId;
    }
  }
  
  
  // Establece rutaPDF en formData
  const empresa = empresas.currentEmpresa.nombreComercial;
  const centroTrabajo = centrosTrabajo.currentCentroTrabajo.nombreCentro;
  const trabajadorNombre = trabajadores.currentTrabajador.nombre;
  const trabajadorId = trabajadores.currentTrabajadorId;
  formDataNotaMedica.rutaPDF = buildClinicalDirectoryPath(empresa, centroTrabajo, trabajadorNombre, trabajadorId);
});

onUnmounted(() => {
  // Guardar valores en formData antes de desmontar
  formDataNotaMedica.tipoNota = tipoNota.value;
  formDataNotaMedica.fechaNotaMedica = fechaNotaMedica.value;
});

// Sincronizar tipoNota con formData
watch(tipoNota, (newValue) => {
  formDataNotaMedica.tipoNota = newValue;
});

// Mantener sincronizados los valores
watch(fechaNotaMedica, (newValue) => {
  formDataNotaMedica.fechaNotaMedica = newValue;
});
</script>

<template>
  <div class="nota-medica-dark-inputs">
    <h1
      v-if="variant !== 'compact'"
      class="text-2xl font-bold mb-4 text-gray-900"
    >
      Nota Médica
    </h1>

    
    <!-- Pregunta principal con mejor jerarquía -->
    <div :class="variant === 'compact' ? 'mb-4' : 'mb-8'">
      <p :class="variant === 'compact' ? 'text-sm font-medium mb-2 text-gray-800' : 'text-lg font-medium mb-4 text-gray-800'">¿Tipo de consulta? <span class="text-red-500">*</span></p>
      
      <!-- Diseño de Radio Buttons más Visual tipo Card -->
      <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <!-- Opción Inicial -->
        <label 
          :class="[
            'relative flex flex-col items-center justify-center py-3 px-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ease-in-out',
            tipoNota === 'Inicial' 
              ? 'border-emerald-600 bg-emerald-50 shadow-md dark:bg-emerald-950/50 dark:border-emerald-500' 
              : 'border-gray-300 bg-white hover:border-emerald-400 hover:bg-emerald-50/50 hover:shadow-sm dark:border-slate-600 dark:bg-slate-800 dark:hover:border-emerald-500 dark:hover:bg-emerald-950/30'
          ]"
        >
          <input 
            type="radio" 
            value="Inicial" 
            v-model="tipoNota" 
            class="sr-only" 
          />
          <span 
            :class="[
              'text-base font-semibold transition-colors duration-200',
              tipoNota === 'Inicial' ? 'text-emerald-700' : 'text-gray-700'
            ]"
          >
            Inicial
          </span>
          <!-- Indicador de selección -->
          <div 
            v-if="tipoNota === 'Inicial'"
            class="absolute top-2 right-2 w-4 h-4 bg-emerald-600 rounded-full flex items-center justify-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-2.5 w-2.5 text-white" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
            </svg>
          </div>
        </label>

        <!-- Opción Seguimiento -->
        <label 
          :class="[
            'relative flex flex-col items-center justify-center py-3 px-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ease-in-out ',
            tipoNota === 'Seguimiento' 
              ? 'border-emerald-600 bg-emerald-50 shadow-md dark:bg-emerald-950/50 dark:border-emerald-500' 
              : 'border-gray-300 bg-white hover:border-emerald-400 hover:bg-emerald-50/50 hover:shadow-sm dark:border-slate-600 dark:bg-slate-800 dark:hover:border-emerald-500 dark:hover:bg-emerald-950/30'
          ]"
        >
          <input 
            type="radio" 
            value="Seguimiento" 
            v-model="tipoNota" 
            class="sr-only" 
          />
          <span 
            :class="[
              'mt-1 text-base sm:text-sm font-semibold transition-colors duration-200',
              tipoNota === 'Seguimiento' ? 'text-emerald-700' : 'text-gray-700'
            ]"
          >
            Seguimiento
          </span>
          <!-- Indicador de selección -->
          <div 
            v-if="tipoNota === 'Seguimiento'"
            class="absolute top-2 right-2 w-4 h-4 bg-emerald-600 rounded-full flex items-center justify-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-2.5 w-2.5 text-white" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
            </svg>
          </div>
        </label>

        <!-- Opción Alta -->
        <label 
          :class="[
            'relative flex flex-col items-center justify-center py-3 px-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ease-in-out',
            tipoNota === 'Alta' 
              ? 'border-emerald-600 bg-emerald-50 shadow-md dark:bg-emerald-950/50 dark:border-emerald-500' 
              : 'border-gray-300 bg-white hover:border-emerald-400 hover:bg-emerald-50/50 hover:shadow-sm dark:border-slate-600 dark:bg-slate-800 dark:hover:border-emerald-500 dark:hover:bg-emerald-950/30'
          ]"
        >
          <input 
            type="radio" 
            value="Alta" 
            v-model="tipoNota" 
            class="sr-only" 
          />
          <span 
            :class="[
              'text-base font-semibold transition-colors duration-200',
              tipoNota === 'Alta' ? 'text-emerald-700' : 'text-gray-700'
            ]"
          >
            Alta
          </span>
          <!-- Indicador de selección -->
          <div 
            v-if="tipoNota === 'Alta'"
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
    <div :class="variant === 'compact' ? 'mt-4' : 'mt-8'">
      <h2 :class="variant === 'compact' ? 'text-sm font-medium mb-2 text-gray-800' : 'text-lg font-medium mb-3 text-gray-800'">Fecha de Consulta <span class="text-red-500">*</span></h2>
      <FormKit 
        type="date" 
        name="fechaNotaMedica" 
        placeholder="Seleccione una fecha"
        v-model="fechaNotaMedica" 
      />
    </div>
  </div>
</template>
