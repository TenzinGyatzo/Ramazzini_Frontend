<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { formatDateDDMMYYYY, formatDateDDMMYYYYHHMMSS } from '@/helpers/dates';
import { useDocumentosStore } from '@/stores/documentos';
import { useMedicoFirmanteStore } from '@/stores/medicoFirmante';
import { useEnfermeraFirmanteStore } from '@/stores/enfermeraFirmante';
import { useTecnicoFirmanteStore } from '@/stores/tecnicoFirmante';
import MedicoFirmanteAPI from '@/api/MedicoFirmanteAPI';
import EnfermeraFirmanteAPI from '@/api/EnfermeraFirmanteAPI';
import TecnicoFirmanteAPI from '@/api/TecnicoFirmanteAPI';
import { formatearTituloYNombreFirmante } from '@/helpers/nombres';
import { useCurrentUser } from '@/composables/useCurrentUser';
import { useProveedorSaludStore } from '@/stores/proveedorSalud';

interface Props {
  documentType: string;
  documentId: string;
  trabajadorId: string;
  documentLabel?: string;
}

const props = defineProps<Props>();
const emit = defineEmits(['closeModal', 'confirmAnular']);

// Stores
const documentosStore = useDocumentosStore();
const medicoStore = useMedicoFirmanteStore();
const enfermeraStore = useEnfermeraFirmanteStore();
const tecnicoStore = useTecnicoFirmanteStore();
const proveedorSaludStore = useProveedorSaludStore();
const { currentUser, ensureUserLoaded } = useCurrentUser();

// Estados reactivos
const loading = ref(false);
const loadingDocumento = ref(false);
const loadingFirmantes = ref(false);
const documento = ref<any>(null);
const firmanteFinalizador = ref<any>(null);
const firmanteAnulador = ref<any>(null);

// Computed properties para fechas del documento
const fechaCreacion = computed(() => {
  if (!documento.value?.createdAt) return null;
  return formatDateDDMMYYYYHHMMSS(new Date(documento.value.createdAt));
});

const fechaFinalizacion = computed(() => {
  if (!documento.value?.fechaFinalizacion) return null;
  return formatDateDDMMYYYYHHMMSS(new Date(documento.value.fechaFinalizacion));
});

const fechaActual = computed(() => formatDateDDMMYYYY(new Date()));
const fechaAnulacion = computed(() => fechaActual.value);

// Usuario actual (Pinia store; localStorage 'user' ya no se persiste)
const user = currentUser;

// Computed property para datos formateados del finalizador
const finalizadorData = computed(() => {
  if (!firmanteFinalizador.value) {
    return null;
  }

  const firmante = firmanteFinalizador.value;
  
  return {
    nombreLinea: formatearTituloYNombreFirmante(
      firmante,
      proveedorSaludStore.regimenRegulatorio,
    ) || 'No disponible',
    cedulaProfesional: firmante.numeroCedulaProfesional 
      ? `Cédula Profesional No. ${firmante.numeroCedulaProfesional}`
      : null,
    cedulaEspecialista: (firmante.especialistaSaludTrabajo === 'Si' || firmante.especialistaSaludTrabajo === true) && firmante.numeroCedulaEspecialista
      ? `Cédula Especialidad Med. del Trab. No. ${firmante.numeroCedulaEspecialista}`
      : null,
    credencialAdicional: firmante.nombreCredencialAdicional && firmante.numeroCredencialAdicional
      ? `${firmante.nombreCredencialAdicional} No. ${firmante.numeroCredencialAdicional}`
      : null
  };
});

