<script setup>
import { ref, watch, inject, computed } from 'vue';
import { format } from 'date-fns';
import { convertirYYYYMMDDaISO, convertirFechaISOaYYYYMMDD, convertirFechaISOaDDMMYYYY } from '@/helpers/dates';
import { useTrabajadoresStore } from '@/stores/trabajadores';
import { useDocumentosStore } from '@/stores/documentos';
import { useResultadosClinicosStore } from '@/stores/resultadosClinicos';
import { useProveedorSaludStore } from '@/stores/proveedorSalud';
import { validarFechaDocumentoNoFutura } from '@/helpers/validacionCampos';

const toast = inject('toast');

const trabajadores = useTrabajadoresStore();
const documentos = useDocumentosStore();
const resultadosClinicosStore = useResultadosClinicosStore();
const proveedorSaludStore = useProveedorSaludStore();

// Emit para cerrar modal y actualizar datos
const emit = defineEmits(['closeModalUpdate', 'updateData', 'abrirResultados']);

// Referencias para campos editables
const idDocumento = ref('');
const nombreDocumento = ref('');
const fechaDocumento = ref('');
const notasDocumento = ref('');
const idTrabajador = ref('');
const estadoDocumento = ref('');

// Computed para verificar si el documento está finalizado
const isFinalizado = computed(() => {
  return estadoDocumento.value?.toLowerCase() === 'finalizado';
});

// Computed para verificar si el documento está anulado
const isAnulado = computed(() => {
  return estadoDocumento.value?.toLowerCase() === 'anulado';
});

// Computed para verificar si el documento está bloqueado (finalizado o anulado)
const isBloqueado = computed(() => {
  return isFinalizado.value || isAnulado.value;
});

const resultadoVinculado = ref(null);
const showSelectorResultados = ref(false);
const resultadoSeleccionado = ref('');
const pendingDesvincularDocumentoModal = ref(false);

const documentoTieneVinculo = computed(() => {
  return Boolean(
    documentos.currentDocument &&
      (documentos.currentDocument.idResultadoClinico || documentos.currentDocument.resultadoClinico)
  );
});

// Helper para obtener label del tipo de estudio
const getTipoEstudioLabel = (tipo) => {
  const labels = {
    'ESPIROMETRIA': 'Espirometría',
    'EKG': 'EKG',
    'TIPO_SANGRE': 'Tipo de Sangre',
  };
  return labels[tipo] || tipo;
};

// Helper para formatear fecha
const formatDate = (fecha) => {
  return convertirFechaISOaDDMMYYYY(fecha);
};

const getTipoIcon = (tipo) => {
  if (tipo === 'ESPIROMETRIA') return 'fas fa-lungs';
  if (tipo === 'EKG') return 'fas fa-heartbeat';
  if (tipo === 'TIPO_SANGRE') return 'fas fa-tint';
  return 'fas fa-notes-medical';
};

const getIconColor = (tipo) => {
  if (tipo === 'ESPIROMETRIA') return '#1d4ed8';
  if (tipo === 'EKG') return '#dc2626';
  if (tipo === 'TIPO_SANGRE') return '#991b1b';
  return '#475569';
};

const getTipoSangreLabel = (tipo) => {
  const option = resultadosClinicosStore.tipoSangreOptions.find(opt => opt.value === tipo);
  return option?.label || tipo || '';
};

const getResultadoDisplay = (resultado) => {
  if (!resultado) return '';
  if (resultado.tipoEstudio === 'TIPO_SANGRE') {
    return getTipoSangreLabel(resultado.tipoSangre);
  }
  return resultadosClinicosStore.getResultadoLabel(resultado.resultadoGlobal);
};

const getResultadoTextClass = (resultado) => {
  if (!resultado) return '';
  if (resultado.tipoEstudio === 'TIPO_SANGRE') {
    return 'text-red-600 font-semibold';
  }
  return resultadosClinicosStore.getResultadoColor(resultado.resultadoGlobal);
};

