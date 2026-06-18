<script setup>
import { ref, watch, inject, onMounted, computed } from 'vue';
import { useEmpresasStore } from '@/stores/empresas';
import { useProveedorSaludStore } from '@/stores/proveedorSalud';
import { useUserStore } from '@/stores/user';
import { useCurrentUser } from '@/composables/useCurrentUser';

const toast = inject('toast');

const empresas = useEmpresasStore();
const proveedorSaludStore = useProveedorSaludStore();
const userStore = useUserStore();
const { getCurrentUserId, ensureUserLoaded } = useCurrentUser();
const emit = defineEmits(['closeModal', 'openSubscriptionModal']);

// Propiedades reactivas para el logotipo
const logotipoPreview = ref(null);  // Para la vista previa de la imagen
const logotipoArchivo = ref(null);  // Para el archivo cargado
const isDragOver = ref(false);  // Para el estado de drag and drop

watch(
    () => userStore.user,
    (currentUser) => {
        if (currentUser?.idProveedorSalud) {
            proveedorSaludStore.loadProveedorSalud(currentUser.idProveedorSalud);
        }
    },
    { immediate: true }
);

// Función para validar archivo
const validateFile = (file) => {
  const validExtensions = ['.png', '.jpg', '.jpeg'];
  const maxSizeMB = 1;
  
  const extension = '.' + file.name.split('.').pop().toLowerCase();
  if (!validExtensions.includes(extension)) {
    return { valid: false, message: 'Solo se permiten archivos: PNG, JPG, JPEG' };
  }
  if (file.size > maxSizeMB * 1024 * 1024) {
    return { valid: false, message: `El archivo es muy grande. Límite: ${maxSizeMB}MB` };
  }
  return { valid: true };
};

// Función que se ejecuta cuando el usuario selecciona un archivo
const handleFileChange = (event) => {
  const file = event?.target?.files?.[0]; // Verificamos si el archivo existe
  if (file && file instanceof File) {
    const validation = validateFile(file);
    if (!validation.valid) {
      toast.open({ message: validation.message, type: 'error' });
      return;
    }
    
    logotipoArchivo.value = file;  // Almacenamos el archivo
    const reader = new FileReader();
    reader.onload = (e) => {
      logotipoPreview.value = e.target.result; // Guardar la URL de la imagen
    };
    reader.readAsDataURL(file);  // Leer el archivo como URL
  } else {
    logotipoPreview.value = null; // Limpiar la vista previa si no hay archivo
    logotipoArchivo.value = null; // Limpiar el archivo cargado
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
    
    logotipoArchivo.value = file;
    const reader = new FileReader();
    reader.onload = (e) => {
      logotipoPreview.value = e.target.result;
    };
    reader.readAsDataURL(file);
  }
};

const proveedorSalud = computed(() => proveedorSaludStore.proveedorSalud);

// Función para manejar el envío del formulario
const handleSubmit = async (data) => {

  // Obtener el ID del usuario actual
  const currentUserId = await ensureUserLoaded();
  
  if (!currentUserId) {
    toast.open({ message: 'No se pudo identificar al usuario. Por favor, inicie sesión nuevamente.', type: 'error' });
    return;
  }

  const formData = new FormData();

  // Añadir los datos del formulario al FormData 
  formData.append('nombreComercial', data.nombreComercial);
  formData.append('razonSocial', data.razonSocial);
  formData.append('RFC', data.RFC);
  formData.append('giroDeEmpresa', data.giroDeEmpresa);
  formData.append('createdBy', currentUserId);
  formData.append('updatedBy', currentUserId);
  formData.append('idProveedorSalud', proveedorSaludStore.proveedorSalud._id);

  // Añadir el archivo del logotipo si existe
  if (logotipoArchivo.value) {
    formData.append('logotipoEmpresa', logotipoArchivo.value);
  }

  // Depuramos el contenido de FormData
  // for (let [key, value] of formData.entries()) {
  //     console.log(`${key}:`, value);
  // }

  try {
    if (empresas.currentEmpresa?._id) {
      await empresas.updateEmpresaById(empresas.currentEmpresa._id, formData);
      toast.open({ message: 'Empresa actualizada con éxito' });	
    } else {
      await empresas.createEmpresa(formData);
      toast.open({ message: 'Empresa creada exitosamente' });	
    }
    emit('closeModal');
    empresas.fetchEmpresas(proveedorSaludStore.proveedorSalud._id);
  } catch (error) {
    console.log('Error al crear o actualizar la empresa:', error);
    toast.open({ message: 'Hubo un error, por favor intente nuevamente.', type: 'error' });
  }
};

// Limpiar la vista previa cuando se cierre el modal
const closeModal = () => {
  logotipoPreview.value = null;  // Limpiar la vista previa
  logotipoArchivo.value = null;  // Limpiar el archivo cargado
  isDragOver.value = false;  // Limpiar el estado de drag
  emit('closeModal');
};
</script>

