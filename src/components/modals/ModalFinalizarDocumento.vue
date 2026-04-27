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

interface Props {
  documentType: string;
  documentId: string;
  trabajadorId: string;
  documentLabel?: string;
}

const props = defineProps<Props>();
const emit = defineEmits(['closeModal', 'confirmFinalize']);

// Stores
const documentosStore = useDocumentosStore();
const medicoStore = useMedicoFirmanteStore();
const enfermeraStore = useEnfermeraFirmanteStore();
const tecnicoStore = useTecnicoFirmanteStore();

// Estados reactivos
const loading = ref(false);
const loadingFirmantes = ref(false);
const documento = ref<any>(null);
const firmanteCreador = ref<any>(null);
const firmanteFinalizador = ref<any>(null);

// Computed properties para fechas del documento
const fechaCreacion = computed(() => {
  if (!documento.value?.createdAt) return null;
  return formatDateDDMMYYYYHHMMSS(new Date(documento.value.createdAt));
});

const fechaActualizacion = computed(() => {
  if (!documento.value?.updatedAt) return null;
  return formatDateDDMMYYYYHHMMSS(new Date(documento.value.updatedAt));
});

const fechaFinalizacion = computed(() => {
  if (!documento.value?.fechaFinalizacion) return null;
  return formatDateDDMMYYYYHHMMSS(new Date(documento.value.fechaFinalizacion));
});

const fechaActual = computed(() => formatDateDDMMYYYY(new Date()));
const fechaCierre = computed(() => fechaActual.value);

// Etiqueta dinámica para el elaborador según el tipo de documento
const etiquetaElaborador = computed(() => {
  const tipoNormalizado = props.documentType?.toLowerCase().replace(/\s+/g, '');
  if (tipoNormalizado === 'documentoexterno') {
    return 'Cargado al sistema por';
  }
  return 'Elaborado por';
});

// Usuario actual
const user = computed(() => {
  try {
    return JSON.parse(localStorage.getItem('user') || '{}');
  } catch (e) {
    return {};
  }
});

