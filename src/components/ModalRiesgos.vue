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
import {
  companerosDelPuesto,
  mismosAgentes,
  sugerirAgentesPorPuesto,
  textoSugerenciaAgentes,
} from '@/helpers/sugerenciaAgentesPorPuesto';

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

// Sugerencia de los compañeros del mismo puesto (la lista cargada del centro; si la lista
// es de otro centro, p. ej. al abrir desde un expediente sin pasar por la tabla, no hay sugerencia)
const ORDEN_AGENTES = gruposAgentes.flatMap((grupo) => grupo.agentes.map((agente) => agente.valor));
/** La lista cargada, solo si es la del centro de este trabajador. */
const listaDelCentro = computed(() => {
  const trabajador = trabajadores.currentTrabajador;
  const lista = Array.isArray(trabajadores.trabajadores) ? trabajadores.trabajadores : [];
  return trabajador?._id && lista.some((t) => String(t?._id) === String(trabajador._id)) ? lista : null;
});
const sugerencia = computed(() => {
  const trabajador = trabajadores.currentTrabajador;
  const lista = listaDelCentro.value;
  if (!lista) return null;
  const propuesta = sugerirAgentesPorPuesto(trabajador, lista, ORDEN_AGENTES);
  if (!propuesta || mismosAgentes(propuesta.agentes, agentesSeleccionados.value)) return null;
  return { ...propuesta, texto: textoSugerenciaAgentes(propuesta, String(trabajador.puesto).trim()) };
});

const usarSugerencia = () => {
  if (sugerencia.value) agentesSeleccionados.value = [...sugerencia.value.agentes];
};