<template>
  <div class="modal modal-empresas fixed top-0 left-0 z-10 p-8 h-screen w-full grid place-items-center">
    <!-- Fondo oscuro transparente -->
    <div class="absolute top-0 left-0 w-full h-full bg-emerald-900 bg-opacity-50 backdrop-blur-sm" @click="closeModal">
    </div>
    <Transition appear name="fade">
      <!-- Modal centrado con desplazamiento interno -->
      <div
        class="modal-inner relative bg-white text-gray-900 w-full sm:w-4/5 md:w-3/5 xl:w-2/5 2xl:w-1/3 p-10 rounded-lg shadow-md shadow-slate-900 max-h-[90vh] overflow-y-auto">
        <!-- Botón para cerrar el modal -->
        <div
          class="modal-close absolute h-16 w-16 flex justify-center items-center top-0 right-0 text-5xl text-gray-400 hover:text-gray-500 cursor-pointer"
          @click="closeModal">
          &times;
        </div>

        <div v-if="empresas.loadingModal">
          <h1 class="text-3xl text-center">Cargando empresa...</h1>
        </div>
        <!-- Contenido del modal -->
        <div v-else>
          <h1 class="text-3xl">{{ empresas.currentEmpresa._id ? 'Editar Empresa' : 'Registrar Empresa' }}</h1>
          <p class="text-xs text-gray-500 mt-1 mb-3">Los campos con <span class="text-red-500 font-medium">*</span> son obligatorios</p>
          <hr class="mt-2 mb-3">

          <FormKit type="form" :actions="false" incomplete-message="Por favor complete todos los campos"
            @submit="handleSubmit">
            <FormKit type="text" name="nombreComercial"
              placeholder="Nombre comercial de la empresa" validation="required"
              :validation-messages="{ required: 'Este campo es obligatorio' }"
              :value="empresas.currentEmpresa?.nombreComercial || ''">
              <template #label>
                <span class="font-medium text-lg text-gray-700">Nombre Comercial<span class="text-red-500">*</span></span>
              </template>
            </FormKit>
            <FormKit type="text" label="Razón Social" name="razonSocial" placeholder="Razón social de la empresa"
              :value="empresas.currentEmpresa?.razonSocial || ''" />
            <FormKit type="text" label="RFC/Registro Patronal" name="RFC" placeholder="RFC o Registro Patronal (opcional)" validation="rfcValidation" :validation-messages="{
                  rfcValidation: 'Debe tener entre 6 y 28 caracteres alfanuméricos con separadores (RFC, Registro Patronal, etc.)',
                }" :value="empresas.currentEmpresa?.RFC || ''" />
            <FormKit type="text" label="Giro de la empresa" name="giroDeEmpresa" placeholder="Giro de la Empresa"
              :value="empresas.currentEmpresa?.giroDeEmpresa || ''" />

            <!-- Área de arrastrar y soltar para el logotipo -->
            <div class="mb-4">
              <label class="block text-sm font-medium text-gray-700 mt-4 mb-2">Logotipo</label>
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
                @click="$refs.logotipoInput.click()"
              >
                <input
                  ref="logotipoInput"
                  type="file"
                                              accept=".png,.jpg,.jpeg"
                  @change="handleFileChange"
                  class="hidden"
                />
                
                <div class="text-gray-600">
                  <!-- Icono dinámico de Imagen -->
                  <div class="mx-auto h-12 w-12 mb-4 transition-all duration-200" :class="isDragOver ? 'scale-110' : ''">
                    <div v-if="!isDragOver" class="flex items-center justify-center">
                      <svg class="h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                        <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                      </svg>
                    </div>

                    <div v-else class="flex items-center justify-center">
                      <svg class="h-12 w-12 text-emerald-500" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                        <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                      </svg>
                    </div>
                  </div>
                  
                  <!-- Texto dinámico -->
                  <p class="text-lg font-medium transition-colors duration-200" :class="isDragOver ? 'text-emerald-700' : ''">
                    {{ isDragOver ? '¡Suelta el logotipo aquí!' : 'Arrastra el logotipo aquí o haz clic para seleccionar' }}
                  </p>
                  <p class="text-sm text-gray-500 mt-2">PNG, JPG, JPEG (máximo 1MB)</p>
                  
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

            <!-- Mostrar la vista previa del logotipo -->
            <div class="flex flex-row justify-center items-center gap-4">
              <div class="w-1/2 flex flex-col items-center" v-if="empresas.currentEmpresa?.logotipoEmpresa?.data">
                <p class="font-medium text-lg text-gray-700">Logotipo actual:</p>
                <img
                  :src="'/uploads/logos/' + empresas.currentEmpresa?.logotipoEmpresa?.data + '?t=' + empresas.currentEmpresa?.updatedAt"
                  :alt="'Logo de ' + empresas.currentEmpresa?.nombreComercial"
                  class="w-48 h-48 object-contain mt-2 border-2 border-gray-300 rounded-lg" />
              </div>
              <Transition appear name="fade-slow">
                <div v-if="logotipoPreview" class="w-1/2 flex flex-col items-center">
                  <p v-if="empresas.currentEmpresa?.logotipoEmpresa?.data" class="font-medium text-lg text-gray-700">
                    Logotipo nuevo:</p>
                  <p v-else class="font-medium text-lg text-gray-700">Logotipo:</p>
                  <img :src="logotipoPreview" alt="Vista previa del logotipo"
                    class="w-48 h-48 object-contain mt-2 border-2 border-gray-300 rounded-lg" />
                </div>
              </Transition>
            </div>
            <hr class="my-3">
            <FormKit type="submit" :disabled="empresas.loadingModal">
              <span v-if="empresas.loadingModal">Guardando...</span>
              <span v-else>{{ empresas.currentEmpresa._id ? 'Actualizar Empresa' : 'Guardar Empresa' }}</span>
            </FormKit>
          </FormKit>
        </div>

        <button
          class="text-xl mt-2 w-full rounded-lg bg-white font-semibold text-gray-800 shadow-sm ring-2 ring-inset ring-gray-300 hover:bg-gray-100 p-3 transition-transform duration-300 transform hover:scale-105 hover:shadow-lg flex-1"
          @click="closeModal">
          Cerrar
        </button>
      </div>
    </Transition>
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

/* Estilo para colorear asteriscos de campos obligatorios en FormKit */
:deep(.formkit-label) {
  color: #374151; /* Color base del texto del label */
}
</style>