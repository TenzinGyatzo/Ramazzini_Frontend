<script setup>
import { ref, inject, onMounted } from 'vue';	
import { useEmpresasStore } from '@/stores/empresas';
import { useCentrosTrabajoStore } from '@/stores/centrosTrabajo';
import { useTrabajadoresStore } from '@/stores/trabajadores';
import { useProveedorSaludStore } from '@/stores/proveedorSalud';
import { useCurrentUser } from '@/composables/useCurrentUser';
import { useImportacionTrabajadores } from '@/composables/useImportacionTrabajadores';
import { useDirtySnapshot } from '@/composables/useDirtySnapshot';
import { useModalDirtyGuard } from '@/composables/useModalDirtyGuard';
import ModalDiscardConfirmDialog from '@/components/ModalDiscardConfirmDialog.vue';
import { useModalResumenImportacionStore } from '@/stores/modalResumenImportacion';

const toast = inject('toast');

const empresas = useEmpresasStore();
const centrosTrabajo = useCentrosTrabajoStore();
const trabajadores = useTrabajadoresStore();
const proveedorSaludStore = useProveedorSaludStore();
const { ensureUserLoaded } = useCurrentUser();
const { importarTrabajadores, isImporting, importProgress } = useImportacionTrabajadores();
const modalStore = useModalResumenImportacionStore();
const emit = defineEmits(['closeModal', 'openSubscriptionModal']);

// Propiedades reactivas para el archivo
const selectedFile = ref(null);
const isDragOver = ref(false);

const buildFormState = () => ({
  selectedFile: selectedFile.value?.name ?? null,
});

const { isDirty } = useDirtySnapshot(buildFormState, {
  markCleanOnMount: true,
});

const closeModal = () => {
  selectedFile.value = null;
  isDragOver.value = false;
  emit('closeModal');
};

const {
  showDiscardConfirm,
  dismissPulse,
  requestDismiss,
  forceClose,
  continueEditing,
  confirmDiscard,
} = useModalDirtyGuard({
  isDirty,
  onClose: closeModal,
  enabled: () => !isImporting.value,
});

const periodoDePruebaFinalizado = proveedorSaludStore.proveedorSalud?.periodoDePruebaFinalizado;
const estadoSuscripcion = proveedorSaludStore.proveedorSalud?.estadoSuscripcion;
const finDeSuscripcion = proveedorSaludStore.proveedorSalud?.finDeSuscripcion ? new Date(proveedorSaludStore.proveedorSalud.finDeSuscripcion) : null;
let empresaConMasTrabajadores = ""; // Nombre de la empresa con más trabajadores
let trabajadoresCreados = 0;

onMounted(async () => {
  const top3Empresas = await proveedorSaludStore.getTopEmpresasByWorkers();
  if (top3Empresas?.length > 0) {
    empresaConMasTrabajadores = top3Empresas[0].nombreComercial;
    trabajadoresCreados = top3Empresas[0].totalTrabajadores;
  } else {
    console.log("No se encontraron empresas con trabajadores registrados.");
  }
});

// Función para validar archivo
const validateFile = (file) => {
  const validExtensions = ['.xlsx', '.xls', '.csv'];
  const maxSizeMB = 1; // Límite de 1MB
  
  const extension = '.' + file.name.split('.').pop().toLowerCase();
  if (!validExtensions.includes(extension)) {
    return { valid: false, message: 'Solo se permiten archivos: XLSX, XLS, CSV' };
  }
  if (file.size > maxSizeMB * 1024 * 1024) {
    return { valid: false, message: `El archivo es muy grande. Límite: ${maxSizeMB}MB` };
  }
  return { valid: true };
};

// Función para manejar la selección de archivo
const handleFileSelect = (event) => {
  const file = event.target.files[0];
  if (file) {
    const validation = validateFile(file);
    if (!validation.valid) {
      toast.open({ message: validation.message, type: 'error' });
      return;
    }
    selectedFile.value = file;
  }
};