// Aplicar los mismos agentes a los compañeros activos del puesto (cambio de varios a la vez:
// se confirma antes y solo se tocan los que no los tienen ya)
const aplicarAlPuesto = ref(false);
const confirmandoAplicacion = ref(false);
const puestoTrabajador = computed(() => String(trabajadores.currentTrabajador?.puesto ?? '').trim());
const companeros = computed(() =>
  listaDelCentro.value
    ? companerosDelPuesto(trabajadores.currentTrabajador, listaDelCentro.value, agentesSeleccionados.value)
    : { todos: [], porCambiar: [] },
);
const plural = (n, uno, varios) => (n === 1 ? uno : varios);
watch(aplicarAlPuesto, () => {
  confirmandoAplicacion.value = false;
});
watch(agentesSeleccionados, () => {
  confirmandoAplicacion.value = false;
});

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
  aplicarAlPuesto: aplicarAlPuesto.value,
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
  const aplicarAOtros = aplicarAlPuesto.value && companeros.value.porCambiar.length > 0;
  // Cambiar a varios trabajadores se confirma antes
  if (aplicarAOtros && !confirmandoAplicacion.value) {
    confirmandoAplicacion.value = true;
    return;
  }
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
    // Una copia: la lista se actualiza al terminar
    const pendientes = aplicarAOtros ? [...companeros.value.porCambiar] : [];
    let fallidos = [];
    if (aplicarAOtros) {
      // El trabajador y sus compañeros en una sola petición
      const { noEncontrados } = await trabajadores.aplicarAgentesRiesgo(
        empresaId,
        centroId,
        [trabajadorId, ...pendientes.map((companero) => companero._id)],
        agentes,
      );
      const sinActualizar = new Set(noEncontrados.map(String));
      if (sinActualizar.has(String(trabajadorId))) {
        throw new Error('El trabajador no pertenece a este centro de trabajo');
      }
      fallidos = pendientes.filter((companero) => sinActualizar.has(String(companero._id)));
    } else {
      // Sin «Cargando…» en la tabla de trabajadores: el botón ya indica que se guarda
      await trabajadores.updateTrabajador(
        empresaId,
        centroId,
        trabajadorId,
        { agentesRiesgoActuales: agentes },
        { enSegundoPlano: true },
      );
    }
    // Que el trabajador en pantalla refleje lo guardado al volver a abrir el modal
    if (trabajadores.currentTrabajador?._id === trabajadorId) {
      trabajadores.currentTrabajador.agentesRiesgoActuales = agentes;
    }

    if (aplicarAOtros) {
      const actualizados = 1 + pendientes.length - fallidos.length;
      if (fallidos.length) {
        const nombres = fallidos.slice(0, 3).map((f) => formatNombreCompleto(f)).join(', ');
        const resto = fallidos.length > 3 ? ` y ${fallidos.length - 3} más` : '';
        toast.open({
          message: `Agentes actualizados en ${actualizados} trabajadores. No se pudieron actualizar: ${nombres}${resto}.`,
          type: 'warning',
        });
      } else {
        toast.open({ message: `Agentes de riesgo actualizados en ${actualizados} trabajadores`, type: 'success' });
      }
    } else {
      toast.open({ message: 'Agentes de riesgo actualizados', type: 'success' });
    }
    forceClose();
    // La columna de agentes de la tabla se actualiza sin desmontarla
    trabajadores.fetchTrabajadoresConHistoria(empresaId, centroId, { enSegundoPlano: true });
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
        <!-- Sugerencia: lo que tienen sus compañeros de puesto -->
        <div
          v-if="sugerencia"
          class="modal-riesgos__sugerencia mb-4 flex flex-col gap-2 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2.5 text-sm text-sky-900 sm:flex-row sm:items-center"
        >
          <i class="fa-solid fa-lightbulb hidden text-sky-500 sm:block" aria-hidden="true"></i>
          <p class="min-w-0 flex-1">
            {{ sugerencia.texto }}
            <span class="font-medium">{{ sugerencia.agentes.join(' · ') }}</span>
          </p>
          <button
            type="button"
            class="modal-riesgos__usar-sugerencia shrink-0 rounded-md border border-sky-300 bg-white px-2.5 py-1 text-xs font-semibold text-sky-700 transition-colors duration-150 hover:bg-sky-100"
            @click="usarSugerencia"
          >
            Usar los mismos
          </button>
        </div>

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

        <!-- Aplicar a los compañeros del mismo puesto -->
        <label
          v-if="companeros.todos.length"
          class="modal-riesgos__aplicar-puesto mt-4 flex cursor-pointer items-start gap-2.5 rounded-lg border border-gray-200 px-3 py-2.5"
        >
          <input
            v-model="aplicarAlPuesto"
            type="checkbox"
            class="mt-0.5 h-4 w-4 shrink-0 accent-emerald-600"
            :disabled="isSubmitting"
          />
          <span class="text-sm">
            <span class="font-medium text-gray-800">
              Aplicar también a
              {{ companeros.todos.length === 1 ? 'el otro trabajador' : `los otros ${companeros.todos.length} trabajadores` }}
              con el puesto {{ puestoTrabajador }}
            </span>
            <span class="block text-xs text-gray-500">
              <template v-if="!companeros.porCambiar.length">
                {{ plural(companeros.todos.length, 'Ya tiene', 'Ya tienen') }} estos mismos agentes.
              </template>
              <template v-else-if="companeros.porCambiar.length < companeros.todos.length">
                Se {{ plural(companeros.porCambiar.length, 'actualizará', 'actualizarán') }} {{ companeros.porCambiar.length }};
                {{ companeros.todos.length - companeros.porCambiar.length }}
                {{ plural(companeros.todos.length - companeros.porCambiar.length, 'ya los tiene', 'ya los tienen') }}.
              </template>
              <template v-else>
                Sus agentes actuales se reemplazarán por los que marques aquí.
              </template>
            </span>
          </span>
        </label>
      </div>

      <!-- Confirmación antes de cambiar a varios trabajadores -->
      <div
        v-if="confirmandoAplicacion && !isSubmitting"
        class="modal-riesgos__confirmar-puesto border-t border-amber-200 bg-amber-50 px-5 py-3 text-sm text-amber-900"
        role="alert"
      >
        <p>
          Se reemplazarán los agentes de
          <span class="font-semibold">
            {{ companeros.porCambiar.length }} {{ plural(companeros.porCambiar.length, 'trabajador', 'trabajadores') }} más
          </span>
          con el puesto {{ puestoTrabajador }} por:
          <span class="font-semibold">{{ agentesSeleccionados.length ? agentesSeleccionados.join(' · ') : 'ningún agente' }}</span>.
        </p>
        <div class="mt-2 flex justify-end gap-2">
          <button
            type="button"
            class="rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-sm font-medium text-amber-900 hover:bg-amber-100"
            @click="confirmandoAplicacion = false"
          >
            Volver
          </button>
          <button
            type="button"
            class="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-emerald-700"
            @click="handleSubmit"
          >
            Sí, guardar para {{ companeros.porCambiar.length + 1 }} trabajadores
          </button>
        </div>
      </div>

      <!-- Acciones -->
      <div v-else class="flex flex-wrap items-center gap-2 border-t border-gray-200 px-5 py-3">
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
          <span v-else-if="aplicarAlPuesto && companeros.porCambiar.length">
            Guardar para {{ companeros.porCambiar.length + 1 }} trabajadores
          </span>
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