// Computed property para datos formateados del anulador
const anuladorData = computed(() => {
  if (!firmanteAnulador.value) {
    return null;
  }

  const firmante = firmanteAnulador.value;
  
  return {
    nombreLinea: formatearTituloYNombreFirmante(
      firmante,
      proveedorSaludStore.regimenRegulatorio,
    ) || 'No disponible',
    cedulaProfesional: firmante.numeroCedulaProfesional 
      ? `Cédula Profesional No. ${firmante.numeroCedulaProfesional}`
      : null,
    cedulaEspecialista: (firmante.especialistaSaludTrabajo === 'Si' || firmante.especialistaSaludTrabajo === true) && firmante.numeroCedulaEspecialista
      ? `Cédula Especialidad Med. del Trab. No. ${firmante.numeroCedulaEspecialista}`
      : null,
    credencialAdicional: firmante.nombreCredencialAdicional && firmante.numeroCredencialAdicional
      ? `${firmante.nombreCredencialAdicional} No. ${firmante.numeroCredencialAdicional}`
      : null
  };
});

// Función para cargar información del documento y firmantes
const loadDocumentData = async () => {
  loadingDocumento.value = true;
  loadingFirmantes.value = true;
  
  try {
    await ensureUserLoaded();

    // 1. Obtener documento completo
    await documentosStore.fetchDocumentById(props.documentType, props.trabajadorId, props.documentId);
    documento.value = documentosStore.currentDocument;
    
    if (!documento.value) {
      console.error('No se pudo cargar el documento');
      return;
    }

    // 2. Obtener finalizadoPor del documento (si está finalizado)
    let finalizadorUserId = documento.value.finalizadoPor;
    
    // Si finalizadoPor es un objeto (poblado), extraer el _id
    if (finalizadorUserId && typeof finalizadorUserId === 'object') {
      finalizadorUserId = finalizadorUserId._id || finalizadorUserId.toString();
    }
    
    // Asegurarse de que sea string
    finalizadorUserId = finalizadorUserId ? String(finalizadorUserId).trim() : null;
    
    if (finalizadorUserId && finalizadorUserId !== 'null' && finalizadorUserId !== 'undefined') {
      // 3. Intentar cargar firmante finalizador (médico, enfermera o técnico)
      try {
        const results = await Promise.allSettled([
          MedicoFirmanteAPI.getMedicoFirmanteByUserId(finalizadorUserId),
          EnfermeraFirmanteAPI.getEnfermeraFirmanteByUserId(finalizadorUserId),
          TecnicoFirmanteAPI.getTecnicoFirmanteByUserId(finalizadorUserId)
        ]);

        // El primero que tenga datos será el firmante finalizador
        for (const result of results) {
          if (result.status === 'fulfilled' && result.value?.data) {
            const responseData = result.value.data;
            // Verificar que tenga un _id (indica que es un firmante válido, no un mensaje de error)
            if (responseData && responseData._id) {
              firmanteFinalizador.value = responseData;
              break;
            }
          }
        }
      } catch (error) {
        console.error('Error al intentar cargar firmantes del finalizador:', error);
      }
    }

    // 4. Cargar firmante anulador (usuario actual)
    const currentUserId = user.value?._id;
    const userRole = user.value?.role;
    
    if (currentUserId && userRole) {
      try {
        if (userRole === 'Médico' || userRole === 'Principal') {
          await medicoStore.loadMedicoFirmante(currentUserId);
          firmanteAnulador.value = medicoStore.medicoFirmante;
        } else if (userRole === 'Enfermero/a') {
          await enfermeraStore.loadEnfermeraFirmante(currentUserId);
          firmanteAnulador.value = enfermeraStore.enfermeraFirmante;
        } else if (userRole === 'Técnico Evaluador') {
          await tecnicoStore.loadTecnicoFirmante(currentUserId);
          firmanteAnulador.value = tecnicoStore.tecnicoFirmante;
        }
      } catch (error) {
        console.error('Error al cargar firmante anulador:', error);
      }
    }
  } catch (error) {
    console.error('Error al cargar el documento:', error);
  } finally {
    loadingDocumento.value = false;
    loadingFirmantes.value = false;
  }
};

// Cargar datos al montar el componente
onMounted(() => {
  loadDocumentData();
});

// Razones predefinidas comunes
const razonesPredefinidas = [
  { id: 'error_datos', label: 'Error en los datos capturados' },
  { id: 'duplicado', label: 'Documento duplicado' },
  { id: 'paciente_incorrecto', label: 'Paciente incorrecto' },
  { id: 'fecha_incorrecta', label: 'Fecha incorrecta' },
  { id: 'error_diagnostico', label: 'Error en diagnóstico o conclusión' },
  { id: 'otro', label: 'Otro (especificar)' },
];

