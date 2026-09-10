<script setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { useFormDataStore } from '@/stores/formDataStore';
import { useTrabajadoresStore } from '@/stores/trabajadores';
import ModalConfirmarReemplazoRedaccionEsc from '@/components/ModalConfirmarReemplazoRedaccionEsc.vue';
import {
  MAX_RECOMENDACIONES_ILA,
  aplicarSugerenciasSiNoInicializadas,
  construirSugerenciasRecomendacionesIla,
  exposicionRuidoPuestoActualIla,
  listasRecomendacionesIlaEquivalentes,
} from '@/helpers/ilaRecomendaciones';

const store = useFormDataStore();
const { formDataInformeLongitudinalAudiometrico: fm } = storeToRefs(store);
const trabajadores = useTrabajadoresStore();

const recomendaciones = ref([]);
const mostrarModalRestablecer = ref(false);

function contextoSugerencias() {
  return {
    ruidoEnPuestoActual: exposicionRuidoPuestoActualIla({
      ruidoEnAgentesRiesgoActuales:
        fm.value.antecedenteExposicionRuido?.ruidoEnAgentesRiesgoActuales,
      agentesRiesgoActuales: trabajadores.currentTrabajador?.agentesRiesgoActuales,
    }),
    confirmacion: fm.value.decisionesConclusionIla?.confirmacion,
  };
}

function persistirEnStore() {
  fm.value.recomendacionesSeguimientoAudiometrico = recomendaciones.value;
  fm.value.recomendacionesIlaInicializadas = true;
}

function inicializar() {
  const sugeridas = construirSugerenciasRecomendacionesIla(contextoSugerencias());
  const resultado = aplicarSugerenciasSiNoInicializadas(
    fm.value.recomendacionesSeguimientoAudiometrico,
    fm.value.recomendacionesIlaInicializadas,
    sugeridas,
  );
  recomendaciones.value = resultado.items;
  persistirEnStore();
}

onMounted(() => {
  inicializar();
});

watch(recomendaciones, persistirEnStore, { deep: true });

const puedeAgregar = computed(() => recomendaciones.value.length < MAX_RECOMENDACIONES_ILA);

function addRecomendacion() {
  if (!puedeAgregar.value) return;
  recomendaciones.value.push('');
  nextTick(() => {
    const inputs = document.querySelectorAll('[data-ila-recomendacion]');
    const lastInput = inputs[inputs.length - 1];
    if (lastInput instanceof HTMLElement) lastInput.focus();
  });
}

function removeRecomendacion(index) {
  recomendaciones.value.splice(index, 1);
}

function limpiarRecomendaciones() {
  recomendaciones.value = [];
}

function sugeridasVigentes() {
  return construirSugerenciasRecomendacionesIla(contextoSugerencias());
}

function restablecerSugeridas() {
  const vigentes = sugeridasVigentes();
  if (!listasRecomendacionesIlaEquivalentes(recomendaciones.value, vigentes)) {
    mostrarModalRestablecer.value = true;
    return;
  }
  aplicarRestablecer();
}

function aplicarRestablecer() {
  recomendaciones.value = [...sugeridasVigentes()];
  mostrarModalRestablecer.value = false;
}
</script>

<template>
  <div>
    <h1 class="text-2xl font-bold mb-2 text-gray-900">Recomendaciones</h1>
    <p class="text-sm text-gray-600 mb-4">
      Confirmatoria, referencia, EPP o seguimiento, según el criterio del médico.
    </p>

    <h2 class="font-bold mb-4 text-gray-800 leading-5">Recomendaciones:</h2>
    <div class="space-y-2">
      <div
        v-for="(item, index) in recomendaciones"
        :key="index"
        class="flex gap-2 items-center"
      >
        <input
          class="w-full p-3 border border-gray-300 dark:border-slate-600 rounded-lg text-gray-700 dark:text-slate-100 bg-white dark:bg-slate-700 placeholder-gray-400 dark:placeholder-slate-300 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
          v-model="recomendaciones[index]"
          :placeholder="`Recomendación #${index + 1}`"
          data-ila-recomendacion
        />
        <button
          type="button"
          class="text-red-500 font-bold px-2"
          @click="removeRecomendacion(index)"
          title="Eliminar"
        >
          ✕
        </button>
      </div>
    </div>
    <div class="mt-3 flex gap-2 flex-wrap">
      <button
        type="button"
        class="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-base disabled:opacity-50 disabled:cursor-not-allowed"
        :disabled="!puedeAgregar"
        @click="addRecomendacion"
      >
        Agregar recomendación
      </button>
    </div>
    <div class="flex items-center gap-3 mt-4 w-full flex-wrap">
      <button
        type="button"
        class="text-xs text-gray-500 underline decoration-gray-300 hover:text-gray-700 hover:decoration-gray-500"
        @click="restablecerSugeridas"
      >
        Restablecer sugeridas
      </button>
      <button
        type="button"
        class="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-xs"
        @click="limpiarRecomendaciones"
      >
        Limpiar todas
      </button>
    </div>

    <ModalConfirmarReemplazoRedaccionEsc
      v-if="mostrarModalRestablecer"
      titulo="Restablecer sugeridas"
      etiqueta="Recomendaciones"
      mensaje="¿Deseas sustituir la lista actual de recomendaciones por las sugeridas según el contexto y las decisiones vigentes?"
      nota="Puedes seguir editando las recomendaciones después de restablecerlas."
      @close="mostrarModalRestablecer = false"
      @confirm="aplicarRestablecer"
    />
  </div>
</template>