// Eventos de drag and drop
const handleDragEnter = (event) => {
  event.preventDefault();
  event.stopPropagation();
  isDragOver.value = true;
};

const handleDragLeave = (event) => {
  event.preventDefault();
  event.stopPropagation();
  // Solo cambiar a false si salimos del área de drop
  if (!event.currentTarget.contains(event.relatedTarget)) {
    isDragOver.value = false;
  }
};

const handleDragOver = (event) => {
  event.preventDefault();
  event.stopPropagation();
};

const handleDrop = (event) => {
  event.preventDefault();
  event.stopPropagation();
  isDragOver.value = false;
  
  const files = Array.from(event.dataTransfer.files);
  if (files.length > 0) {
    const file = files[0]; // Solo tomamos el primer archivo
    const validation = validateFile(file);
    if (!validation.valid) {
      toast.open({ message: validation.message, type: 'error' });
      return;
    }
    selectedFile.value = file;
  }
};

// Función para remover archivo
const removeFile = () => {
  selectedFile.value = null;
};

// Función para manejar el envío del formulario
const handleSubmit = async () => {
  if (!selectedFile.value) {
    toast.open({ message: 'Por favor seleccione un archivo', type: 'error' });
    return;
  }

  if (!proveedorSaludStore.proveedorSalud) return;

  // Obtener el ID del usuario actual
  const currentUserId = await ensureUserLoaded();
  
  if (!currentUserId) {
    toast.open({ message: 'No se pudo identificar al usuario. Por favor, inicie sesión nuevamente.', type: 'error' });
    return;
  }

  if (periodoDePruebaFinalizado) {
    // Bloquear si el periodo de prueba ha finalizado y no tiene suscripción activa (Inactive aparece cuando el pago falla repetidamente)
    if (!estadoSuscripcion || estadoSuscripcion === 'inactive') {
      emit('openSubscriptionModal');
      return;
    }

    // Bloquear solo si canceló la suscripción y la fecha de fin de suscripción ya pasó
    if (estadoSuscripcion === 'cancelled' && finDeSuscripcion && new Date() > finDeSuscripcion) {
      emit('openSubscriptionModal');
      return;
    }
  }

  try {
    toast.open({ 
      message: `Importando trabajadores, por favor espere...`, 
      type: "info" 
    });
    
    // Usar el composable en lugar del store directo
    await importarTrabajadores(
      selectedFile.value, 
      centrosTrabajo.currentCentroTrabajoId,
      empresas.currentEmpresaId,
    );
    
    // El modal de resumen se mostrará automáticamente desde el composable
    forceClose();
    
    // Actualizar la lista de trabajadores
    await trabajadores.fetchTrabajadores(empresas.currentEmpresaId, centrosTrabajo.currentCentroTrabajoId);
    
  } catch (error) {
    console.log('Error en la petición:', error.response?.data || error.message);
    const errorMessage = error.response?.data?.message || 'Hubo un error, por favor utilice la plantilla.';
    toast.open({ message: errorMessage, type: 'error' });
  }
};

// Función para probar el resumen mixto (opcional, solo para desarrollo)
const testResumenMixto = async () => {
  try {
    toast.open({ message: 'Mostrando resumen mixto de prueba...', type: 'info' });
    
    // Usar el store para crear y mostrar un resumen mixto de prueba
    const testResumen = modalStore.createTestResumen();
    modalStore.showModal(testResumen);
    
    // Cerrar el modal de carga masiva
    forceClose();
    
  } catch (error) {
    console.error('Error al mostrar resumen de prueba:', error);
    toast.open({ message: 'Error al mostrar resumen de prueba', type: 'error' });
  }
};
</script>