// Obtener resultados clínicos disponibles para vincular (sin documento vinculado)
const resultadosDisponibles = computed(() => {
  return resultadosClinicosStore.items.filter(resultado => !resultado.idDocumentoExterno);
});

// Inicialización de datos con valores precargados
watch(
  () => documentos.currentDocument,
  async (newData) => {
    if (newData && Object.keys(newData).length > 0) {
      idDocumento.value = newData._id || '';
      nombreDocumento.value = newData.nombreDocumento || '';
      fechaDocumento.value = convertirFechaISOaYYYYMMDD(newData.fechaDocumento) || '';
      notasDocumento.value = newData.notasDocumento || '';
      idTrabajador.value = newData.idTrabajador || '';
      estadoDocumento.value = newData.estado || '';

      if (newData.resultadoClinico) {
        resultadoVinculado.value = newData.resultadoClinico;
      } else if (newData.idResultadoClinico) {
        const rawId =
          typeof newData.idResultadoClinico === 'string'
            ? newData.idResultadoClinico
            : newData.idResultadoClinico?._id;

        if (rawId) {
          try {
            const resultado = await resultadosClinicosStore.fetchResultadoById(rawId);
            resultadoVinculado.value = resultado;
          } catch (error) {
            resultadoVinculado.value = null;
          }
        } else {
          resultadoVinculado.value = null;
        }
      } else {
        resultadoVinculado.value = null;
      }
    }
  },
  { immediate: true }
);

// Función para manejar el envío del formulario
const handleSubmit = async () => {
  // Prevenir edición si el documento está bloqueado (finalizado o anulado)
  if (isBloqueado.value) {
    return;
  }

  const validacionFecha = validarFechaDocumentoNoFutura(
    fechaDocumento.value,
    proveedorSaludStore.showSiresUI,
  );
  if (!validacionFecha.valido) {
    toast.open({ message: validacionFecha.mensaje, type: 'error' });
    return;
  }

  const fechaISO = convertirYYYYMMDDaISO(fechaDocumento.value);

  const updatedData = {
    _id: idDocumento.value,
    nombreDocumento: nombreDocumento.value,
    fechaDocumento: fechaISO,
    notasDocumento: notasDocumento.value,
    idTrabajador: idTrabajador.value
  };

  await documentos.updateDocument(
    'documentoExterno',
    trabajadores.currentTrabajadorId,
    updatedData._id,
    updatedData
  );

  if (pendingDesvincularDocumentoModal.value && resultadoVinculado.value?._id) {
    await resultadosClinicosStore.desvincularDocumento(resultadoVinculado.value._id);
    resultadoVinculado.value = null;
  }
  pendingDesvincularDocumentoModal.value = false;
  toast.open({
    message: 'Documento Externo actualizado correctamente',
    type: 'success',
  });

  emit('updateData');
  closeModal(); 
};

// Función para iniciar el proceso de vinculación
const iniciarVinculacion = async () => {
  // Cargar resultados clínicos del trabajador si no están cargados
  if (resultadosClinicosStore.items.length === 0 && idTrabajador.value) {
    await resultadosClinicosStore.fetchByTrabajador(idTrabajador.value);
  }
  showSelectorResultados.value = true;
};

