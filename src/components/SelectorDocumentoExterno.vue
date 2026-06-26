<script setup lang="ts">
import { ref, computed, inject, onMounted } from 'vue';
import { useDocumentosStore } from '@/stores/documentos';
import { useTrabajadoresStore } from '@/stores/trabajadores';
import { useCurrentUser } from '@/composables/useCurrentUser';
import { useEmpresasStore } from '@/stores/empresas';
import { useCentrosTrabajoStore } from '@/stores/centrosTrabajo';
import { convertirFechaISOaDDMMYYYY, convertirYYYYMMDDaISO } from '@/helpers/dates';
import { buildClinicalDirectoryPath } from '@/helpers/clinicalPath';
import { format } from 'date-fns';
import type { DocumentoExterno } from '@/interfaces/documentos.inteface';

const toast: any = inject('toast');

const props = defineProps<{
  isOpen: boolean;
  trabajadorId: string;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'seleccionar', documento: DocumentoExterno): void;
}>();

const documentos = useDocumentosStore();
const trabajadores = useTrabajadoresStore();
const { ensureUserLoaded } = useCurrentUser();
const { currentEmpresa } = useEmpresasStore();
const { currentCentroTrabajo } = useCentrosTrabajoStore();

const activeTab = ref<'seleccionar' | 'subir'>('subir');
const selectedFiles = ref<File[]>([]);
const isUploading = ref(false);
const uploadProgress = ref(0);
const isDragOver = ref(false);
const fileInput = ref<HTMLInputElement | null>(null);

// Documentos disponibles para vincular (sin vínculo previo)
const documentosDisponibles = computed(() => {
  const docs = documentos.documentsByYear;
  const allDocs: DocumentoExterno[] = [];
  
  Object.values(docs).forEach(yearData => {
    if (yearData.documentosExternos) {
      yearData.documentosExternos.forEach(doc => {
        // Filtrar documentos que ya tienen un resultado vinculado
        if (!doc.idResultadoClinico) {
          allDocs.push(doc);
        }
      });
    }
  });
  
  // Ordenar por fecha descendente
  return allDocs.sort((a, b) => {
    const dateA = new Date(a.fechaDocumento).getTime();
    const dateB = new Date(b.fechaDocumento).getTime();
    return dateB - dateA;
  });
});

onMounted(async () => {
  if (props.isOpen && props.trabajadorId) {
    await documentos.fetchAllDocuments(props.trabajadorId);
  }
});

const handleClose = () => {
  emit('close');
  resetUploadState();
};

const handleSeleccionar = (documento: DocumentoExterno) => {
  emit('seleccionar', documento);
  handleClose();
};

// Upload functions
const validateFiles = (files: File[]) => {
  const validExtensions = ['.pdf', '.jpg', '.jpeg', '.png'];
  const maxSizeMB = 1;
  
  const invalidFiles: string[] = [];
  const oversizedFiles: string[] = [];
  
  files.forEach(file => {
    const extension = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!validExtensions.includes(extension)) {
      invalidFiles.push(file.name);
    }
    if (file.size > maxSizeMB * 1024 * 1024) {
      oversizedFiles.push(file.name);
    }
  });

  return { invalidFiles, oversizedFiles };
};

const handleFileSelect = (event: Event) => {
  const target = event.target as HTMLInputElement;
  if (target.files) {
    const files = Array.from(target.files);
    processFiles(files);
  }
};