<template>
  <div class="modal modal-carga-masiva fixed top-0 left-0 z-20 p-4 sm:p-8 h-screen w-full flex items-center justify-center">
    <!-- Fondo oscuro transparente -->
    <div
      class="absolute top-0 left-0 w-full h-full bg-emerald-900 bg-opacity-50 backdrop-blur-sm"
      :class="{ 'modal-backdrop-pulse': dismissPulse }"
      @click="requestDismiss"
    >
    </div>
    <Transition appear name="fade">
      <!-- Modal centrado con desplazamiento interno -->
      <div
        class="modal-inner relative bg-white text-gray-900 w-full sm:w-4/5 md:w-3/5 xl:w-2/5 2xl:w-1/3 p-10 rounded-lg shadow-md shadow-slate-900 max-h-[90vh] overflow-y-auto"
        :class="{ 'modal-dismiss-pulse': dismissPulse }"
      >
        <!-- Botón para cerrar el modal -->
        <div
          class="modal-close absolute h-16 w-16 flex justify-center items-center top-0 right-0 text-5xl text-gray-400 hover:text-gray-500 cursor-pointer"
          @click="requestDismiss">
          &times;
        </div>

        <h1 class="text-3xl">Importar Trabajadores</h1>
        <hr class="mt-2 mb-3">

        <!-- Área de arrastrar y soltar -->
        <div class="mb-6">
          <div 
            class="border-2 border-dashed rounded-lg p-6 text-center transition-all duration-200 cursor-pointer"
            :class="[
              isDragOver 
                ? 'border-emerald-500 bg-emerald-50 scale-105' 
                : 'border-gray-300 hover:border-emerald-400 hover:bg-gray-50'
            ]"
            @dragenter="handleDragEnter"
            @dragleave="handleDragLeave"
            @dragover="handleDragOver"
            @drop="handleDrop"
            @click="$refs.fileInput.click()"
          >
            <input
              ref="fileInput"
              type="file"
              accept=".xlsx,.xls,.csv"
              @change="handleFileSelect"
              class="hidden"
              :disabled="isImporting"
            />
            
            <div class="text-gray-600">
              <!-- Icono dinámico -->
              <div class="mx-auto h-12 w-12 mb-4 transition-all duration-200 flex items-center justify-center" :class="isDragOver ? 'scale-110' : ''">
                <i class="fa-regular fa-file-excel text-5xl" :class="isDragOver ? 'text-emerald-500' : 'text-gray-400'"></i>
              </div>
              
              <!-- Texto dinámico -->
              <p class="text-lg font-medium transition-colors duration-200" :class="isDragOver ? 'text-emerald-700' : ''">
                {{ isDragOver ? '¡Suelta el archivo aquí!' : 'Arrastra el archivo aquí o haz clic para seleccionar' }}
              </p>
              <p class="text-sm text-gray-500 mt-2">XLSX, XLS, CSV (máximo 1MB)</p>
              
              <!-- Indicador visual cuando se arrastra -->
              <div v-if="isDragOver" class="mt-3">
                <div class="inline-flex items-center px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full text-sm">
                  <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                  </svg>
                  Listo para soltar
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Archivo seleccionado -->
        <div v-if="selectedFile" class="mb-6">
          <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
            <div class="flex items-center space-x-3">
              <!-- Icono de Excel -->
              <div class="flex-shrink-0">
                <svg class="h-6 w-6 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clip-rule="evenodd" />
                </svg>
              </div>
              
              <div class="min-w-0 flex-1">
                <p class="text-sm font-medium text-gray-900 truncate">{{ selectedFile.name }}</p>
                <p class="text-xs text-gray-500">{{ (selectedFile.size / 1024 / 1024).toFixed(2) }} MB</p>
              </div>
            </div>
            
            <button
              @click="removeFile"
              class="flex-shrink-0 text-red-500 hover:text-red-700 transition-colors p-1 rounded"
              :disabled="isImporting"
            >
              <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <!-- Información adicional -->
        <div class="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200 carga-masiva-instrucciones">
          <h4 class="font-medium text-blue-900 mb-2 flex items-center carga-masiva-instrucciones-titulo">
            <svg class="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
            </svg>
            Instrucciones:
          </h4>
          <ul class="text-sm text-blue-800 space-y-1 carga-masiva-instrucciones-lista">
            <li>• Descarga la plantilla: incluye ejemplos ficticios que te guiarán en el llenado.</li>
            <li>• Sustituye los datos ficticios por la información real de tus trabajadores.</li>
            <li>• No elimines columnas, ni cambies los nombres de los encabezados.</li>
            <li>• El sistema intentará normalizar los datos para que sean consistentes con el sistema.</li>
            <li>• Las columnas "Número de empleado", "NSS" y "Teléfono" son opcionales. De no requerirse, dejarlas vacías.</li>
            <li>• El NSS debe tener exactamente 11 dígitos.</li>
            <li>• <strong>Proveedores en México (NOM-024):</strong> Las columnas de identificación geográfica (Entidad Nacimiento, País de nacimiento, Entidad Residencia, Municipio Residencia, Localidad Residencia) son obligatorias y deben usar códigos INEGI/cat_pais.</li>
            <li>• Guarda los cambios y sube el archivo completo.</li>
            <li>• Los trabajadores se importarán automáticamente al sistema.</li>
            <li>• Si requieres asistencia, no dudes en contactarnos vía <span class="text-emerald-600">WhatsApp</span> al número <span class="text-emerald-600">(668) 170 28 50</span>.</li>
          </ul>
        </div>

        <!-- Botones de acción -->
        <div class="flex space-x-3 mb-4">
          <button
            @click="handleSubmit"
            :disabled="!selectedFile || isImporting"
            class="flex-1 bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
          >
            <svg v-if="isImporting" class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span v-if="!isImporting">Importar Trabajadores</span>
            <span v-else>Importando...</span>
          </button>
          <button
            @click="requestDismiss"
            :disabled="isImporting"
            class="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors carga-masiva-cancelar-btn"
          >
            Cancelar
          </button>
        </div>

        <!-- ✅ BOTÓN DE PRUEBA: Para probar el resumen mixto -->
        <!-- <div class="mb-4">
          <button
            @click="testResumenMixto"
            :disabled="isImporting"
            class="w-full bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            🧪 Probar Resumen Mixto (Testing)
          </button>
        </div> -->

        <!-- Botón de descarga de plantilla -->
        <div class="text-center">
          <a href="/template/Plantilla para Importar Trabajadores.xlsx"
            download="Plantilla para Importar Trabajadores.xlsx">
            <button
              class="w-full bg-white text-gray-800 px-4 py-2 rounded-lg border-2 border-gray-300 hover:bg-gray-50 hover:border-gray-400 transition-colors flex items-center justify-center"
              :disabled="isImporting"
            >
              <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
              </svg>
              Descargar Plantilla
            </button>
          </a>
        </div>
      </div>
    </Transition>

    <ModalDiscardConfirmDialog
      :open="showDiscardConfirm"
      @continue-editing="continueEditing"
      @discard="confirmDiscard"
    />
  </div>
</template>

<style scoped>
.fade-slow-enter-from,
.fade-slow-leave-to {
  opacity: 0;
}

.fade-slow-enter-active,
.fade-slow-leave-active {
  transition: all 500ms ease-out;
}

.fade-slow-leave-active {
  transition-delay: 250ms;
}
</style>

<style>
html.dark-mode .modal-carga-masiva .carga-masiva-instrucciones {
  background-color: rgba(30, 58, 138, 0.28) !important;
  border-color: #3b82f6 !important;
}

html.dark-mode .modal-carga-masiva .carga-masiva-instrucciones-titulo {
  color: #dbeafe !important;
}

html.dark-mode .modal-carga-masiva .carga-masiva-instrucciones-lista {
  color: #bfdbfe !important;
}

html.dark-mode .modal-carga-masiva .carga-masiva-cancelar-btn {
  background-color: #334155 !important;
  color: #e2e8f0 !important;
  border: 1px solid #475569 !important;
}

html.dark-mode .modal-carga-masiva .carga-masiva-cancelar-btn:hover {
  background-color: #475569 !important;
  color: #f8fafc !important;
}
</style>