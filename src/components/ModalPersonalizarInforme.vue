<template>
  <Transition name="modal">
    <div 
      v-if="isOpen" 
      class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
    >
      <div 
        class="bg-white rounded-xl shadow-2xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden"
        @click.stop
      >
        <!-- Header -->
        <div class="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 class="text-2xl font-bold text-gray-800">
              Personalizar Informe de Salud
            </h2>
            <p class="text-sm text-gray-600 mt-1">
              Personaliza las secciones de conclusiones y recomendaciones del informe
            </p>
          </div>
          <button
            @click="closeModal"
            class="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <i class="fas fa-times text-xl"></i>
          </button>
        </div>

        <!-- Tabs -->
        <div class="border-b border-gray-200">
          <nav class="flex space-x-8 px-6">
            <button
              v-for="tab in tabs"
              :key="tab.id"
              @click="activeTab = tab.id"
              :class="[
                'py-4 px-1 border-b-2 font-medium text-sm transition-colors',
                activeTab === tab.id
                  ? 'border-emerald-500 text-emerald-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              ]"
            >
              <i :class="tab.icon" class="mr-2"></i>
              {{ tab.name }}
            </button>
          </nav>
        </div>

        <!-- Content -->
        <div class="p-6 overflow-y-auto max-h-[60vh]">
          <!-- Tab Conclusiones -->
          <div v-if="activeTab === 'conclusiones'" class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Conclusiones del Informe
              </label>
              <p class="text-sm text-gray-600 mb-4">
                Redacta las conclusiones generales del informe de salud ocupacional.
              </p>
              <RichTextEditor
                v-model="formData.conclusiones"
                placeholder="Escribe las conclusiones del informe..."
                :height="'300px'"
              />
            </div>
          </div>

          <!-- Tab Recomendaciones -->
          <div v-if="activeTab === 'recomendaciones'" class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Formato de Recomendaciones
              </label>
              <div class="flex space-x-4 mb-4">
                <label class="flex items-center">
                  <input
                    v-model="formData.formatoRecomendaciones"
                    type="radio"
                    value="texto"
                    class="mr-2 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span class="text-sm text-gray-700">Texto libre</span>
                </label>
                <label class="flex items-center">
                  <input
                    v-model="formData.formatoRecomendaciones"
                    type="radio"
                    value="tabla"
                    class="mr-2 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span class="text-sm text-gray-700">Tabla estructurada</span>
                </label>
              </div>
            </div>

            <!-- Formato Texto -->
            <div v-if="formData.formatoRecomendaciones === 'texto'">
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Recomendaciones de Medidas Preventivas
              </label>
              <p class="text-sm text-gray-600 mb-4">
                Redacta las recomendaciones de medidas preventivas en formato de texto libre.
              </p>
              <RichTextEditor
                v-model="formData.recomendacionesTexto"
                placeholder="Escribe las recomendaciones de medidas preventivas..."
                :height="'300px'"
              />
            </div>

            <!-- Formato Tabla -->
            <div v-if="formData.formatoRecomendaciones === 'tabla'">
              <RecomendacionesTabla
                v-model="formData.recomendacionesTabla"
              />
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
          <div class="text-sm text-gray-600">
            <i class="fas fa-info-circle mr-1"></i>
            Los cambios se guardarán automáticamente al cerrar el modal
          </div>
          <div class="flex space-x-3">
            <button
              @click="closeModal"
              class="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              @click="saveAndClose"
              :disabled="saving"
              class="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <i v-if="saving" class="fas fa-spinner fa-spin"></i>
              <i v-else class="fas fa-save"></i>
              {{ saving ? 'Guardando...' : 'Guardar y Cerrar' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref, watch, computed, onMounted, onUnmounted } from 'vue';
import RichTextEditor from '@/components/RichTextEditor.vue';
import RecomendacionesTabla from '@/components/RecomendacionesTabla.vue';
import { useInformePersonalizacionStore } from '@/stores/informePersonalizacion';
import { useUserStore } from '@/stores/user';
import { cleanEmptyHtml } from '@/helpers/pdfHtmlParser';
import { sanitizeRichHtml } from '@/helpers/sanitizeRichHtml';
import type { 
  InformePersonalizacion, 
  UpdateInformePersonalizacionDto,
  RecomendacionItem 
} from '@/interfaces/informe-personalizacion.interface';

interface Props {
  isOpen: boolean;
  idEmpresa: string;
  idCentroTrabajo?: string;
}

interface Emits {
  (e: 'close'): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const informePersonalizacionStore = useInformePersonalizacionStore();
const userStore = useUserStore();

// Estado del modal
const activeTab = ref<'conclusiones' | 'recomendaciones'>('conclusiones');
const saving = ref(false);

// Datos del formulario
const formData = ref({
  conclusiones: '',
  formatoRecomendaciones: 'texto' as 'texto' | 'tabla',
  recomendacionesTexto: '',
  recomendacionesTabla: [] as RecomendacionItem[]
});

// Configuración de pestañas
const tabs = [
  {
    id: 'conclusiones' as const,
    name: 'Conclusiones',
    icon: 'fas fa-clipboard-list'
  },
  {
    id: 'recomendaciones' as const,
    name: 'Recomendaciones',
    icon: 'fas fa-shield-alt'
  }
];

// Cargar datos existentes cuando se abre el modal
watch(() => props.isOpen, async (isOpen) => {
  if (isOpen) {
    await loadExistingData();
  }
});

const loadExistingData = async () => {
  try {
    await informePersonalizacionStore.loadPersonalizacionByEmpresaAndCentro(
      props.idEmpresa,
      props.idCentroTrabajo
    );

    const existingData = informePersonalizacionStore.currentPersonalizacion;
    
    if (existingData) {
      formData.value = {
        conclusiones: sanitizeRichHtml(existingData.conclusiones || ''),
        formatoRecomendaciones: existingData.formatoRecomendaciones || 'texto',
        recomendacionesTexto: sanitizeRichHtml(existingData.recomendacionesTexto || ''),
        recomendacionesTabla: existingData.recomendacionesTabla || []
      };
    } else {
      // Inicializar con valores por defecto
      formData.value = {
        conclusiones: '',
        formatoRecomendaciones: 'texto',
        recomendacionesTexto: '',
        recomendacionesTabla: []
      };
    }
  } catch (error) {
    console.error('Error loading existing data:', error);
  }
};

const handleBackdropClick = () => {
  closeModal();
};

const closeModal = () => {
  emit('close');
};

        const saveAndClose = async () => {
          try {
            saving.value = true;

            const userId = userStore.user?._id;
            if (!userId) {
              console.error('Usuario no autenticado');
              return;
            }
            
            // Limpiar contenido vacío antes de guardar
            const conclusionesLimpio = cleanEmptyHtml(sanitizeRichHtml(formData.value.conclusiones));
            const recomendacionesTextoLimpio = cleanEmptyHtml(sanitizeRichHtml(formData.value.recomendacionesTexto));

            const updateData: UpdateInformePersonalizacionDto = {
              conclusiones: conclusionesLimpio,
              formatoRecomendaciones: formData.value.formatoRecomendaciones,
              recomendacionesTexto: formData.value.formatoRecomendaciones === 'texto' 
                ? recomendacionesTextoLimpio
                : undefined,
              recomendacionesTabla: formData.value.formatoRecomendaciones === 'tabla' 
                ? formData.value.recomendacionesTabla 
                : undefined,
              updatedBy: userId
            };

            await informePersonalizacionStore.upsertPersonalizacion(
              props.idEmpresa,
              props.idCentroTrabajo,
              updateData
            );

            closeModal();
          } catch (error) {
            console.error('Error saving personalization:', error);
            // Aquí podrías mostrar un toast de error
          } finally {
            saving.value = false;
          }
        };

// Limpiar datos cuando se cierra el modal
watch(() => props.isOpen, (isOpen) => {
  if (!isOpen) {
    formData.value = {
      conclusiones: '',
      formatoRecomendaciones: 'texto',
      recomendacionesTexto: '',
      recomendacionesTabla: []
    };
    activeTab.value = 'conclusiones';
  }
});

// Función para manejar la tecla Esc
const handleKeyDown = (event: KeyboardEvent) => {
  if (event.key === 'Escape' && props.isOpen) {
    closeModal();
  }
};

// Agregar y remover el event listener cuando el modal se abre/cierra
watch(() => props.isOpen, (isOpen) => {
  if (isOpen) {
    document.addEventListener('keydown', handleKeyDown);
  } else {
    document.removeEventListener('keydown', handleKeyDown);
  }
});

// Limpiar el event listener cuando el componente se desmonta
onUnmounted(() => {
  document.removeEventListener('keydown', handleKeyDown);
});
</script>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-to,
.modal-leave-from {
  opacity: 1;
}

/* Estilos para las pestañas */
nav button {
  position: relative;
}

nav button::after {
  content: '';
  position: absolute;
  bottom: -1px;
  left: 0;
  right: 0;
  height: 2px;
  background-color: transparent;
  transition: background-color 0.2s ease;
}

nav button.border-emerald-500::after {
  background-color: #10b981;
}

/* Scrollbar personalizado */
.overflow-y-auto::-webkit-scrollbar {
  width: 6px;
}

.overflow-y-auto::-webkit-scrollbar-track {
  background: #f1f5f9;
}

.overflow-y-auto::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 3px;
}

.overflow-y-auto::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}
</style>
