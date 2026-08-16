<script setup>
import { ref, inject, watch } from 'vue';
import { useEmpresasStore } from '@/stores/empresas';
import { useCentrosTrabajoStore } from '@/stores/centrosTrabajo';
import { useTrabajadoresStore } from '@/stores/trabajadores';
import { calcularAntiguedad } from '@/helpers/dates';
import { formatNombreCompleto } from '@/helpers/formatNombreCompleto';
import { useDirtySnapshot } from '@/composables/useDirtySnapshot';
import { useModalDirtyGuard } from '@/composables/useModalDirtyGuard';
import ModalDiscardConfirmDialog from '@/components/ModalDiscardConfirmDialog.vue';

const toast = inject('toast');
const emit = defineEmits(['closeModal']);

const empresas = useEmpresasStore();
const centrosTrabajo = useCentrosTrabajoStore();
const trabajadores = useTrabajadoresStore();

const agentesSeleccionados = ref(
  trabajadores.currentTrabajador?.agentesRiesgoActuales || []
);

const opcionesAgentes = [
  "Ergonómicos", "Ruido", "Polvos", "Químicos",
  "Temperaturas elevadas", "Psicosociales", "Temperaturas abatidas",
  "Vibraciones", "Biológicos Infecciosos"
];

const buildFormState = () => ({
  agentes: [...agentesSeleccionados.value].sort(),
});

const { isDirty, resetSnapshot } = useDirtySnapshot(buildFormState, {
  markCleanOnMount: true,
});

watch(
  () => trabajadores.currentTrabajador?._id,
  () => {
    agentesSeleccionados.value = [
      ...(trabajadores.currentTrabajador?.agentesRiesgoActuales ?? []),
    ];
    resetSnapshot();
  },
);

watch(
  () => trabajadores.currentTrabajador?.agentesRiesgoActuales,
  (agentes) => {
    if (trabajadores.loadingModal) return;
    agentesSeleccionados.value = [...(agentes ?? [])];
    resetSnapshot();
  },
  { deep: true },
);

const closeModal = () => {
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
});

const isSubmitting = ref(false);

const handleSubmit = async () => {
  if (isSubmitting.value) return;
  isSubmitting.value = true;

  try {
    const trabajadorId = trabajadores.currentTrabajador?._id;
    const empresaId = empresas.currentEmpresaId;
    const centroId = centrosTrabajo.currentCentroTrabajoId;

    if (!trabajadorId || !empresaId || !centroId) return;

    await trabajadores.updateTrabajador(empresaId, centroId, trabajadorId, {
      agentesRiesgoActuales: agentesSeleccionados.value
    });

    toast.open({ message: 'Agentes de riesgo actualizados', type: 'success' });
    forceClose();
  } catch (error) {
    console.error(error);
    toast.open({ message: 'Error al actualizar los agentes de riesgo.', type: 'error' });
  } finally {
    isSubmitting.value = false;
  }
};
</script>

<template>
  <div class="modal fixed top-0 left-0 z-50 p-4 sm:p-8 h-screen w-full flex items-center justify-center">
    <!-- Fondo -->
    <div
      class="modal-work-overlay absolute top-0 left-0 w-full h-full bg-emerald-900 bg-opacity-50 backdrop-blur-sm"
      :class="{ 'modal-backdrop-pulse': dismissPulse }"
      @click="requestDismiss"
    ></div>

    <div
      class="modal-work-panel modal-inner relative bg-white w-full sm:w-4/5 md:w-3/5 xl:w-2/5 2xl:w-1/3 p-10 rounded-lg shadow-md shadow-slate-900 max-h-[90vh] overflow-y-auto text-gray-800"
      :class="{ 'modal-dismiss-pulse': dismissPulse }"
    >
        <!-- Botón cerrar -->
        <div class="absolute h-16 w-16 flex justify-center items-center top-0 right-0 text-5xl text-gray-400 hover:text-gray-500 cursor-pointer" @click="requestDismiss">
          &times;
        </div>

        <h1 class="text-2xl font-semibold mb-2">Exposición a agentes de riesgo</h1>
        <hr class="mb-4">
        <!-- Información del trabajador -->
        <div class="mb-3 p-4 bg-gray-50 rounded-lg">
          <div class="grid grid-cols-2 gap-4">
            <div>
              <p class="text-sm font-medium text-gray-600">Nombre del trabajador</p>
              <p class="text-lg font-semibold text-gray-800">{{ formatNombreCompleto(trabajadores.currentTrabajador) }}</p>
            </div>
            <div>
              <p class="text-sm font-medium text-gray-600">Puesto</p>
              <p class="text-lg font-semibold text-gray-800">{{ trabajadores.currentTrabajador?.puesto }}</p>
            </div>
            <div>
              <p class="text-sm font-medium text-gray-600">Empresa</p>
              <p class="text-lg font-semibold text-gray-800">{{ empresas.currentEmpresa?.nombreComercial }}</p>
            </div>
            <div>
              <p class="text-sm font-medium text-gray-600">Antigüedad</p>
              <p class="text-lg font-semibold text-gray-800">{{ calcularAntiguedad(trabajadores.currentTrabajador?.fechaIngreso) }}</p>
            </div>
          </div>
        </div>

        <!-- Lista de agentes de riesgo -->
        <div class="mb-6">
          <p class="text-sm font-medium text-gray-600 mb-2">Seleccione los agentes a los que se expone el trabajador:</p>
          <div class="grid grid-cols-2 gap-0">
            <label v-for="agente in opcionesAgentes" 
             :key="agente" 
             class="flex items-center gap-2 p-2 hover:bg-gray-50 rounded-md cursor-pointer transition-colors">
              <input type="checkbox" 
               :value="agente" 
               v-model="agentesSeleccionados" 
               class="form-checkbox h-4 w-4 accent-emerald-600">
              <span class="text-sm text-gray-700">{{ agente }}</span>
            </label>
          </div>
        </div>

        <button
          @click="handleSubmit"
          :disabled="isSubmitting"
          class="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span v-if="isSubmitting">Guardando...</span>
          <span v-else>Guardar cambios</span>
        </button>

        <button @click="requestDismiss"
          class="mt-3 w-full py-2 bg-white border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-100">
          Cancelar
        </button>
      </div>

    <ModalDiscardConfirmDialog
      :open="showDiscardConfirm"
      @continue-editing="continueEditing"
      @discard="confirmDiscard"
    />
  </div>
</template>
