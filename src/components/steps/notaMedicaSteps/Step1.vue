<script setup>
import { ref, watch, onMounted, onUnmounted, computed, toRefs } from 'vue';
import { format } from 'date-fns';
import { formatDateYYYYMMDD } from '@/helpers/dates';
import { buildClinicalDirectoryPath } from '@/helpers/clinicalPath';
import { useEmpresasStore } from '@/stores/empresas';
import { useCentrosTrabajoStore } from '@/stores/centrosTrabajo';
import { useTrabajadoresStore } from '@/stores/trabajadores';
import { useFormDataStore } from '@/stores/formDataStore';
import { useDocumentosStore } from '@/stores/documentos';
import { useProveedorSaludStore } from '@/stores/proveedorSalud';
import { useSiresDocumentDateMax } from '@/composables/useSiresDocumentDateMax';
import NotasMedicasAPI from '@/api/NotasMedicasAPI';
import { DocumentoEstado } from '@/interfaces/nom024.interface';

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
const proveedorSaludStore = useProveedorSaludStore();
const { fechaDocumentoMax } = useSiresDocumentDateMax();
const showSiresUI = computed(() => proveedorSaludStore.showSiresUI);

// Valor local para la pregunta principal
const tipoNota = ref('Inicial');
const today = format(new Date(), 'yyyy-MM-dd');

// Inicializar la referencia local sincronizada con formData
const fechaNotaMedica = ref(today);

const establecimientoEspecializado = ref(false);
const esPrimeraVezAnio = ref(false);
const primeraVezUneme = ref(null);
const cargandoContextoCex = ref(false);

const muestraPrimeraVezUneme = computed(() =>
  showSiresUI.value &&
  establecimientoEspecializado.value &&
  esPrimeraVezAnio.value,
);

const documentoConcluido = computed(() => {
  const estado =
    documentos.currentDocument?.estado || formDataNotaMedica.estado;
  return (
    estado === DocumentoEstado.FINALIZADO || estado === DocumentoEstado.ANULADO
  );
});

const etiquetaPrimeraVezAnio = computed(() =>
  esPrimeraVezAnio.value ? 'Sí' : 'No',
);

function aplicarPrimeraVezAnioPersistidoSiConcluido() {
  if (!documentoConcluido.value) return;
  const persistido =
    documentos.currentDocument?.primeraVezAnio ??
    formDataNotaMedica.primeraVezAnio;
  esPrimeraVezAnio.value = persistido === 1;
}

const mensajeErrorFechaConsulta = computed(() => {
  if (!showSiresUI.value || !fechaDocumentoMax.value || !fechaNotaMedica.value) {
    return '';
  }
  if (fechaNotaMedica.value > fechaDocumentoMax.value) {
    return 'La fecha de consulta no puede ser posterior al día de hoy';
  }
  return '';
});

const normalizePrimeraVezUneme = (value) => {
  const n = typeof value === 'string' ? Number(value) : value;
  return n === 0 || n === 1 ? n : null;
};

async function refreshContextoCex() {
  if (!showSiresUI.value || !trabajadores.currentTrabajadorId || !fechaNotaMedica.value) {
    establecimientoEspecializado.value = false;
    esPrimeraVezAnio.value = false;
    aplicarPrimeraVezAnioPersistidoSiConcluido();
    formDataNotaMedica.esPrimeraVezAnioPreview = esPrimeraVezAnio.value;
    return;
  }

  cargandoContextoCex.value = true;
  try {
    const { data } = await NotasMedicasAPI.getContextoCex({
      trabajadorId: trabajadores.currentTrabajadorId,
      fechaNotaMedica: fechaNotaMedica.value,
      excludeDocumentoId: documentos.currentDocument?._id,
    });
    establecimientoEspecializado.value = Boolean(data?.establecimientoEspecializado);
    esPrimeraVezAnio.value = Boolean(data?.esPrimeraVezAnio);
    aplicarPrimeraVezAnioPersistidoSiConcluido();
    formDataNotaMedica.esPrimeraVezAnioPreview = esPrimeraVezAnio.value;
  } catch (error) {
    console.error('Error al obtener contexto CEX:', error);
    establecimientoEspecializado.value = false;
    esPrimeraVezAnio.value = false;
    aplicarPrimeraVezAnioPersistidoSiConcluido();
    formDataNotaMedica.esPrimeraVezAnioPreview = esPrimeraVezAnio.value;
  } finally {
    cargandoContextoCex.value = false;
  }
}