// Función para vincular el documento a un resultado clínico
const handleVincular = async () => {
  if (!resultadoSeleccionado.value) {
    toast.open({
      message: 'Por favor selecciona un resultado clínico',
      type: 'error'
    });
    return;
  }

  try {
    await resultadosClinicosStore.vincularDocumento(resultadoSeleccionado.value, idDocumento.value);
    
    toast.open({
      message: 'Documento vinculado exitosamente',
      type: 'success'
    });

    // Actualizar notasDocumento localmente para reflejo inmediato
    if (documentos.currentDocument && documentos.currentDocument._id === idDocumento.value) {
      const resultadoEncontrado = resultadosClinicosStore.items.find(r => r._id === resultadoSeleccionado.value);
      if (resultadoEncontrado) {
        resultadoVinculado.value = resultadoEncontrado;
        
        // Aplicar la misma lógica de mapeo que en el backend para las notas
        if (resultadoEncontrado.tipoEstudio === 'TIPO_SANGRE') {
          const mapeoTipoSangre = {
            'A_POS': 'A+', 'A_NEG': 'A-', 'B_POS': 'B+', 'B_NEG': 'B-',
            'AB_POS': 'AB+', 'AB_NEG': 'AB-', 'O_POS': 'O+', 'O_NEG': 'O-'
          };
          notasDocumento.value = mapeoTipoSangre[resultadoEncontrado.tipoSangre] || resultadoEncontrado.tipoSangre;
        } else if (['EKG', 'ESPIROMETRIA'].includes(resultadoEncontrado.tipoEstudio)) {
          notasDocumento.value = resultadoEncontrado.resultadoGlobal;
        }
      }
    }
    
    showSelectorResultados.value = false;
    resultadoSeleccionado.value = '';
    pendingDesvincularDocumentoModal.value = false;
    emit('updateData');
  } catch (error) {
    console.error('Error al vincular documento:', error);
    toast.open({
      message: 'Error al vincular el documento',
      type: 'error'
    });
  }
};

// Función para cancelar la vinculación
const cancelarVinculacion = () => {
  showSelectorResultados.value = false;
  resultadoSeleccionado.value = '';
};

// Función para desvincular el resultado clínico
const handleDesvincular = () => {
  if (!resultadoVinculado.value) return;
  pendingDesvincularDocumentoModal.value = true;
};

const cancelarDesvinculacion = () => {
  pendingDesvincularDocumentoModal.value = false;
};

const abrirResultadoParaEdicion = () => {
  if (!resultadoVinculado.value) return;
  resultadosClinicosStore.setCurrent(resultadoVinculado.value);
  emit('abrirResultados');
  closeModal();
};

// Limpiar la vista previa cuando se cierre el modal
const closeModal = () => {
  pendingDesvincularDocumentoModal.value = false;
  emit('closeModalUpdate');
};
</script>