const razonSeleccionada = ref('');
const razonPersonalizada = ref('');

const mostrarCampoPersonalizado = computed(() => razonSeleccionada.value === 'otro');

const razonFinal = computed(() => {
  if (razonSeleccionada.value === 'otro') {
    return razonPersonalizada.value.trim();
  }
  const razon = razonesPredefinidas.find(r => r.id === razonSeleccionada.value);
  return razon?.label || '';
});

const puedeConfirmar = computed(() => {
  if (!razonSeleccionada.value) return false;
  if (razonSeleccionada.value === 'otro' && !razonPersonalizada.value.trim()) return false;
  return true;
});

const handleConfirm = async () => {
  if (!puedeConfirmar.value) return;
  
  loading.value = true;
  try {
    emit('confirmAnular', razonFinal.value);
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <div 
    class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm" 
    @click.self="$emit('closeModal')"
    role="dialog"
    aria-modal="true"
    aria-labelledby="modal-title"
  >
    <div class="modal-anular-documento bg-white rounded-2xl shadow-xl max-w-2xl w-full overflow-hidden transform transition-all">
      <div class="p-6">
        <!-- Header -->
        <div class="flex items-center gap-4 mb-6">
          <div class="modal-anular-doc-rose-icon w-12 h-12 bg-rose-100 rounded-full flex items-center justify-center flex-shrink-0">
            <i class="fas fa-file-circle-xmark text-rose-600 text-xl" aria-hidden="true"></i>
          </div>
          <div>
            <h3 id="modal-title" class="text-xl font-bold text-gray-900">Anular Documento</h3>
            <p class="text-sm text-gray-500">Invalidación oficial del registro médico</p>
          </div>
        </div>

        <!-- Content -->
        <div class="space-y-4 mb-6">
          <!-- Información del Documento -->
          <div class="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <div class="flex items-center gap-2 mb-3">
              <div class="modal-anular-doc-rose-icon w-8 h-8 bg-rose-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <i class="fas fa-file-alt text-rose-600 text-sm"></i>
              </div>
              <h4 class="text-sm font-bold text-gray-800">Información del Documento</h4>
            </div>
            
            <div v-if="loadingDocumento" class="flex items-center justify-center py-4">
              <i class="fas fa-spinner fa-spin text-gray-400"></i>
              <span class="ml-2 text-xs text-gray-500">Cargando información...</span>
            </div>
            
            <div v-else class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <!-- Tipo de Documento -->
              <div class="flex items-center justify-between sm:flex-col sm:items-start sm:gap-1 py-1.5 border-b sm:border-b-0 sm:border-r border-gray-100 sm:border-gray-200 sm:pr-4 last:border-0 last:sm:border-r-0 sm:mx-2">
                <div class="flex items-center gap-2 text-gray-600">
                  <i class="fas fa-tag text-gray-400 text-xs w-4"></i>
                  <span class="text-xs font-medium">Documento:</span>
                </div>
                <span class="text-xs font-semibold text-gray-900">{{ documentLabel || documentType }}</span>
              </div>

              <!-- Fecha de Creación -->
              <div v-if="fechaCreacion" class="flex items-center justify-between sm:flex-col sm:items-start sm:gap-1 py-1.5 border-b sm:border-b-0 sm:border-r border-gray-100 sm:border-gray-200 sm:pr-4 last:border-0 last:sm:border-r-0 sm:mx-2">
                <div class="flex items-center gap-2 text-gray-600">
                  <i class="fas fa-calendar-plus text-blue-400 text-xs w-4"></i>
                  <span class="text-xs font-medium">Creado:</span>
                </div>
                <span class="text-xs font-semibold text-gray-900">{{ fechaCreacion }}</span>
              </div>

              <!-- Fecha de Finalización -->
              <div v-if="fechaFinalizacion" class="flex items-center justify-between sm:flex-col sm:items-start sm:gap-1 py-1.5 border-b sm:border-b-0 sm:border-r border-gray-100 sm:border-gray-200 sm:pr-4 last:border-0 last:sm:border-r-0 sm:mx-2">
                <div class="flex items-center gap-2 text-gray-600">
                  <i class="fas fa-calendar-check text-emerald-400 text-xs w-4"></i>
                  <span class="text-xs font-medium">Finalizado:</span>
                </div>
                <span class="text-xs font-semibold text-gray-900">{{ fechaFinalizacion }}</span>
              </div>

              <!-- Fecha de Anulación -->
              <div class="flex items-center justify-between sm:flex-col sm:items-start sm:gap-1 py-1.5 bg-rose-50 -mx-2 sm:-mx-0 px-2 sm:py-2 rounded-md border-l-2 border-rose-500 sm:pt-2">
                <div class="flex items-center gap-2 text-rose-700">
                  <i class="fas fa-calendar-times text-rose-500 text-xs w-4"></i>
                  <span class="text-xs font-semibold">Anulación:</span>
                </div>
                <span class="text-xs font-bold text-rose-900">{{ fechaAnulacion }}</span>
              </div>
            </div>
          </div>

          <!-- Información de Firmantes -->
          <div v-if="loadingFirmantes" class="bg-blue-50 rounded-xl border border-blue-200 p-4">
            <div class="flex items-center justify-center gap-3">
              <i class="fas fa-spinner fa-spin text-blue-600"></i>
              <span class="text-sm text-blue-700">Cargando información de firmantes...</span>
            </div>
          </div>

          <div v-else-if="finalizadorData || anuladorData" class="bg-white rounded-xl border border-gray-200 p-4">
            <h4 class="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
              <i class="fas fa-user-md text-rose-600"></i>
              Información de Firmantes
            </h4>
            
            <div class="grid grid-cols-2 gap-4">
              <!-- Columna Finalizador -->
              <div class="space-y-3">
                <div class="bg-emerald-50 rounded-lg p-3 border border-emerald-200">
                  <h5 class="text-xs font-bold text-emerald-900 uppercase mb-2">Finalizado por</h5>
                  
                  <div v-if="finalizadorData" class="space-y-2 text-xs">
                    
                    <div>
                      <div class="text-gray-900 font-semibold mt-1 text-sm">{{ finalizadorData.nombreLinea }}</div>
                    </div>
                    
                    <div v-if="finalizadorData.cedulaProfesional">
                      <div class="text-gray-900 mt-1">{{ finalizadorData.cedulaProfesional }}</div>
                    </div>
                    
                    <div v-if="finalizadorData.cedulaEspecialista" class="bg-emerald-100 rounded p-2 -mx-1">
                      <div class="text-gray-900 mt-1">{{ finalizadorData.cedulaEspecialista }}</div>
                    </div>
                    
                    <div v-if="finalizadorData.credencialAdicional">
                      <div class="text-gray-900 mt-1 break-words">{{ finalizadorData.credencialAdicional }}</div>
                    </div>
                  </div>
                  
                  <div v-else class="text-xs text-gray-500 italic">
                    No se encontró información del finalizador
                  </div>
                </div>
              </div>

              <!-- Columna Anulador -->
              <div class="space-y-3">
                <div class="bg-rose-50 rounded-lg p-3 border border-rose-200">
                  <h5 class="text-xs font-bold text-rose-900 uppercase mb-2">Anulador</h5>
                  
                  <div v-if="anuladorData" class="space-y-2 text-xs">
                    
                    <div>
                      <div class="text-gray-900 font-semibold mt-1 text-sm">{{ anuladorData.nombreLinea }}</div>
                    </div>
                    
                    <div v-if="anuladorData.cedulaProfesional">
                      <div class="text-gray-900 mt-1">{{ anuladorData.cedulaProfesional }}</div>
                    </div>
                    
                    <div v-if="anuladorData.cedulaEspecialista" class="bg-rose-100 rounded p-2 -mx-1">
                      <div class="text-gray-900 mt-1">{{ anuladorData.cedulaEspecialista }}</div>
                    </div>
                    
                    <div v-if="anuladorData.credencialAdicional">
                      <div class="text-gray-900 mt-1 break-words">{{ anuladorData.credencialAdicional }}</div>
                    </div>
                  </div>
                  
                  <div v-else class="text-xs text-gray-500 italic">
                    No se encontró información del anulador
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Advertencia si falta información del anulador -->
          <div v-if="!loadingFirmantes && !anuladorData" class="bg-red-50 border-l-4 border-red-400 p-4">
            <div class="flex">
              <div class="flex-shrink-0">
                <i class="fas fa-exclamation-circle text-red-400"></i>
              </div>
              <div class="ml-3">
                <p class="text-sm text-red-700 font-medium">
                  <span class="font-bold">Advertencia:</span> No se encontró información de firmante para su usuario.
                  Es necesario configurar sus datos profesionales antes de anular documentos.
                </p>
              </div>
            </div>
          </div>

          <!-- Selección de razón -->
          <div class="space-y-3 bg-white rounded-xl border border-gray-200 p-4">
            <label class="block text-sm font-semibold text-gray-700">
              Razón de anulación <span class="text-rose-500">*</span>
            </label>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-48 overflow-y-auto">
              <label 
                v-for="razon in razonesPredefinidas" 
                :key="razon.id"
                class="flex items-center p-3 rounded-lg border cursor-pointer transition-all duration-200"
                :class="razonSeleccionada === razon.id 
                  ? 'border-rose-400 bg-rose-50' 
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'"
              >
                <input 
                  type="radio" 
                  :value="razon.id" 
                  v-model="razonSeleccionada"
                  class="w-4 h-4 text-rose-600 focus:ring-rose-500 border-gray-300"
                >
                <span class="ml-3 text-sm text-gray-700">{{ razon.label }}</span>
              </label>
            </div>
          </div>

          <!-- Campo de razón personalizada -->
          <Transition name="slide-fade">
            <div v-if="mostrarCampoPersonalizado" class="space-y-2 dark-mode-input-surface">
              <label class="block text-sm font-medium text-gray-700">
                Especifique la razón <span class="text-rose-500">*</span>
              </label>
              <textarea
                v-model="razonPersonalizada"
                rows="3"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-rose-500 transition-colors text-sm resize-none"
                placeholder="Describa brevemente la razón de la anulación..."
                maxlength="500"
              ></textarea>
              <p class="text-xs text-gray-400 text-right">{{ razonPersonalizada.length }}/500</p>
            </div>
          </Transition>

          <!-- Warning -->
          <div class="bg-rose-50 border-l-4 border-rose-400 p-4">
            <div class="flex">
              <div class="flex-shrink-0">
                <i class="fas fa-exclamation-triangle text-rose-400"></i>
              </div>
              <div class="ml-3">
                <p class="text-sm text-rose-700 font-medium">
                  Atención: Esta acción es <span class="font-bold uppercase underline">irreversible</span>. 
                  El documento quedará marcado como anulado y no podrá ser editado ni eliminado.
                </p>
              </div>
            </div>
          </div>
        </div>

        <!-- Actions -->
        <div class="flex flex-col sm:flex-row gap-3">
          <button 
            type="button" 
            class="flex-1 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl transition-colors duration-200"
            @click="$emit('closeModal')"
            :disabled="loading"
          >
            Cancelar
          </button>
          <button 
            type="button" 
            class="flex-1 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-xl transition-all duration-200 shadow-md shadow-rose-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            @click="handleConfirm"
            :disabled="loading || !puedeConfirmar"
          >
            <i v-if="loading" class="fas fa-spinner fa-spin"></i>
            <span>{{ loading ? 'Anulando...' : 'Confirmar Anulación' }}</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.slide-fade-enter-active,
.slide-fade-leave-active {
  transition: all 0.3s ease;
}

.slide-fade-enter-from,
.slide-fade-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}
</style>