onMounted(async () => {
  if (documentos.currentDocument) {
    // Si se está editando un documento, usa los valores existentes
    tipoNota.value = documentos.currentDocument.tipoNota || 'Inicial';
    fechaNotaMedica.value = formatDateYYYYMMDD(documentos.currentDocument.fechaNotaMedica || today);
    primeraVezUneme.value = normalizePrimeraVezUneme(
      formDataNotaMedica.primeraVezUneme ?? documentos.currentDocument.primeraVezUneme,
    );
  } else {
    // Si es un documento nuevo, usa valores predeterminados o lo que ya exista en formData
    tipoNota.value = formDataNotaMedica.tipoNota || 'Inicial';
    fechaNotaMedica.value = formatDateYYYYMMDD(formDataNotaMedica.fechaNotaMedica || today);
    primeraVezUneme.value = normalizePrimeraVezUneme(formDataNotaMedica.primeraVezUneme);

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

  await refreshContextoCex();
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
watch(fechaNotaMedica, async (newValue) => {
  formDataNotaMedica.fechaNotaMedica = newValue;
  await refreshContextoCex();
});

watch(muestraPrimeraVezUneme, (visible) => {
  formDataNotaMedica.primeraVezUnemeAplica = visible;
  if (!visible) {
    primeraVezUneme.value = null;
    delete formDataNotaMedica.primeraVezUneme;
  }
}, { immediate: true });

watch(primeraVezUneme, (newValue) => {
  if (!muestraPrimeraVezUneme.value) {
    delete formDataNotaMedica.primeraVezUneme;
    return;
  }
  const n = typeof newValue === 'string' ? Number(newValue) : newValue;
  formDataNotaMedica.primeraVezUneme =
    n === 0 || n === 1 ? n : undefined;
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
        :max="fechaDocumentoMax"
        v-model="fechaNotaMedica" 
      />
      <Transition name="fade">
        <div v-if="mensajeErrorFechaConsulta" class="mt-2">
          <div class="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-start gap-2 shadow-sm">
            <i class="fas fa-exclamation-triangle mt-0.5"></i>
            <span class="flex-1 font-medium">{{ mensajeErrorFechaConsulta }}</span>
          </div>
        </div>
      </Transition>
    </div>

    <div
      v-if="showSiresUI"
      :class="variant === 'compact' ? 'mt-4' : 'mt-8'"
    >
      <h2 :class="variant === 'compact' ? 'text-sm font-medium mb-2 text-gray-800' : 'text-lg font-medium mb-3 text-gray-800'">
        Primera consulta del año en este establecimiento
      </h2>
      <p
        :class="variant === 'compact'
          ? 'text-xs text-gray-500 mb-1.5 leading-snug'
          : 'text-base font-medium text-gray-700 mb-2'"
      >
        El sistema lo determina al concluir la nota. No se captura.
      </p>
      <div
        class="rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-800 dark:border-slate-600 dark:bg-slate-800 dark:text-gray-100"
      >
        <span class="font-semibold">{{ etiquetaPrimeraVezAnio }}</span>
        <span class="text-gray-500 dark:text-gray-400"> — {{ etiquetaPrimeraVezAnio === 'Sí' ? 'primera atención del año' : 'ya existía otra consulta finalizada en el año' }}</span>
      </div>
    </div>

    <div v-if="muestraPrimeraVezUneme" :class="variant === 'compact' ? 'mt-4' : 'mt-8'">
      <h2 :class="variant === 'compact' ? 'text-sm font-medium mb-2 text-gray-800' : 'text-lg font-medium mb-3 text-gray-800'">
        Primera vez UNEME <span class="text-red-500">*</span>
      </h2>
      <p
        :class="variant === 'compact'
          ? 'text-xs text-gray-500 mb-1.5 leading-snug'
          : 'text-base font-medium text-gray-700 mb-2'"
      >
        ¿Es la primera consulta del año en una Unidad de Especialidades Médicas?
      </p>
      <div class="grid grid-cols-2 gap-3 mb-1">
        <label
          :class="[
            'relative flex items-center justify-center py-2.5 px-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ease-in-out',
            primeraVezUneme === 0
              ? 'border-emerald-600 bg-emerald-50 shadow-md dark:bg-emerald-950/50 dark:border-emerald-500'
              : 'border-gray-300 bg-white hover:border-emerald-400 hover:bg-emerald-50/50 hover:shadow-sm dark:border-slate-600 dark:bg-slate-800 dark:hover:border-emerald-500 dark:hover:bg-emerald-950/30'
          ]"
        >
          <input type="radio" :value="0" v-model="primeraVezUneme" class="sr-only" />
          <span :class="['text-sm transition-colors duration-200', primeraVezUneme === 0 ? 'text-emerald-700 font-semibold' : 'text-gray-700']">
            No
          </span>
          <div v-if="primeraVezUneme === 0" class="absolute top-2 right-2 w-4 h-4 bg-emerald-600 rounded-full flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-2.5 w-2.5 text-white" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
            </svg>
          </div>
        </label>
        <label
          :class="[
            'relative flex items-center justify-center py-2.5 px-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ease-in-out',
            primeraVezUneme === 1
              ? 'border-emerald-600 bg-emerald-50 shadow-md dark:bg-emerald-950/50 dark:border-emerald-500'
              : 'border-gray-300 bg-white hover:border-emerald-400 hover:bg-emerald-50/50 hover:shadow-sm dark:border-slate-600 dark:bg-slate-800 dark:hover:border-emerald-500 dark:hover:bg-emerald-950/30'
          ]"
        >
          <input type="radio" :value="1" v-model="primeraVezUneme" class="sr-only" />
          <span :class="['text-sm transition-colors duration-200', primeraVezUneme === 1 ? 'text-emerald-700 font-semibold' : 'text-gray-700']">
            Sí
          </span>
          <div v-if="primeraVezUneme === 1" class="absolute top-2 right-2 w-4 h-4 bg-emerald-600 rounded-full flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-2.5 w-2.5 text-white" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
            </svg>
          </div>
        </label>
      </div>
    </div>
  </div>
</template>