// Computed property para datos formateados del elaborador
const elaboradorData = computed(() => {
  if (!firmanteCreador.value) {
    return null;
  }

  const firmante = firmanteCreador.value;
  
  // Determinar tipo de profesional
  let tipo = 'Profesional';
  if (firmante.especialistaSaludTrabajo !== undefined) {
    tipo = 'Médico';
  } else if (firmante.sexo) {
    // Si tiene sexo pero no especialidad, podría ser enfermera o técnico
    tipo = firmante.tituloProfesional?.toLowerCase().includes('técnico') ? 'Técnico Evaluador' : 'Enfermero/a';
  }

  return {
    tipo,
    nombre: firmante.nombre || 'No disponible',
    tituloProfesional: firmante.tituloProfesional || '',
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

// Computed property para datos formateados del finalizador
const finalizadorData = computed(() => {
  if (!firmanteFinalizador.value) {
    return null;
  }

  const firmante = firmanteFinalizador.value;
  
  // Determinar tipo de profesional basado en el rol del usuario
  let tipo = 'Profesional';
  if (user.value?.role === 'Médico' || user.value?.role === 'Principal') {
    tipo = 'Médico';
  } else if (user.value?.role === 'Enfermero/a') {
    tipo = 'Enfermero/a';
  } else if (user.value?.role === 'Técnico Evaluador') {
    tipo = 'Técnico Evaluador';
  }

  return {
    tipo,
    nombre: firmante.nombre || 'No disponible',
    tituloProfesional: firmante.tituloProfesional || '',
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

// Función para cargar información de los firmantes
const loadFirmanteData = async () => {
  loadingFirmantes.value = true;
  
  try {
    // 1. Obtener documento completo
    await documentosStore.fetchDocumentById(props.documentType, props.trabajadorId, props.documentId);
    documento.value = documentosStore.currentDocument;
    
    if (!documento.value) {
      console.error('No se pudo cargar el documento');
      return;
    }

    // 2. Obtener createdBy del documento
    // Manejar el caso donde createdBy puede ser un objeto o un string
    let creatorUserId = documento.value.createdBy;
    
    // Si createdBy es un objeto (poblado), extraer el _id
    if (creatorUserId && typeof creatorUserId === 'object') {
      creatorUserId = creatorUserId._id || creatorUserId.toString();
    }
    
    // Asegurarse de que sea string
    creatorUserId = creatorUserId ? String(creatorUserId).trim() : null;
    
    if (creatorUserId && creatorUserId !== 'null' && creatorUserId !== 'undefined') {
      // 3. Intentar cargar firmante creador (médico, enfermera o técnico)
      try {
        const results = await Promise.allSettled([
          MedicoFirmanteAPI.getMedicoFirmanteByUserId(creatorUserId),
          EnfermeraFirmanteAPI.getEnfermeraFirmanteByUserId(creatorUserId),
          TecnicoFirmanteAPI.getTecnicoFirmanteByUserId(creatorUserId)
        ]);

        // El primero que tenga datos será el firmante creador
        for (const result of results) {
          if (result.status === 'fulfilled' && result.value?.data) {
            const responseData = result.value.data;
            // Verificar que tenga un _id (indica que es un firmante válido, no un mensaje de error)
            if (responseData && responseData._id) {
              firmanteCreador.value = responseData;
              break;
            }
          }
        }
      } catch (error) {
        console.error('Error al intentar cargar firmantes del creador:', error);
      }
    }

    // 4. Cargar firmante finalizador (usuario actual)
    const currentUserId = user.value?._id;
    const userRole = user.value?.role;
    
    if (currentUserId && userRole) {
      try {
        if (userRole === 'Médico' || userRole === 'Principal') {
          await medicoStore.loadMedicoFirmante(currentUserId);
          firmanteFinalizador.value = medicoStore.medicoFirmante;
        } else if (userRole === 'Enfermero/a') {
          await enfermeraStore.loadEnfermeraFirmante(currentUserId);
          firmanteFinalizador.value = enfermeraStore.enfermeraFirmante;
        } else if (userRole === 'Técnico Evaluador') {
          await tecnicoStore.loadTecnicoFirmante(currentUserId);
          firmanteFinalizador.value = tecnicoStore.tecnicoFirmante;
        }
      } catch (error) {
        console.error('Error al cargar firmante finalizador:', error);
      }
    }
  } catch (error) {
    console.error('Error al cargar datos de firmantes:', error);
  } finally {
    loadingFirmantes.value = false;
  }
};

const handleConfirm = async () => {
  loading.value = true;
  try {
    emit('confirmFinalize');
  } finally {
    loading.value = false;
  }
};

// Cargar datos al montar el componente
onMounted(() => {
  loadFirmanteData();
});
</script>

<template>
  <div 
    class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm" 
    @click.self="$emit('closeModal')"
    role="dialog"
    aria-modal="true"
    aria-labelledby="modal-title"
  >
    <div class="modal-finalizar-documento bg-white rounded-2xl shadow-xl max-w-2xl w-full overflow-hidden transform transition-all">
      <div class="p-6">
        <!-- Header -->
        <div class="flex items-center gap-4 mb-6">
          <div class="modal-finalizar-doc-emerald-icon w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0">
            <i class="fas fa-file-signature text-emerald-600 text-xl" aria-hidden="true"></i>
          </div>
          <div>
            <h3 id="modal-title" class="text-xl font-bold text-gray-900">Finalizar Documento</h3>
            <p class="text-sm text-gray-500">Cierre oficial del registro médico</p>
          </div>
        </div>

        <!-- Content -->
        <div class="space-y-4 mb-8">
          <!-- Información del Documento -->
          <div class="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <div class="flex items-center gap-2 mb-3">
              <div class="modal-finalizar-doc-emerald-icon w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <i class="fas fa-file-alt text-emerald-600 text-sm"></i>
              </div>
              <h4 class="text-sm font-bold text-gray-800">Información del Documento</h4>
            </div>
            
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
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

              <!-- Fecha de Última Actualización -->
              <div v-if="fechaActualizacion" class="flex items-center justify-between sm:flex-col sm:items-start sm:gap-1 py-1.5 border-b sm:border-b-0 sm:border-r border-gray-100 sm:border-gray-200 sm:pr-4 last:border-0 last:sm:border-r-0 sm:mx-2">
                <div class="flex items-center gap-2 text-gray-600">
                  <i class="fas fa-edit text-amber-400 text-xs w-4"></i>
                  <span class="text-xs font-medium">Última actualización:</span>
                </div>
                <span class="text-xs font-semibold text-gray-900">{{ fechaActualizacion }}</span>
              </div>

              <!-- Fecha de Finalización -->
              <div class="flex items-center justify-between sm:flex-col sm:items-start sm:gap-1 py-1.5 bg-emerald-50 -mx-2 sm:-mx-0 px-2 sm:py-2 rounded-md border-l-2  border-emerald-500 sm:pt-2">
                <div class="flex items-center gap-2 text-emerald-700">
                  <i class="fas fa-calendar-check text-emerald-500 text-xs w-4"></i>
                  <span class="text-xs font-semibold">Finalización:</span>
                </div>
                <span class="text-xs font-bold text-emerald-900">{{ fechaCierre }}</span>
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

          <div v-else-if="elaboradorData || finalizadorData" class="bg-white rounded-xl border border-gray-200 p-4">
            <h4 class="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
              <i class="fas fa-user-md text-emerald-600"></i>
              Información de Firmantes
            </h4>
            
            <div class="grid grid-cols-2 gap-4">
              <!-- Columna Elaborador -->
              <div class="space-y-3">
                <div class="bg-blue-50 rounded-lg p-3 border border-blue-200">
                  <h5 class="text-xs font-bold text-blue-900 uppercase mb-2">{{ etiquetaElaborador }}</h5>
                  
                  <div v-if="elaboradorData" class="space-y-2 text-xs">
                    
                    <div>
                      <div class="text-gray-900 font-semibold mt-1 text-sm">{{ elaboradorData.tituloProfesional }} {{ elaboradorData.nombre }}</div>
                    </div>
                    
                    <div v-if="elaboradorData.cedulaProfesional">
                      <div class="text-gray-900 mt-1">{{ elaboradorData.cedulaProfesional }}</div>
                    </div>
                    
                    <div v-if="elaboradorData.cedulaEspecialista" class="bg-blue-100 rounded p-2 -mx-1">
                      <div class="text-gray-900 mt-1">{{ elaboradorData.cedulaEspecialista }}</div>
                    </div>
                    
                    <div v-if="elaboradorData.credencialAdicional">
                      <div class="text-gray-900 mt-1 break-words">{{ elaboradorData.credencialAdicional }}</div>
                    </div>
                  </div>
                  
                  <div v-else class="text-xs text-gray-500 italic">
                    No se encontró información
                  </div>
                </div>
              </div>

              <!-- Columna Finalizador -->
              <div class="space-y-3">
                <div class="bg-emerald-50 rounded-lg p-3 border border-emerald-200">
                  <h5 class="text-xs font-bold text-emerald-900 uppercase mb-2">Revisor/Finalizador</h5>
                  
                  <div v-if="finalizadorData" class="space-y-2 text-xs">
                    
                    <div>
                      <div class="text-gray-900 font-semibold mt-1 text-sm"> {{ finalizadorData.tituloProfesional }} {{ finalizadorData.nombre }}</div>
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
            </div>
          </div>

          <!-- Advertencia si falta información del finalizador -->
          <div v-if="!loadingFirmantes && !finalizadorData" class="bg-red-50 border-l-4 border-red-400 p-4">
            <div class="flex">
              <div class="flex-shrink-0">
                <i class="fas fa-exclamation-circle text-red-400"></i>
              </div>
              <div class="ml-3">
                <p class="text-sm text-red-700 font-medium">
                  <span class="font-bold">Advertencia:</span> No se encontró información de firmante para su usuario.
                  Es necesario configurar sus datos profesionales antes de finalizar documentos.
                </p>
              </div>
            </div>
          </div>

          <div class="bg-amber-50 border-l-4 border-amber-400 p-4">
            <div class="flex">
              <div class="flex-shrink-0">
                <i class="fas fa-exclamation-triangle text-amber-400"></i>
              </div>
              <div class="ml-3">
                <p class="text-sm text-amber-700 font-medium">
                  Atención: Esta acción es <span class="font-bold uppercase underline">irreversible</span>. 
                  Una vez finalizado, el documento quedará sellado y no podrá volver al estado de borrador.
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
            class="flex-1 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl transition-all duration-200 shadow-md shadow-emerald-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            @click="handleConfirm"
            :disabled="loading || loadingFirmantes || !finalizadorData"
            :title="!finalizadorData && !loadingFirmantes ? 'Configure sus datos profesionales antes de finalizar' : ''"
          >
            <i v-if="loading" class="fas fa-spinner fa-spin"></i>
            <span>{{ loading ? 'Finalizando...' : 'Confirmar Finalización' }}</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

