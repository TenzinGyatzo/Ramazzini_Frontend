<script setup>
import { ref, inject } from 'vue';
import { useEmpresasStore } from '@/stores/empresas';
import { useCentrosTrabajoStore } from '@/stores/centrosTrabajo';
import { useTrabajadoresStore } from '@/stores/trabajadores';
import { useDocumentosStore } from '@/stores/documentos';
import { useCurrentUser } from '@/composables/useCurrentUser';
import { format } from 'date-fns';
import { convertirYYYYMMDDaISO } from '@/helpers/dates';
import { useDirtySnapshot } from '@/composables/useDirtySnapshot';
import { useModalDirtyGuard } from '@/composables/useModalDirtyGuard';
import ModalDiscardConfirmDialog from '@/components/ModalDiscardConfirmDialog.vue';

const toast = inject('toast');

const { currentEmpresa } = useEmpresasStore();
const { currentCentroTrabajo } = useCentrosTrabajoStore();
const { currentTrabajador } = useTrabajadoresStore();
const documentos = useDocumentosStore();
const { ensureUserLoaded } = useCurrentUser();

const selectedFiles = ref([]);
const isUploading = ref(false);
const uploadProgress = ref(0);
const isDragOver = ref(false);

const buildFormState = () => ({
  files: [...selectedFiles.value].map((file) => file.name).sort(),
});

const { isDirty } = useDirtySnapshot(buildFormState, {
  markCleanOnMount: true,
});

const closeModal = () => {
  selectedFiles.value = [];
  isDragOver.value = false;
  emit('closeDocumentoExternoModal');
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
  enabled: () => !isUploading.value,
});

const emit = defineEmits(['closeDocumentoExternoModal', 'updateData']);

// Función para validar archivos
const validateFiles = (files) => {
  const validExtensions = ['.pdf', '.jpg', '.jpeg', '.png'];
  const maxSizeMB = 1;
  
  const invalidFiles = [];
  const oversizedFiles = [];
  
  Array.from(files).forEach(file => {
    const extension = '.' + file.name.split('.').pop().toLowerCase();
    if (!validExtensions.includes(extension)) {
      invalidFiles.push(file.name);
    }
    if (file.size > maxSizeMB * 1024 * 1024) {
      oversizedFiles.push(file.name);
    }
  });

  return { invalidFiles, oversizedFiles };
};

// Función para manejar la selección de archivos
const handleFileSelect = (event) => {
  const files = Array.from(event.target.files);
  processFiles(files);
};

// Función para procesar archivos (común para drag y select)
const processFiles = (files) => {
  if (files.length === 0) return;

  // Verificar límite de archivos
  const maxFiles = 10;
  const currentCount = selectedFiles.value.length;
  const newFilesCount = files.length;
  
  if (currentCount + newFilesCount > maxFiles) {
    toast.open({
      message: `Máximo ${maxFiles} archivos permitidos. Ya tienes ${currentCount} seleccionados.`,
      type: 'error'
    });
    return;
  }

  const { invalidFiles, oversizedFiles } = validateFiles(files);

  if (invalidFiles.length > 0) {
    toast.open({
      message: `Archivos no válidos: ${invalidFiles.join(', ')}. Solo se permiten: PDF, JPG, JPEG, PNG`,
      type: 'error'
    });
    return;
  }

  if (oversizedFiles.length > 0) {
    toast.open({
      message: `Archivos muy grandes: ${oversizedFiles.join(', ')}. Límite: 1MB por archivo`,
      type: 'error'
    });
    return;
  }

  // Agregar archivos a la lista
  selectedFiles.value = [...selectedFiles.value, ...files];
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
  processFiles(files);
};

// Función para remover archivo de la lista
const removeFile = (index) => {
  selectedFiles.value.splice(index, 1);
};

// Función para limpiar la lista
const clearFiles = () => {
  selectedFiles.value = [];
};

