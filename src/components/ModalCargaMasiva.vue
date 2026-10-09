<script setup>
import { ref, inject, onMounted, computed } from 'vue';	
import { useEmpresasStore } from '@/stores/empresas';
import { useCentrosTrabajoStore } from '@/stores/centrosTrabajo';
import { useTrabajadoresStore } from '@/stores/trabajadores';
import { useProveedorSaludStore } from '@/stores/proveedorSalud';
import { useCurrentUser } from '@/composables/useCurrentUser';
import { useImportacionTrabajadores } from '@/composables/useImportacionTrabajadores';
import { useDirtySnapshot } from '@/composables/useDirtySnapshot';
import { useModalDirtyGuard } from '@/composables/useModalDirtyGuard';
import { useRegulatoryPolicy } from '@/composables/useRegulatoryPolicy';
import { getPlantillaImportacionTrabajadores } from '@/helpers/plantillaImportacionTrabajadores';
import CargaMasivaCodigosSiresPanel from '@/components/CargaMasivaCodigosSiresPanel.vue';
import ModalDiscardConfirmDialog from '@/components/ModalDiscardConfirmDialog.vue';
import { useModalResumenImportacionStore } from '@/stores/modalResumenImportacion';

const toast = inject('toast');

const empresas = useEmpresasStore();
const centrosTrabajo = useCentrosTrabajoStore();
const trabajadores = useTrabajadoresStore();
const proveedorSaludStore = useProveedorSaludStore();
const { ensureUserLoaded } = useCurrentUser();
const { isSIRES } = useRegulatoryPolicy();
const { importarTrabajadores, isImporting, importProgress } = useImportacionTrabajadores();
const modalStore = useModalResumenImportacionStore();
const emit = defineEmits(['closeModal', 'openSubscriptionModal']);