const processFiles = (files: File[]) => {
  if (files.length === 0) return;

  // Solo permitir 1 archivo a la vez para vinculación
  if (files.length > 1) {
    toast.open({
      message: 'Solo puedes subir un archivo a la vez para vincular',
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

  selectedFiles.value = files;
};

// Drag and drop events
const handleDragEnter = (event: DragEvent) => {
  event.preventDefault();
  event.stopPropagation();
  isDragOver.value = true;
};

const handleDragLeave = (event: DragEvent) => {
  event.preventDefault();
  event.stopPropagation();
  const target = event.currentTarget as HTMLElement | null;
  if (target && event.relatedTarget && !target.contains(event.relatedTarget as Node)) {
    isDragOver.value = false;
  }
};

const handleDragOver = (event: DragEvent) => {
  event.preventDefault();
  event.stopPropagation();
};

const handleDrop = (event: DragEvent) => {
  event.preventDefault();
  event.stopPropagation();
  isDragOver.value = false;
  
  if (event.dataTransfer?.files) {
    const files = Array.from(event.dataTransfer.files);
    processFiles(files);
  }
};

const removeFile = (index: number) => {
  selectedFiles.value.splice(index, 1);
};

const resetUploadState = () => {
  selectedFiles.value = [];
  isDragOver.value = false;
  uploadProgress.value = 0;
  isUploading.value = false;
  activeTab.value = 'subir';
};

const handleSubmitUpload = async () => {
  if (selectedFiles.value.length === 0) {
    toast.open({
      message: 'Por favor selecciona un archivo',
      type: 'error'
    });
    return;
  }

  const currentUserId = await ensureUserLoaded();
  
  if (!currentUserId) {
    toast.open({ message: 'No se pudo identificar al usuario. Por favor, inicia sesión nuevamente.', type: 'error' });
    return;
  }

  isUploading.value = true;
  uploadProgress.value = 0;

  try {
    if (!currentEmpresa) {
      toast.open({ message: 'No se pudo obtener la información de la empresa.', type: 'error' });
      return;
    }

    if (!currentCentroTrabajo) {
      toast.open({ message: 'No se pudo obtener la información del centro de trabajo.', type: 'error' });
      return;
    }

    if (!trabajadores.currentTrabajador) {
      toast.open({ message: 'No se pudo obtener la información del trabajador.', type: 'error' });
      return;
    }

    const file = selectedFiles.value[0];
    const formData = new FormData();
    
    const extension = '.' + file.name.split('.').pop()?.toLowerCase();
    
    const documentData = {
      nombreDocumento: file.name.replace(extension, ''),
      fechaDocumento: convertirYYYYMMDDaISO(format(new Date(), 'yyyy-MM-dd')),
      notasDocumento: '',
      extension: extension,
      rutaDocumento: buildClinicalDirectoryPath(
        currentEmpresa.nombreComercial,
        currentCentroTrabajo.nombreCentro,
        trabajadores.currentTrabajador.nombre,
        trabajadores.currentTrabajador._id,
      ),
      idTrabajador: trabajadores.currentTrabajador._id,
      createdBy: currentUserId,
      updatedBy: currentUserId
    };

    Object.keys(documentData).forEach((key) => {
      formData.append(key, documentData[key as keyof typeof documentData]);
    });

    formData.append('file', file);

    await documentos.uploadExternalDocument(trabajadores.currentTrabajador._id, formData);
    
    uploadProgress.value = 100;
    
    // Refrescar documentos para que el recién subido aparezca en la lista
    await documentos.fetchAllDocuments(trabajadores.currentTrabajador._id);
    
    toast.open({ 
      message: 'Documento subido exitosamente. Ahora selecciónalo para vincularlo.',
      type: 'info',
      duration: 4000
    });

    // Cambiar automáticamente al tab de seleccionar para que el usuario pueda elegir el documento
    activeTab.value = 'seleccionar';
    
    // Limpiar el estado de upload
    selectedFiles.value = [];
    isUploading.value = false;
    uploadProgress.value = 0;
  } catch (error) {
    console.error('Error al subir documento:', error);
    toast.open({ 
      message: 'Error al subir el documento, por favor intenta nuevamente.', 
      type: 'error' 
    });
  } finally {
    isUploading.value = false;
    uploadProgress.value = 0;
  }
};

const formatDate = (date: string) => {
  return convertirFechaISOaDDMMYYYY(date);
};

const getExtensionIcon = (extension: string) => {
  if (extension === '.pdf') return 'fas fa-file-pdf text-red-500';
  if (['.jpg', '.jpeg', '.png'].includes(extension)) return 'fas fa-file-image text-blue-500';
  return 'fas fa-file text-gray-500';
};
</script>

<template>
  <Transition name="fade">
    <div v-if="isOpen" class="fixed inset-0 z-[60]">
      <div class="fixed inset-0 bg-gray-900/60 pointer-events-none" aria-hidden="true" />
      <div class="flex min-h-full items-center justify-center p-4" @click.self="handleClose">
        <div class="w-full max-w-2xl rounded-2xl bg-white shadow-xl relative max-h-[90vh] flex flex-col" @click.stop>
          <!-- Header -->
          <div class="px-6 py-5 border-b border-gray-200">
            <div class="flex items-center justify-between">
              <h3 class="text-lg font-semibold text-gray-900">Vincular documento de respaldo</h3>
              <button
                @click="handleClose"
                class="text-gray-400 hover:text-gray-500 transition-colors"
              >
                <i class="fas fa-times text-xl"></i>
              </button>
            </div>
            <p class="text-sm text-gray-600 mt-1">Selecciona un documento existente o sube uno nuevo</p>
          </div>

          <!-- Tabs -->
          <div class="flex border-b border-gray-200">
            <button
              @click="activeTab = 'subir'"
              :class="[
                'flex-1 px-6 py-3 text-sm font-semibold transition-colors',
                activeTab === 'subir'
                  ? 'text-emerald-600 border-b-2 border-emerald-600'
                  : 'text-gray-500 hover:text-gray-700'
              ]"
            >
              <i class="fas fa-cloud-upload-alt mr-2"></i>
              Subir nuevo
            </button>
            <button
              @click="activeTab = 'seleccionar'"
              :class="[
                'flex-1 px-6 py-3 text-sm font-semibold transition-colors',
                activeTab === 'seleccionar'
                  ? 'text-emerald-600 border-b-2 border-emerald-600'
                  : 'text-gray-500 hover:text-gray-700'
              ]"
            >
              <i class="fas fa-list mr-2"></i>
              Seleccionar existente
            </button>
          </div>

          <!-- Content -->
          <div class="flex-1 overflow-y-auto p-6">
            <!-- Tab: Seleccionar existente -->
            <div v-if="activeTab === 'seleccionar'">
              <div v-if="documentosDisponibles.length === 0" class="text-center py-8">
                <i class="fas fa-folder-open text-gray-300 text-5xl mb-4"></i>
                <p class="text-gray-500">No hay documentos disponibles para vincular</p>
                <p class="text-sm text-gray-400 mt-1">Todos los documentos ya están vinculados a otros resultados</p>
              </div>

              <div v-else class="space-y-2">
                <div
                  v-for="doc in documentosDisponibles"
                  :key="doc._id"
                  @click="handleSeleccionar(doc)"
                  class="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:border-emerald-500 hover:bg-emerald-50 transition-all cursor-pointer"
                >
                  <div class="flex-shrink-0">
                    <i :class="getExtensionIcon(doc.extension)" class="text-2xl"></i>
                  </div>
                  <div class="flex-1 min-w-0">
                    <p class="text-sm font-semibold text-gray-800 truncate">{{ doc.nombreDocumento }}</p>
                    <p class="text-xs text-gray-500">{{ formatDate(doc.fechaDocumento) }}</p>
                  </div>
                  <div>
                    <i class="fas fa-chevron-right text-gray-400"></i>
                  </div>
                </div>
              </div>
            </div>

            <!-- Tab: Subir nuevo -->
            <div v-if="activeTab === 'subir'">
              <!-- Drag and drop area -->
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
                @click="fileInput?.click()"
              >
                <input
                  ref="fileInput"
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  @change="handleFileSelect"
                  class="hidden"
                  :disabled="isUploading"
                />
                
                <div class="text-gray-600">
                  <div class="mx-auto h-12 w-12 mb-4">
                    <i v-if="!isDragOver" class="fas fa-cloud-upload-alt text-gray-400 text-5xl"></i>
                    <i v-else class="fas fa-cloud-upload-alt text-emerald-500 text-5xl"></i>
                  </div>
                  
                  <p class="text-lg font-medium transition-colors duration-200" :class="isDragOver ? 'text-emerald-700' : ''">
                    {{ isDragOver ? '¡Suelta el archivo aquí!' : 'Arrastra un archivo aquí o haz clic' }}
                  </p>
                  <p class="text-sm text-gray-500 mt-2">PDF, JPG, JPEG, PNG (máximo 1MB)</p>
                </div>
              </div>

              <!-- Selected file -->
              <div v-if="selectedFiles.length > 0" class="mt-4">
                <div 
                  v-for="(file, index) in selectedFiles" 
                  :key="index"
                  class="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div class="flex items-center space-x-3">
                    <i class="fas fa-file text-gray-400 text-xl"></i>
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
                    <i class="fas fa-times"></i>
                  </button>
                </div>
              </div>

              <!-- Upload progress -->
              <div v-if="isUploading" class="mt-4">
                <div class="flex justify-between text-sm text-gray-600 mb-2">
                  <span>Subiendo archivo...</span>
                  <span>{{ Math.round(uploadProgress) }}%</span>
                </div>
                <div class="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                  <div 
                    class="bg-emerald-600 h-2 rounded-full transition-all duration-300 ease-out"
                    :style="{ width: uploadProgress + '%' }"
                  ></div>
                </div>
              </div>
            </div>
          </div>

          <!-- Footer -->
          <div class="flex justify-end gap-3 border-t border-gray-200 px-6 py-4">
            <button
              v-if="activeTab === 'subir' && selectedFiles.length > 0"
              @click="handleSubmitUpload"
              :disabled="isUploading"
              class="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-semibold text-sm"
            >
              <i v-if="isUploading" class="fas fa-spinner fa-spin mr-2"></i>
              {{ isUploading ? 'Subiendo...' : 'Subir documento' }}
            </button>
            <button
              @click="handleClose"
              :disabled="isUploading"
              class="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-semibold text-sm"
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