// Función para manejar el envío de múltiples archivos
const handleSubmit = async () => {
  if (selectedFiles.value.length === 0) {
    toast.open({
      message: 'Por favor seleccione al menos un archivo',
      type: 'error'
    });
    return;
  }

  // Obtener el ID del usuario actual
  const currentUserId = await ensureUserLoaded();
  
  if (!currentUserId) {
    toast.open({ message: 'No se pudo identificar al usuario. Por favor, inicie sesión nuevamente.', type: 'error' });
    return;
  }

  isUploading.value = true;
  uploadProgress.value = 0;

  try {
    const totalFiles = selectedFiles.value.length;
    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < selectedFiles.value.length; i++) {
      const file = selectedFiles.value[i];
      
      // Crear FormData para cada archivo
      const formData = new FormData();
      
      // Obtener extensión del archivo
      const extension = '.' + file.name.split('.').pop().toLowerCase();
      
      // Preparar datos del documento
      const documentData = {
        nombreDocumento: file.name.replace(extension, ''), // Nombre sin extensión
        fechaDocumento: convertirYYYYMMDDaISO(format(new Date(), 'yyyy-MM-dd')),
        notasDocumento: '', // Vacío por defecto
        extension: extension,
        rutaDocumento: `expedientes-medicos/${currentEmpresa.nombreComercial}/${currentCentroTrabajo.nombreCentro}/${currentTrabajador.nombre}_${currentTrabajador._id}`,
        idTrabajador: currentTrabajador._id,
        createdBy: currentUserId,
        updatedBy: currentUserId
      };

      // Agregar datos al FormData
      Object.keys(documentData).forEach((key) => {
        formData.append(key, documentData[key]);
      });

      // Agregar archivo
      formData.append('file', file);

      try {
        await documentos.uploadExternalDocument(currentTrabajador._id, formData);
        successCount++;
      } catch (error) {
        console.error(`Error al subir ${file.name}:`, error);
        errorCount++;
      }

      // Actualizar progreso
      uploadProgress.value = ((i + 1) / totalFiles) * 100;
    }

    // Mostrar resultado
    if (successCount > 0) {
      toast.open({ 
        message: `${successCount} documento(s) subido(s) con éxito${errorCount > 0 ? `. ${errorCount} error(es)` : ''}`,
        type: errorCount > 0 ? 'warning' : 'success'
      });
    }

    if (errorCount === 0) {
      emit('updateData');
      forceClose();
    }

  } catch (error) {
    console.error('Error general al subir documentos:', error);
    toast.open({ 
      message: 'Error al subir los documentos, por favor intente nuevamente.', 
      type: 'error' 
    });
  } finally {
    isUploading.value = false;
    uploadProgress.value = 0;
  }
};

</script>

