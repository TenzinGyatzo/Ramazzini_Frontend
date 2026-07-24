<script setup>
import { ref, computed } from 'vue';
import { format } from 'date-fns';
import AptitudSectionStep from './AptitudSectionStep.vue';
import Step2 from './Step2.vue';
import Step3 from './Step3.vue';
import Step4 from './Step4.vue';
import Step5 from './Step5.vue';
import Step6 from './Step6.vue';
import Step7 from './Step7.vue';
import { useFormDataStore } from '@/stores/formDataStore';

const { formDataAptitud } = useFormDataStore();
const today = format(new Date(), 'yyyy-MM-dd');

function evaluacionTieneDatos(n) {
  const fd = formDataAptitud;
  const nombre = (fd[`evaluacionAdicional${n}`] || '').trim();
  const resultados = (fd[`resultadosEvaluacionAdicional${n}`] || '').trim();
  // Solo nombre/resultados cuentan: una fecha sola no debe revelar el slot (evita basura).
  return Boolean(nombre || resultados);
}

function contarEvaluacionesIniciales() {
  for (let n = 6; n >= 1; n--) {
    if (evaluacionTieneDatos(n)) return n;
  }
  return 0;
}

const evaluacionesVisibles = ref(contarEvaluacionesIniciales());

const puedeAgregar = computed(() => evaluacionesVisibles.value < 6);
const puedeQuitar = computed(() => evaluacionesVisibles.value > 0);
const textoAgregar = computed(() =>
  evaluacionesVisibles.value === 0
    ? 'Registrar evaluación adicional'
    : 'Registrar otra evaluación adicional',
);

function limpiarSlot(n) {
  formDataAptitud[`evaluacionAdicional${n}`] = '';
  formDataAptitud[`fechaEvaluacionAdicional${n}`] = '';
  formDataAptitud[`resultadosEvaluacionAdicional${n}`] = '';
}

function agregarEvaluacion() {
  if (evaluacionesVisibles.value >= 6) return;
  const next = evaluacionesVisibles.value + 1;
  // Inicializar fecha solo al revelar el slot.
  if (!formDataAptitud[`fechaEvaluacionAdicional${next}`]) {
    formDataAptitud[`fechaEvaluacionAdicional${next}`] = today;
  }
  evaluacionesVisibles.value = next;
}

function quitarUltimaEvaluacion() {
  if (evaluacionesVisibles.value <= 0) return;
  const n = evaluacionesVisibles.value;
  limpiarSlot(n);
  evaluacionesVisibles.value -= 1;
}

const transitionAttrs = {
  enterActiveClass: 'transition-all duration-300 ease-out',
  enterFromClass: 'opacity-0 transform -translate-y-2',
  enterToClass: 'opacity-100 transform translate-y-0',
  leaveActiveClass: 'transition-all duration-200 ease-in',
  leaveFromClass: 'opacity-100 transform translate-y-0',
  leaveToClass: 'opacity-0 transform -translate-y-2',
};
</script>

<template>
  <AptitudSectionStep title="Evaluaciones adicionales">
    <div class="space-y-3">
      <p
        v-if="evaluacionesVisibles === 0"
        class="text-sm text-gray-600 px-0.5 py-1"
      >
        No hay evaluaciones adicionales registradas. Puede agregar hasta 6 o continuar al siguiente paso.
      </p>

      <Transition v-bind="transitionAttrs">
        <div v-if="evaluacionesVisibles >= 1" key="eval-1">
          <Step2 variant="compact" />
        </div>
      </Transition>
      <Transition v-bind="transitionAttrs">
        <div v-if="evaluacionesVisibles >= 2" key="eval-2" class="border-t border-gray-200/90 pt-3">
          <Step3 variant="compact" />
        </div>
      </Transition>
      <Transition v-bind="transitionAttrs">
        <div v-if="evaluacionesVisibles >= 3" key="eval-3" class="border-t border-gray-200/90 pt-3">
          <Step4 variant="compact" />
        </div>
      </Transition>
      <Transition v-bind="transitionAttrs">
        <div v-if="evaluacionesVisibles >= 4" key="eval-4" class="border-t border-gray-200/90 pt-3">
          <Step5 variant="compact" />
        </div>
      </Transition>
      <Transition v-bind="transitionAttrs">
        <div v-if="evaluacionesVisibles >= 5" key="eval-5" class="border-t border-gray-200/90 pt-3">
          <Step6 variant="compact" />
        </div>
      </Transition>
      <Transition v-bind="transitionAttrs">
        <div v-if="evaluacionesVisibles >= 6" key="eval-6" class="border-t border-gray-200/90 pt-3">
          <Step7 variant="compact" />
        </div>
      </Transition>

      <div class="flex flex-wrap gap-2 pt-1 pb-2">
        <button
          v-if="puedeAgregar"
          type="button"
          class="flex-1 min-w-[12rem] px-3 py-2 text-sm font-semibold rounded-md border border-emerald-600 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition-colors"
          @click="agregarEvaluacion"
        >
          {{ textoAgregar }}
        </button>
        <button
          v-if="puedeQuitar"
          type="button"
          class="px-3 py-2 text-sm font-medium rounded-md border border-gray-300 text-gray-600 bg-white hover:bg-gray-50 transition-colors"
          @click="quitarUltimaEvaluacion"
        >
          Quitar última
        </button>
      </div>
    </div>
  </AptitudSectionStep>
</template>