const plantillaImportacion = computed(() =>
  getPlantillaImportacionTrabajadores(
    isSIRES.value ? 'SIRES_NOM024' : 'SIN_REGIMEN',
  ),
);

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

  // Acceso comercial (prueba, suscripción, contrato con Ramazzini o restricción): una sola regla
  if (proveedorSaludStore.bloqueoComercial) {
    emit('openSubscriptionModal');
    return;
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
      currentUserId,
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
      class="modal-work-overlay absolute top-0 left-0 w-full h-full bg-emerald-900 bg-opacity-50 backdrop-blur-sm"
      :class="{ 'modal-backdrop-pulse': dismissPulse }"
      @click="requestDismiss"
    >
    </div>
    <!-- Modal centrado con desplazamiento interno -->
    <div
      class="modal-work-panel modal-inner relative bg-white text-gray-900 w-full max-w-2xl p-5 sm:p-6 rounded-xl shadow-md shadow-slate-900 max-h-[90vh] overflow-y-auto"
      :class="{ 'modal-dismiss-pulse': dismissPulse }"
    >
        <!-- Botón para cerrar el modal -->
        <button
          type="button"
          class="modal-close absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors duration-150 hover:bg-gray-100 hover:text-gray-600"
          title="Cerrar"
          aria-label="Cerrar"
          @click="requestDismiss">
          <i class="fa-solid fa-xmark text-base"></i>
        </button>

        <h1 class="modal-carga-masiva__titulo pr-10 text-lg font-semibold text-gray-900">Carga masiva de trabajadores</h1>
        <p v-if="centrosTrabajo.currentCentroTrabajo?.nombreCentro" class="truncate text-sm text-gray-500">
          Se registrarán en {{ centrosTrabajo.currentCentroTrabajo.nombreCentro }}
        </p>
        <hr class="mt-3 mb-4">

        <!-- Cómo funciona: tres pasos -->
        <ol class="mb-4 space-y-2 text-sm text-gray-700">
          <li class="flex items-start gap-3">
            <span class="carga-masiva-paso">1</span>
            <div class="min-w-0 flex-1">
              <p>
                <span class="font-medium text-gray-900">Descarga la plantilla.</span>
                Trae ejemplos y una nota de ayuda en cada encabezado.
              </p>
              <a
                :href="plantillaImportacion.href"
                :download="plantillaImportacion.downloadName"
                class="carga-masiva-plantilla-btn nav-action-link mt-2 inline-flex items-center gap-2 rounded-lg border border-emerald-600 bg-white px-3 py-1.5 text-sm font-medium text-emerald-700 transition-colors duration-150 hover:bg-emerald-50"
              >
                <i class="fa-solid fa-download text-xs"></i>
                Descargar plantilla
              </a>
            </div>
          </li>
          <li class="flex items-start gap-3">
            <span class="carga-masiva-paso">2</span>
            <p class="min-w-0 flex-1">
              <span class="font-medium text-gray-900">Llénala con tus trabajadores.</span>
              Sustituye los ejemplos, sin quitar columnas ni cambiar los encabezados.
            </p>
          </li>
          <li class="flex items-start gap-3">
            <span class="carga-masiva-paso">3</span>
            <p class="min-w-0 flex-1">
              <span class="font-medium text-gray-900">Sube el archivo.</span>
              Se registran los renglones correctos; los que tengan algún error aparecen en un resumen con su motivo, para que los corrijas y los subas de nuevo.
            </p>
          </li>
        </ol>

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

        <!-- SIRES: lo que cambia en su plantilla -->
        <p v-if="isSIRES" class="mb-3 text-sm text-gray-600">
          <span class="font-medium text-gray-900">Datos obligatorios:</span>
          la CURP y los datos de nacimiento y residencia. País y entidad se eligen de la lista de la celda; municipio y localidad se capturan con su código, que puedes buscar aquí abajo.
        </p>

        <CargaMasivaCodigosSiresPanel v-if="isSIRES" class="mb-4" />

        <p class="mb-4 text-xs text-gray-500">
          ¿Necesitas ayuda? Escríbenos por WhatsApp al <span class="font-medium text-emerald-600">(668) 170 28 50</span>.
        </p>

        <!-- Botones de acción -->
        <div class="flex flex-wrap items-center justify-end gap-2 border-t border-gray-200 pt-4">
          <button
            type="button"
            @click="requestDismiss"
            :disabled="isImporting"
            class="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors duration-150 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            @click="handleSubmit"
            :disabled="!selectedFile || isImporting"
            class="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition-colors duration-150 hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <i v-if="isImporting" class="fa-solid fa-spinner fa-spin text-xs"></i>
            {{ isImporting ? 'Importando...' : 'Importar trabajadores' }}
          </button>
        </div>
      </div>

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

.carga-masiva-paso {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 1.5rem;
  height: 1.5rem;
  border-radius: 9999px;
  background-color: #d1fae5;
  color: #065f46;
  font-size: 0.75rem;
  font-weight: 600;
}
</style>

<style>
/* La regla global de .text-lg atenúa el título */
html.dark-mode .modal-carga-masiva__titulo {
  color: #f1f5f9 !important;
}

html.dark-mode .modal-carga-masiva .carga-masiva-paso {
  background-color: #065f46 !important;
  color: #a7f3d0 !important;
}

html.dark-mode .modal-carga-masiva .carga-masiva-plantilla-btn {
  background-color: #1e293b !important;
  border-color: #10b981 !important;
  color: #6ee7b7 !important;
}

html.dark-mode .modal-carga-masiva .carga-masiva-plantilla-btn:hover {
  background-color: #064e3b !important;
}

html.dark-mode .modal-carga-masiva .modal-close:hover {
  background-color: #334155 !important;
  color: #e2e8f0 !important;
}

html.dark-mode .modal-carga-masiva .carga-masiva-codigos-sires {
  background-color: rgba(30, 27, 75, 0.45) !important;
  border-color: rgba(99, 102, 241, 0.45) !important;
}

html.dark-mode .modal-carga-masiva .carga-masiva-codigos-sires input:disabled {
  background-color: #334155 !important;
  color: #64748b !important;
}
</style>