<template>
  <div class="modal fixed top-0 left-0 z-10 p-8 h-screen w-full grid place-items-center">
    <!-- Fondo oscuro transparente -->
    <div
      class="modal-work-overlay absolute top-0 left-0 w-full h-full bg-emerald-900 bg-opacity-50 backdrop-blur-sm"
      :class="{ 'modal-backdrop-pulse': dismissPulse }"
      @click="requestDismiss"
    >
    </div>
    <!-- Modal centrado con desplazamiento interno -->
    <div
      class="modal-work-panel modal-inner relative bg-white text-gray-900 w-full sm:w-4/5 md:w-3/5 xl:w-2/5 2xl:w-1/3 p-10 rounded-lg shadow-md shadow-slate-900 max-h-[90vh] overflow-y-auto"
      :class="{ 'modal-dismiss-pulse': dismissPulse }"
    >
        <!-- Botón para cerrar el modal -->
        <div
          class="modal-close absolute h-16 w-16 flex justify-center items-center top-0 right-0 text-5xl text-gray-400 hover:text-gray-500 cursor-pointer"
          @click="requestDismiss">
          &times;
        </div>

        <h1 class="text-3xl">Subir Documentos Externos</h1>
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
              multiple
              accept=".pdf,.jpg,.jpeg,.png"
              @change="handleFileSelect"
              class="hidden"
              :disabled="isUploading"
            />
            
            <div class="text-gray-600">
              <!-- Icono dinámico -->
              <div class="mx-auto h-12 w-24 mb-4 transition-all duration-200" :class="isDragOver ? 'scale-110' : ''">
                <div v-if="!isDragOver" class="flex items-center justify-center">
                  <!-- Icono de PDF -->
                  <svg class="h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                    <path d="M8 10a4 4 0 014-4h14l8 8v24a4 4 0 01-4 4H12a4 4 0 01-4-4V10z" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M26 6v8h8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M14 30v-6h2.5a1.5 1.5 0 010 3H14" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M20 24v6h1.5a2 2 0 000-6H20" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M26 30v-6h2.5M26 27h2" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M36 12h6m-3-3v6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                  <p>&nbsp;</p>
                  <!-- Icono de Imagen -->
                  <svg class="h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                    <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                  </svg>
                </div>

                <div v-else class="flex items-center justify-center">
                  <!-- Icono de PDF -->
                  <svg class="h-12 w-12 text-emerald-500" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                    <path d="M8 10a4 4 0 014-4h14l8 8v24a4 4 0 01-4 4H12a4 4 0 01-4-4V10z" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M26 6v8h8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M14 30v-6h2.5a1.5 1.5 0 010 3H14" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M20 24v6h1.5a2 2 0 000-6H20" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M26 30v-6h2.5M26 27h2" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M36 12h6m-3-3v6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                  <p>&nbsp;</p>
                  <!-- Icono de Imagen -->
                  <svg class="h-12 w-12 text-emerald-500" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                    <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                  </svg>
                </div>
              </div>
              
              <!-- Texto dinámico -->
              <p class="text-lg font-medium transition-colors duration-200" :class="isDragOver ? 'text-emerald-700' : ''">
                {{ isDragOver ? '¡Suelta los archivos aquí!' : 'Arrastra archivos aquí o haz clic para seleccionar' }}
              </p>
              <p class="text-sm text-gray-500 mt-2">PDF, JPG, JPEG, PNG (máximo 1MB por archivo)</p>
              <p class="text-xs text-gray-400 mt-1">Puedes seleccionar hasta 10 archivos por carga.</p>
              
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

        <!-- Lista de archivos seleccionados -->
        <div v-if="selectedFiles.length > 0" class="mb-6">
          <div class="flex items-center justify-between mb-3">
            <h3 class="text-lg font-medium">Archivos seleccionados ({{ selectedFiles.length }})</h3>
            <button
              @click="clearFiles"
              class="text-sm text-red-600 hover:text-red-800 transition-colors"
              :disabled="isUploading"
            >
              Limpiar todos
            </button>
          </div>
          
          <div class="space-y-2 max-h-60 overflow-y-auto border rounded-lg p-2">
            <div 
              v-for="(file, index) in selectedFiles" 
              :key="index"
              class="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div class="flex items-center space-x-3">
                <!-- Icono según tipo de archivo -->
                <div class="flex-shrink-0">
                  <svg v-if="file.name.toLowerCase().endsWith('.pdf')" class="h-6 w-6 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clip-rule="evenodd" />
                  </svg>
                  <svg v-else class="h-6 w-6 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clip-rule="evenodd" />
                  </svg>
                </div>
                
                <div class="min-w-0 flex-1">
                  <p class="text-sm font-medium text-gray-900 truncate">{{ file.name }}</p>
                  <p class="text-xs text-gray-500">{{ (file.size / 1024 / 1024).toFixed(2) }} MB</p>
                </div>
              </div>
              
              <button
                @click="removeFile(index)"
                class="flex-shrink-0 text-red-500 hover:text-red-700 transition-colors p-1 rounded"
                :disabled="isUploading"
              >
                <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        <!-- Barra de progreso -->
        <div v-if="isUploading" class="mb-6">
          <div class="flex justify-between text-sm text-gray-600 mb-2">
            <span>Subiendo archivos...</span>
            <span>{{ Math.round(uploadProgress) }}%</span>
          </div>
          <div class="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
            <div 
              class="bg-emerald-600 h-2 rounded-full transition-all duration-300 ease-out"
              :style="{ width: uploadProgress + '%' }"
            ></div>
          </div>
        </div>

        <!-- Información adicional -->
        <div class="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <h4 class="font-medium text-blue-900 mb-2 flex items-center">
            <svg class="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
            </svg>
            Consejos útiles:
          </h4>
          <ul class="text-sm text-blue-800 space-y-1">
            <li>• Podrás modificar el nombre y fecha después de la carga</li>
            <li>• Podrás agregar notas después de la carga</li>
          </ul>
        </div>

        <!-- Botones de acción -->
        <div class="flex space-x-3">
          <button
            @click="handleSubmit"
            :disabled="selectedFiles.length === 0 || isUploading"
            class="flex-1 bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
          >
            <svg v-if="isUploading" class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span v-if="!isUploading">Subir {{ selectedFiles.length }} documento(s)</span>
            <span v-else>Subiendo...</span>
          </button>
          <button
            @click="requestDismiss"
            :disabled="isUploading"
            class="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Cancelar
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

/* Estilos para el scrollbar personalizado */
.overflow-y-auto::-webkit-scrollbar {
  width: 6px;
}

.overflow-y-auto::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 3px;
}

.overflow-y-auto::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 3px;
}

.overflow-y-auto::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}
</style>