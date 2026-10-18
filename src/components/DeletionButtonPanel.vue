<script setup lang="ts">
import { ref, watch, computed } from "vue";
import ModalConfirmacionEliminacion from "./ModalConfirmacionEliminacion.vue";
import { resolverNivel } from "@/config/eliminacion";

const props = defineProps<{
  selectedRoutes: string[];
  isDeletionMode: boolean;
  /** Avance del borrado en curso (lo lleva la vista); null si no hay uno. */
  progreso?: { hechos: number; total: number } | null;
}>();

const emit = defineEmits(['deleteSelected']);

const isVisible = ref(false);
const showConfirmModal = ref(false);
const loading = computed(() => !!props.progreso);
const porcentaje = computed(() =>
  props.progreso && props.progreso.total > 0 ? Math.round((props.progreso.hechos / props.progreso.total) * 100) : 0,
);

const nivelEliminacion = computed<'simple' | 'moderado'>(() => {
  const nivel = resolverNivel('documentosMasivos', { cantidad: props.selectedRoutes.length });
  return nivel === 'moderado' ? 'moderado' : 'simple';
});

// Watch para mostrar/ocultar el panel
watch(
  () => [props.selectedRoutes.length, props.isDeletionMode, !!props.progreso] as const,
  ([routesLength, deletionMode, enCurso]) => {
    // Mientras se borra, el panel se queda aunque la selección se vaya vaciando
    if ((routesLength > 0 || enCurso) && deletionMode) {
      isVisible.value = true;
    } else {
      isVisible.value = false;
    }
  },
  { immediate: true }
);

const handleDeleteClick = async () => {
  if (loading.value) return;
  showConfirmModal.value = true;
};

// El borrado lo lleva la vista (emit no espera al que escucha); el avance llega en `progreso`
const handleConfirmDelete = () => {
  showConfirmModal.value = false;
  emit('deleteSelected');
};

const handleCancelDelete = () => {
  showConfirmModal.value = false;
};
</script>

<template>
  <!-- Modal de confirmación -->
  <ModalConfirmacionEliminacion
    :isVisible="showConfirmModal"
    :selectedCount="selectedRoutes.length"
    :selectedRoutes="selectedRoutes"
    :nivel="nivelEliminacion"
    @confirm="handleConfirmDelete"
    @cancel="handleCancelDelete"
  />

  <Transition name="slide-down" appear mode="out-in">
    <div
      v-if="isVisible"
      class="deletion-button-panel fixed -top-3 transform h-[13.5vh] md:h-[12vh] w-[64vw] sm:w-[60vw] md:w-[40vw] lg:w-[30vw] xl:w-[30vw] 2xl:w-[20vw] bg-gradient-to-r from-red-500 via-rose-600 to-red-500 flex justify-center items-center rounded-xl shadow-xl z-10"
    >
      <button
        @click="handleDeleteClick"
        :disabled="loading"
        class="deletion-button-panel-btn relative px-6 py-3 bg-gradient-to-r from-white to-gray-100 font-semibold text-gray-700 rounded-full shadow-md hover:from-gray-200 hover:to-gray-300 hover:text-gray-900 transition duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed transform hover:scale-105 active:scale-95"
      >
        <span class="flex items-center space-x-2">
          <svg
            v-if="!loading"
            xmlns="http://www.w3.org/2000/svg"
            class="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
            />
          </svg>
          <svg v-else class="animate-spin h-5 w-5 text-red-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
          </svg>
          <span class="text-sm sm:text-base md:text-lg lg:text-lg tabular-nums">
            {{
              progreso
                ? `Eliminando ${progreso.hechos} de ${progreso.total}`
                : `Eliminar ${selectedRoutes.length} documento${selectedRoutes.length !== 1 ? 's' : ''}`
            }}
          </span>
        </span>
      </button>
      <div
        v-if="progreso"
        class="deletion-button-panel__avance"
        role="progressbar"
        :aria-valuenow="progreso.hechos"
        aria-valuemin="0"
        :aria-valuemax="progreso.total"
        aria-label="Avance de la eliminación"
      >
        <div class="deletion-button-panel__avance-barra" :style="{ width: `${porcentaje}%` }"></div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.deletion-button-panel__avance {
  position: absolute;
  left: 1.25rem;
  right: 1.25rem;
  bottom: 0.6rem;
  height: 4px;
  border-radius: 9999px;
  background-color: rgba(255, 255, 255, 0.3);
  overflow: hidden;
}
.deletion-button-panel__avance-barra {
  height: 100%;
  border-radius: inherit;
  background-color: #ffffff;
  transition: width 200ms ease-out;
}
@media (prefers-reduced-motion: reduce) {
  .deletion-button-panel__avance-barra {
    transition: none;
  }
}

.slide-down-enter-active {
  transition: all 0.5s cubic-bezier(0.23, 1, 0.32, 1);
}
.slide-down-enter-from {
  transform: translateY(-100px);
  opacity: 0;
}
.slide-down-enter-to {
  transform: translateY(0);
  opacity: 1;
}
.slide-down-leave-active {
  transition: all 0.3s cubic-bezier(0.23, 1, 0.32, 1);
}
.slide-down-leave-to {
  transform: translateY(-100px);
  opacity: 0;
}
</style> 

<style>
html.dark-mode .deletion-button-panel {
  background-image: linear-gradient(to right, #7f1d1d, #9f1239, #991b1b) !important;
  box-shadow: 0 16px 36px rgba(2, 6, 23, 0.65) !important;
}

html.dark-mode .deletion-button-panel-btn {
  background-image: linear-gradient(to right, #1e293b, #334155) !important;
  color: #fee2e2 !important;
}

html.dark-mode .deletion-button-panel-btn:hover {
  background-image: linear-gradient(to right, #334155, #475569) !important;
  color: #fff1f2 !important;
}

html.dark-mode .deletion-button-panel-btn:focus-visible {
  box-shadow: 0 0 0 2px #fb7185 !important;
}
</style>