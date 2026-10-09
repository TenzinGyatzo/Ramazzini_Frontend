<script setup>
import { ref, inject, watch, computed } from 'vue';
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

// El valor es el que se guarda en el trabajador; no cambiarlo sin migrar los datos
const gruposAgentes = [
  {
    nombre: 'Físicos',
    agentes: [
      { valor: 'Ruido', icono: 'fa-solid fa-volume-high' },
      { valor: 'Vibraciones', icono: 'fa-solid fa-wave-square' },
      { valor: 'Temperaturas elevadas', icono: 'fa-solid fa-temperature-high' },
      { valor: 'Temperaturas abatidas', icono: 'fa-solid fa-temperature-low' },
    ],
  },
  {
    nombre: 'Químicos y biológicos',
    agentes: [
      { valor: 'Polvos', icono: 'fa-solid fa-wind' },
      { valor: 'Químicos', icono: 'fa-solid fa-flask' },
      { valor: 'Biológicos Infecciosos', icono: 'fa-solid fa-biohazard' },
    ],
  },
  {
    nombre: 'Ergonómicos y psicosociales',
    agentes: [
      { valor: 'Ergonómicos', icono: 'fa-solid fa-person' },
      { valor: 'Psicosociales', icono: 'fa-solid fa-brain' },
    ],
  },
];

const estaSeleccionado = (agente) => agentesSeleccionados.value.includes(agente);

const alternarAgente = (agente) => {
  agentesSeleccionados.value = estaSeleccionado(agente)
    ? agentesSeleccionados.value.filter((a) => a !== agente)
    : [...agentesSeleccionados.value, agente];
};

const quitarTodos = () => {
  agentesSeleccionados.value = [];
};

// Puesto, empresa y antigüedad en una línea, omitiendo lo que no esté capturado
const datosTrabajador = computed(() => {
  const t = trabajadores.currentTrabajador;
  const antiguedad = calcularAntiguedad(t?.fechaIngreso);
  return [
    t?.puesto,
    empresas.currentEmpresa?.nombreComercial,
    antiguedad && antiguedad !== '-' ? `${antiguedad} de antigüedad` : null,
  ].filter(Boolean);
});

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
    // Desde el expediente puede no haber centro seleccionado: se toma el del trabajador
    const centroId =
      centrosTrabajo.currentCentroTrabajoId ?? trabajadores.currentTrabajador?.idCentroTrabajo;

    if (!trabajadorId || !empresaId || !centroId) {
      toast.open({ message: 'No se pudo identificar al trabajador o su centro de trabajo.', type: 'error' });
      return;
    }

    const agentes = [...agentesSeleccionados.value];
    await trabajadores.updateTrabajador(empresaId, centroId, trabajadorId, {
      agentesRiesgoActuales: agentes
    });
    // Que el trabajador en pantalla refleje lo guardado al volver a abrir el modal
    if (trabajadores.currentTrabajador?._id === trabajadorId) {
      trabajadores.currentTrabajador.agentesRiesgoActuales = agentes;
    }

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
  <div class="modal modal-riesgos fixed top-0 left-0 z-50 p-4 sm:p-8 h-screen w-full flex items-center justify-center">
    <!-- Fondo -->
    <div
      class="modal-work-overlay absolute top-0 left-0 w-full h-full bg-emerald-900 bg-opacity-50 backdrop-blur-sm"
      :class="{ 'modal-backdrop-pulse': dismissPulse }"
      @click="requestDismiss"
    ></div>

    <div
      class="modal-work-panel modal-inner relative flex max-h-[90vh] w-full flex-col overflow-hidden rounded-xl bg-white text-gray-800 shadow-md shadow-slate-900 max-w-xl"
      :class="{ 'modal-dismiss-pulse': dismissPulse }"
    >
      <!-- Encabezado: título y trabajador -->
      <div class="flex items-start gap-3 border-b border-gray-200 px-5 py-4">
        <div class="min-w-0 flex-1">
          <h1 class="modal-riesgos__titulo text-lg font-semibold text-gray-900">Exposición a agentes de riesgo</h1>
          <p class="mt-0.5 truncate text-sm font-medium text-gray-700">
            {{ formatNombreCompleto(trabajadores.currentTrabajador) }}
          </p>
          <p v-if="datosTrabajador.length" class="text-sm text-gray-500">
            {{ datosTrabajador.join(' · ') }}
          </p>
        </div>
        <button
          type="button"
          class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-gray-400 transition-colors duration-150 hover:bg-gray-100 hover:text-gray-600"
          title="Cerrar"
          aria-label="Cerrar"
          @click="requestDismiss"
        >
          <i class="fa-solid fa-xmark text-base"></i>
        </button>
      </div>

      <!-- Agentes agrupados -->
      <div class="min-h-0 flex-1 overflow-y-auto px-5 py-4">
        <div class="mb-3 flex items-center justify-between gap-3">
          <p class="text-sm text-gray-600">Marca los agentes a los que se expone el trabajador</p>
          <span
            class="shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium"
            :class="agentesSeleccionados.length ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-600'"
          >
            {{ agentesSeleccionados.length }}
            {{ agentesSeleccionados.length === 1 ? 'seleccionado' : 'seleccionados' }}
          </span>
        </div>

        <div v-for="grupo in gruposAgentes" :key="grupo.nombre" class="mb-4 last:mb-0">
          <p class="mb-1.5 text-xs font-medium uppercase tracking-wide text-gray-500">{{ grupo.nombre }}</p>
          <div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <button
              v-for="agente in grupo.agentes"
              :key="agente.valor"
              type="button"
              role="checkbox"
              :aria-checked="estaSeleccionado(agente.valor)"
              class="modal-riesgos__agente flex items-center gap-2.5 rounded-lg border-2 px-3 py-2 text-left text-sm font-medium transition-colors duration-150"
              :class="estaSeleccionado(agente.valor)
                ? 'modal-riesgos__agente--activo border-amber-400 bg-amber-50 text-amber-800'
                : 'border-gray-200 bg-white text-gray-700 hover:border-amber-300'"
              @click="alternarAgente(agente.valor)"
            >
              <i
                :class="[agente.icono, estaSeleccionado(agente.valor) ? 'text-amber-600' : 'text-gray-400']"
                class="w-5 text-center"
                aria-hidden="true"
              ></i>
              <span class="flex-1">{{ agente.valor }}</span>
              <i v-if="estaSeleccionado(agente.valor)" class="fa-solid fa-check text-xs text-amber-600" aria-hidden="true"></i>
            </button>
          </div>
        </div>
      </div>

      <!-- Acciones -->
      <div class="flex flex-wrap items-center gap-2 border-t border-gray-200 px-5 py-3">
        <button
          v-if="agentesSeleccionados.length"
          type="button"
          class="rounded-lg px-3 py-2 text-sm font-medium text-gray-500 transition-colors duration-150 hover:bg-gray-100 hover:text-gray-700"
          @click="quitarTodos"
        >
          Quitar todos
        </button>
        <span class="flex-1"></span>
        <button
          type="button"
          class="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors duration-150 hover:bg-gray-100"
          @click="requestDismiss"
        >
          Cancelar
        </button>
        <button
          type="button"
          :disabled="isSubmitting"
          class="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition-colors duration-150 hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
          @click="handleSubmit"
        >
          <span v-if="isSubmitting">Guardando...</span>
          <span v-else>Guardar cambios</span>
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