<template>
  <div class="modal fixed top-0 left-0 z-10 p-8 h-screen w-full grid place-items-center">
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

        <div class="flex items-center justify-between mb-3">
          <h1 class="text-3xl">{{ isBloqueado ? 'Datos del Documento' : 'Editar Documento' }}</h1>
          <span v-if="isFinalizado" class="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <i class="fas fa-check-circle mr-2"></i>
            Finalizado
          </span>
          <span v-if="isAnulado" class="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-rose-100 text-rose-800 border border-rose-200">
            <i class="fas fa-times-circle mr-2"></i>
            Anulado
          </span>
        </div>
        <hr class="mt-2 mb-3">

        <!-- Indicador de vinculación con resultado clínico -->
        <div v-if="resultadoVinculado" class="mb-4 relative">
          <!-- Badge de desvinculación pendiente -->
          <Transition name="fade">
            <div v-if="pendingDesvincularDocumentoModal" class="absolute -top-2 -right-2 z-10">
              <div class="bg-amber-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg flex items-center gap-1 animate-pulse">
                <i class="fas fa-exclamation-triangle"></i>
                Pendiente
              </div>
            </div>
          </Transition>
          
          <!-- Card de resultado vinculado con transición de estado -->
          <div 
            :class="[
              'p-4 rounded-lg transition-all duration-300',
              pendingDesvincularDocumentoModal 
                ? 'bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-300 shadow-lg' 
                : 'bg-emerald-50 border border-emerald-200 shadow-sm'
            ]"
          >
            <div class="flex items-start justify-between gap-3">
              <div 
                class="flex-1"
                :class="!pendingDesvincularDocumentoModal ? 'cursor-pointer hover:opacity-80' : ''"
                @click="!pendingDesvincularDocumentoModal && abrirResultadoParaEdicion()"
              >
                <div class="flex items-center gap-2 mb-1" :class="pendingDesvincularDocumentoModal ? 'text-amber-700' : 'text-emerald-700'">
                  <i :class="pendingDesvincularDocumentoModal ? 'fas fa-unlink' : 'fas fa-link'"></i>
                  <span class="text-sm font-semibold">
                    {{ pendingDesvincularDocumentoModal ? 'Vinculación a remover' : 'Vinculado a resultado clínico' }}
                  </span>
                </div>
                <div
                  class="text-sm flex flex-wrap items-center gap-2"
                  :class="pendingDesvincularDocumentoModal ? 'text-amber-600' : 'text-emerald-600'"
                >
                  <span
                    class="text-xl"
                    :style="{ color: getIconColor(resultadoVinculado.tipoEstudio) }"
                  >
                    <i :class="getTipoIcon(resultadoVinculado.tipoEstudio)"></i>
                  </span>
                  <span class="font-semibold">{{ getTipoEstudioLabel(resultadoVinculado.tipoEstudio) }}</span>
                  <span class="text-gray-400">|</span>
                  <span>{{ formatDate(resultadoVinculado.fechaEstudio) }}</span>
                  <span class="text-gray-400">|</span>
                  <span :class="getResultadoTextClass(resultadoVinculado)">
                    {{ getResultadoDisplay(resultadoVinculado) }}
                  </span>
                </div>
                
                <!-- Mensaje de desvinculación pendiente -->
                <Transition name="slide-down">
                  <div v-if="pendingDesvincularDocumentoModal" class="mt-3 pt-3 border-t border-amber-200">
                    <p class="text-xs text-amber-800 leading-relaxed flex items-start gap-2">
                      <i class="fas fa-info-circle mt-0.5 flex-shrink-0"></i>
                      <span>Se desvinculará al guardar los cambios del documento</span>
                    </p>
                  </div>
                </Transition>
              </div>
              
              <button
                @click.stop="pendingDesvincularDocumentoModal ? cancelarDesvinculacion() : handleDesvincular()"
                type="button"
                :class="[
                  'px-3 py-1.5 text-sm font-medium rounded-lg transition-all duration-200 flex-shrink-0 flex items-center gap-1',
                  pendingDesvincularDocumentoModal
                    ? 'text-amber-700 bg-white hover:bg-amber-50 border-2 border-amber-300 hover:border-amber-400 shadow-sm'
                    : 'text-red-600 hover:text-red-700 hover:bg-red-50 border border-red-200 hover:border-red-300'
                ]"
                :title="pendingDesvincularDocumentoModal ? 'Cancelar desvinculación' : 'Desvincular resultado clínico'"
              >
                <i :class="pendingDesvincularDocumentoModal ? 'fas fa-undo' : 'fas fa-unlink'"></i>
                <span class="hidden sm:inline">
                  {{ pendingDesvincularDocumentoModal ? 'Cancelar' : 'Desvincular' }}
                </span>
              </button>
            </div>
          </div>
        </div>

        <!-- Botón para vincular resultado clínico cuando no hay vinculación -->
        <div v-else-if="!showSelectorResultados && !documentoTieneVinculo" class="mb-4">
          <button
            @click="iniciarVinculacion"
            type="button"
            class="w-full px-4 py-3 text-sm font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors border border-emerald-200 hover:border-emerald-300 flex items-center justify-center gap-2"
          >
            <i class="fas fa-link"></i>
            Vincular a resultado clínico
          </button>
        </div>

        <!-- Selector de resultado clínico -->
        <div v-else class="mb-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
          <div class="flex items-center gap-2 text-gray-700 mb-3">
            <i class="fas fa-link"></i>
            <span class="text-sm font-semibold">Seleccionar resultado clínico</span>
          </div>
          
          <div v-if="resultadosDisponibles.length === 0" class="text-sm text-gray-500 mb-3">
            No hay resultados clínicos disponibles para vincular. Todos los resultados ya están vinculados o no hay resultados registrados.
          </div>
          
          <div v-else class="mb-3">
            <select 
              v-model="resultadoSeleccionado"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm"
            >
              <option value="">Seleccione un resultado...</option>
              <option 
                v-for="resultado in resultadosDisponibles" 
                :key="resultado._id" 
                :value="resultado._id"
              >
                {{ getTipoEstudioLabel(resultado.tipoEstudio) }} - {{ formatDate(resultado.fechaEstudio) }}
                {{ resultado.resultadoGlobal ? `(${resultado.resultadoGlobal})` : '' }}
              </option>
            </select>
          </div>

          <div class="flex gap-2">
            <button
              @click="handleVincular"
              type="button"
              :disabled="!resultadoSeleccionado || resultadosDisponibles.length === 0"
              class="flex-1 px-3 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 disabled:cursor-not-allowed rounded-lg transition-colors"
            >
              Vincular
            </button>
            <button
              @click="cancelarVinculacion"
              type="button"
              class="flex-1 px-3 py-2 text-sm font-medium text-gray-700 bg-white hover:bg-gray-100 rounded-lg transition-colors border border-gray-300"
            >
              Cancelar
            </button>
          </div>
        </div>

        <FormKit type="form" :actions="false" @submit="handleSubmit">
          <FormKit 
            type="text" 
            label="Nombre del Documento" 
            name="nombreDocumento" 
            v-model="nombreDocumento" 
            :disabled="isBloqueado"
            :validation="isBloqueado ? '' : 'required'"
            :validation-messages="{ required: 'Este campo es obligatorio' }" />

          <FormKit 
            type="date" 
            label="Fecha de emisión del documento" 
            name="fechaDocumento" 
            v-model="fechaDocumento" 
            :disabled="isBloqueado"
            :validation="isBloqueado ? '' : 'required'"
            :validation-messages="{ required: 'Este campo es obligatorio' }" />

          <FormKit 
            type="text" 
            label="Agregar notas (opcional)" 
            name="notasDocumento" 
            v-model="notasDocumento"
            :disabled="isBloqueado" />

          <hr class="my-3">
          <FormKit v-if="!isBloqueado" type="submit">
            <span>Guardar</span>
          </FormKit>

          <div v-if="isBloqueado" class="text-xs md:text-sm mt-6 mb-4 font-medium flex items-center justify-center gap-2"
               :class="isAnulado ? 'text-rose-600' : 'text-amber-600'">
            <i class="fas fa-lock"></i>
            <span v-if="isAnulado">Documento anulado - Edición bloqueada</span>
            <span v-else>Documento finalizado - Edición bloqueada</span>
          </div>

          <button
            class="text-xl mt-2 w-full rounded-lg bg-white font-semibold text-gray-800 shadow-sm ring-2 ring-inset ring-gray-300 hover:bg-gray-100 p-3 transition-transform duration-300 transform hover:scale-105 hover:shadow-lg flex-1"
            @click="closeModal">
            Cerrar
          </button>
        </FormKit>
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

/* Transición para el badge pendiente */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* Transición para el mensaje de desvinculación */
.slide-down-enter-active,
.slide-down-leave-active {
  transition: all 0.3s ease;
}

.slide-down-enter-from {
  opacity: 0;
  transform: translateY(-10px);
  max-height: 0;
}

.slide-down-enter-to {
  opacity: 1;
  transform: translateY(0);
  max-height: 100px;
}

.slide-down-leave-from {
  opacity: 1;
  transform: translateY(0);
  max-height: 100px;
}

.slide-down-leave-to {
  opacity: 0;
  transform: translateY(-10px);
  max-height: 0;
}
</style>